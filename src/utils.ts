/*! Copyright (c) 2022, XAPP AI */
import { Request, RequestSlotMap } from "stentor-models";
import { capitalize, getSlotValue, requestSlotValueToString, slotExists } from "stentor-utils";
import { isIntentRequest, keyFromRequest } from "stentor";

import { LeadGenerationRuntimeData, ContactCaptureData, ContactDataType } from "./data";
import { PseudoSlots } from "./model";

/**
 * Returns a fresh data fields  to capture
 * @param data 
 */
export function newLeadGenerationData(data: ContactCaptureData): LeadGenerationRuntimeData {
    const runtimeData: LeadGenerationRuntimeData = {
        data: ((data as ContactCaptureData).leadGenerationBlueprint.leads
            .filter(value => {
                return value.active;
            })
            .map(value => {
                if (value.active) {
                    return {
                        type: value.type,
                        enums: value.enums,
                        questionContentKey: value.questionContentKey,
                        slotName: value.slotName
                    };
                }
            }))
    };

    runtimeData.lastModifiedMs = new Date().getTime();

    return runtimeData;
}

/**
 * Combines the slot values into one string with one space in between and trimmed.
 * 
 * The order of slotNames matters when it assembles the new slot value.
 * 
 * @param slots 
 * @param slotNames 
 * @returns 
 */
export function combineSlotValues(slots: RequestSlotMap, slotNames: (number | string)[]): string {
    let value = '';

    slotNames.forEach((name) => {
        if (slots[name] && slots[name].value) {
            value += `${requestSlotValueToString(slots[name].value)} `
        }
    });

    return value.replace(/\s+/g, ' ').trim();
}

// We combine a bunch of slots and put them in the notes section!
export const NOTE_COMPONENTS: string[] = [
    "building_type", // commercial or residential
    "hvac_brand", // brands of HVAC
    "hvac_component", // furnace, thermostat, air handler, etc.
    "hvac_issue", // leaking, broken, frozen
    "exterior_product", // roof, soffit, siding, etc
    "exterior_component", // dupe of exterior_product
    "interior_room", // bathroom, kitchen, etc
    "interior_component", // appliances, etc
    "work_product", // repair,  installation, tune up, etc.
    "consultation",  // quote, consultation, estimate, etc.
    "practice_area", // for legal template
];

/**
 * Generates pseudo slots, which are derived from others.
 * 
 * Derived slots:
 *   * full_name: Derived from first_name & last_name
 *   * address: Derived from number, street, city, state, zip
 *   * note: Derived from building_type, exterior_product, work_product
 * 
 * @param slots 
 * @returns 
 */
export function generatePseudoSlots(slots: RequestSlotMap, request: Request): PseudoSlots {

    const pseudoSlots: RequestSlotMap = {};

    const nameComponents = ["title", "first_initial", "first_name", "middle_initial", "last_initial", "last_name"];

    if (slots['first_name'] || slots['last_name']) {
        // Another option here is just check to see if it is NameOnly intent
        // and use the raw query
        const value = combineSlotValues(slots, nameComponents);
        pseudoSlots['full_name'] = {
            name: "full_name",
            value
        }
    }

    const addressComponents = ["street_number", "street_name"];

    // Make sure the number isn't already in there
    if (slots['street_name']) {
        // Get their values and combine them into one address
        const value = combineSlotValues(slots, addressComponents);
        pseudoSlots['address'] = {
            name: 'address',
            value
        };
    }

    // Ok.  if we still don't have an address, use the request raw query if it is for an address intent
    if (!pseudoSlots['address'] && isIntentRequest(request) && request.intentId === "Address") {
        pseudoSlots['address'] = {
            name: 'address',
            value: request.rawQuery
        }
    }

    if (slotExists(slots, NOTE_COMPONENTS)) {
        // Get their values and combine them into one address
        const value = combineSlotValues(slots, NOTE_COMPONENTS);
        pseudoSlots['note'] = {
            name: 'note',
            value
        };
    }

    return pseudoSlots;
}

/**
 * Opportunity for us to modify the slots based on the incoming requests
 * 
 * @param slots - The slots coming in
 * @param request - The full request
 * @param dataType - The data type that was asked for
 * @returns 
 */
export function generateAlternativeSlots(slots: RequestSlotMap, request: Request, dataType: ContactDataType): RequestSlotMap {

    const alternativeSlots: RequestSlotMap = {};


    const requestSlots = isIntentRequest(request) ? request.slots : undefined;

    const number = getSlotValue(requestSlots, 'number');

    const existingFirstName: string = getSlotValue(slots, 'first_name') as string;
    const existingLastName: string = getSlotValue(slots, 'last_name') as string;

    //const request_title: string = getSlotValue(requestSlots, "title") as string;
    const requestFirstName: string = getSlotValue(requestSlots, "first_name") as string;
    const requestLastName: string = getSlotValue(requestSlots, "last_name") as string;

    const key = keyFromRequest(request);

    switch (dataType) {
        case "PHONE":
            if (!getSlotValue(slots, 'phone') && !!number) {
                alternativeSlots.phone = {
                    name: 'phone',
                    value: number
                }
            }
            break;
        case "ADDRESS":
        case "ZIP":
            if (!getSlotValue(slots, 'zip') && !!number) {
                alternativeSlots.zip = {
                    name: 'zip',
                    value: number
                }
            }
            break;
        case "LAST_NAME":
            // Case 1: Last name is coming in on the first name slot
            if (!requestLastName && requestFirstName && !existingLastName) {
                // clear out last
                alternativeSlots.last_name = {
                    name: 'last_name',
                    value: capitalize(requestFirstName)
                };

                alternativeSlots.first_name = {
                    name: 'first_name',
                    value: capitalize(existingFirstName)
                };
            }
            // Case 2: No last name slot or first name slot but we got the fallback
            //         We check the type of intent 
            if (!existingLastName && !requestLastName && !requestFirstName) {
                if (isIntentRequest(request) && key === "KnowledgeAnswer") {
                    // Split the query up
                    const query = request.rawQuery;
                    const splitQuery = query.split(" ");
                    if (splitQuery.length === 1) {
                        alternativeSlots.last_name = {
                            name: 'last_name',
                            value: capitalize(query)
                        }
                    }
                }
            }
            break;
        case "FIRST_NAME":
        case "FULL_NAME":
            const title: string = getSlotValue(slots, "title") as string;
            const last_initial: string = getSlotValue(slots, 'last_initial') as string;

            // Case 1: Sometimes the first name comes in as the last
            if (!title && !existingFirstName && existingLastName) {
                // clear out last
                alternativeSlots.last_name = {
                    name: 'last_name',
                    value: ""
                };
                alternativeSlots.first_name = {
                    name: 'first_name',
                    value: capitalize(existingLastName)
                };
            }

            // Case 2: Just last initial and no existing last
            if (!existingLastName && last_initial) {
                alternativeSlots.last_name = {
                    name: 'last_name',
                    value: capitalize(last_initial)
                };
            }

            // Case 3: 
            if (!existingFirstName && !requestFirstName && !requestLastName) {
                if (isIntentRequest(request) && key === "KnowledgeAnswer") {
                    // Split the query up
                    const query = request.rawQuery;
                    const splitQuery = query.split(" ");
                    if (splitQuery.length === 1) {
                        alternativeSlots.first_name = {
                            name: 'first_name',
                            value: capitalize(query)
                        }
                    }
                }
            }

            break;
        default:
    }

    return alternativeSlots;
}

/**
 * Determine if the use is just looking for help versus actually requesting
 * a free quote.
 * 
 * If the user is redirected from another intent like "i need help with my roof"
 * then 
 * 
 * @param overrideKey - The override key from the request
 * @returns 
 */
export function lookingForHelp(intentId?: string): boolean {
    const possibleIntents: string[] = ["OCAgent", "HelpIntent", "HelpWith"];
    return possibleIntents.includes(intentId);
}

/**
 * The API code can be imperfect, can incorrectly contain spaces and quotes.
 * 
 * @param code 
 * @returns 
 */
export function cleanCode(code: string): string {
    if (!code) {
        return code;
    }

    return code.replace(/[ "'`]/g, "");
}