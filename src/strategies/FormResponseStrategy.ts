/*! Copyright (c) 2023, XAPP AI */

import {
    compileResponse,
    Context,
    CrmService,
    hasSessionId,
    log,
    Request,
    RequestSlotMap,
    requestSlotValueToString,
    Response,
} from "stentor";

import * as Constants from "../constants";
import { CaptureRuntimeData, ContactCaptureData } from "../data";
import { isSessionClosed, newLeadGenerationData } from "../utils";
import { ContactCaptureHandler } from "../handler";

import { ResponseStrategy } from "./ResponseStrategy";
import { CrmServiceAvailability, SessionStore } from "stentor-models";
import { MultistepForm } from "../form";

/**
 * Action response data object
 */
export interface FormActionResponseData {
    // The form attributes (name/value pairs)
    result: object;

    // The form name and the form stage (step) where the data was submitted from
    form: string;
    step: string;

    // Was this the last step?
    last: boolean;

    // When we need to respond with another (usually dynamic) form to continue
    followupForm?: string;
}

/**
 * Get a simple contact us form.
 * 
 * @returns 
 */
function getContactFormFallback(): Response {

    const contactUsForm: MultistepForm = {
        "name": "contact_us_only",
        type: "FORM",
        "header": [
            {
                "step": "contact_info",
                "label": "Contact"
            }
        ],
        "labelHeader": true,
        "steps": [
            {
                "crmSubmit": true,
                "final": true,
                "name": "contact_info",
                "nextLabel": "Submit",
                "nextAction": "submit",
                "fields": [
                    {
                        "name": "full_name",
                        "label": "Name",
                        "type": "TEXT",
                        "mandatory": true
                    },
                    {
                        "format": "PHONE",
                        "name": "phone",
                        "label": "Phone",
                        "placeholder": "Your 10 digit phone number",
                        "type": "TEXT",
                        "mandatory": true
                    },
                    {
                        "name": "message",
                        "label": "Tell us what you need help with",
                        "rows": 6,
                        "type": "TEXT",
                        "multiline": true
                    }
                ],
                "title": "Contact Information"
            },
            {
                "fields": [
                    {
                        "name": "thank_you_text",
                        "header": {
                            "title": "Thank You"
                        },
                        "text": "Somebody will call you as soon as possible.",
                        "type": "CARD"
                    }
                ],
                "previousAction": "omit",
                "nextAction": "omit",
                "name": "Thanks"
            }
        ]
    };

    const response: Response = {
        tag: "FORM",
        displays: [{ ...contactUsForm }],
    };

    return response;
}

function getFormResponse(data: ContactCaptureData, formName: string): Response {
    const formDeclaration = data.forms.find((form) => {
        return (form.name = formName);
    });

    // The form is a DISPLAY of type "FORM"
    const response: Response = {
        tag: "FORM",
        displays: [{ type: "FORM", ...formDeclaration }],
    };

    return response;
}

function getStepFromData(data: ContactCaptureData, formName: string, stepName: string): any {
    const formDeclaration = data.forms.find((form) => {
        return (form.name == formName);
    });

    if (!formDeclaration) {
        throw new Error(`FormResponseStrategy: Unknown form: "${formName}"`);
    }

    const formStep = formDeclaration.steps.find((step: any) => {
        return (step.name == stepName);
    });

    if (!formStep) {
        throw new Error(`FormResponseStrategy: Unknown step: "${stepName}". Form: "${formName}"`);
    }

    return formStep;
}

function leadSummary(slots: RequestSlotMap, leadDataList: CaptureRuntimeData): string {
    if (!leadDataList?.data) {
        return "";
    }

    let summary = "=== Collected Attributes ===";

    for (const name in slots) {
        if (slots.hasOwnProperty(name)) {
            const slot = slots[name];
            const value = JSON.stringify(slot.value || slot.rawValue);
            summary += `\n    ● ${name}: ${value}`;
        }
    }

    // for (const d of leadDataList.data) {
    //     const name = d.slotName || d.type;
    //     const value = JSON.stringify(d.collectedValue || "");
    //     summary += `\n\t${name}: ${value}`;
    // }

    return summary;
}

/**
 * 
 * @param busyDays Format this for the widget for "easier" consumption
 * @returns 
 */
function formatBusyDays(busyDays: CrmServiceAvailability): string {
    const busyDates: string[] = [];
    
    busyDays.unavailabilities.forEach(value => {
        if (!value.available) {
            busyDates.push(value.date.date);
        }
    });

    return busyDates.join(",");
}

export class FormResponseStrategy implements ResponseStrategy {
    public async getResponse(handler: ContactCaptureHandler, request: Request, context: Context): Promise<Response> {

        if (!handler?.data?.enableFormScheduling) {
            // remove this after a couple of releases
            log().warn(`NEW FEATURE! You must enable scheduling if you are running this standalone.  Set enableFormScheduling to true in handler data.!`);
            return getContactFormFallback()
        }

        const slots: RequestSlotMap = context.session.get(Constants.CONTACT_CAPTURE_SLOTS);

        // Our response that we will end up returning
        let response: Response;

        let leadDataList: CaptureRuntimeData = context.session.get(Constants.CONTACT_CAPTURE_LIST);

        // Make sure we have one
        if (!leadDataList) {
            leadDataList = newLeadGenerationData(handler.data);

            // First call - send the main form
            response = getFormResponse(handler.data, handler.data.CAPTURE_MAIN_FORM);

            // Update the list on session
            context.session.set(Constants.CONTACT_CAPTURE_LIST, leadDataList);

            // First availabilty
            await this.addAvalabilty(response, context.services.crmService, context.session);

            return response;
        }

        // Based on slots figure out if anything is missing
        leadDataList.data.forEach((data) => {
            const slot = slots[data.slotName];
            if (slot && slot.value) {
                data.collectedValue = requestSlotValueToString(slot.value);
            } else if (data.acceptAnyInput) {
                data.collectedValue = request.rawQuery;
            }
        });

        // Find the next piece of data that is is missing
        const nextRequiredData = leadDataList.data.find((data) => {
            return !data.collectedValue;
        });


        if (nextRequiredData) {
            // Update the list on session
            context.session.set(Constants.CONTACT_CAPTURE_LIST, leadDataList);

            // This means the form finished but we still are missing data. Check the blueprint.
            // log().warn(`Form widget didn't collect this attribute: "${nextRequiredData.slotName}"`);
        }

        const isAbandoned = isSessionClosed(request);

        if (!isAbandoned) {
            const data: FormActionResponseData = request.attributes?.data as FormActionResponseData;
            const stepFromData = getStepFromData(handler.data, data.form, data.step);

            // Send the requested form
            if (data.followupForm) {
                response = getFormResponse(handler.data, data.followupForm);
                await this.addAvalabilty(response, context.services.crmService, context.session);
                return response;
            }

            // Don't submit until the form says so
            if (!stepFromData.crmSubmit) {
                response = {};
                await this.addAvalabilty(response, context.services.crmService, context.session);
                return response;
            }

            // Form widget has to say we are fininshed (unless session is closed)
            // if (!stepFromData.final) {
            //     return {};
            // }
        }

        const existingRefId = context.session.get(Constants.CONTACT_CAPTURE_EXISTING_REF_ID);

        // if we created a CRM object and then closed, then we are done
        if (isAbandoned && existingRefId) {
            return {};
        }

        // Send the lead if we got here

        const url: string = request.attributes?.currentUrl as string;
        const extras = {
            // this is a duplicate of source on ExternalLead
            // leaving as is for now
            source: url || "unknown",
            // adding this to be more descriptive
            currentUrl: url,
            externalId: hasSessionId(request) ? request.sessionId : "unknown",
            existingRefId,
            crmFlags: handler.data?.crmFlags,
            isAbandoned,
        };

        // In case of a form, there is no transcript. The data is the "transcript".
        const leadTranscript = context.session.transcript();
        if (leadTranscript && leadTranscript.length > 0) {
            leadTranscript[0].message = `\n${leadSummary(slots, leadDataList)}`;
        }

        // Send the lead time!
        const leadSendResult = await ContactCaptureHandler.sendLead(
            slots,
            extras,
            leadDataList,
            leadTranscript,
            context.services.crmService,
            request,
            context.services.eventService,
            compileResponse(response, request, context),
        );

        log().info(`Lead Sent ? ${leadSendResult.success} (id=${leadSendResult.id})`);

        // Clean lead gathering list. This will restart the interview.
        // Correction. Widget will reset the session. Keep it.
        // context.session.set(Constants.CONTACT_CAPTURE_LIST, undefined);

        // Never ends. We send partials
        // context.session.set(Constants.CONTACT_CAPTURE_SENT, leadSendResult.success);

        context.session.set(Constants.CONTACT_CAPTURE_EXISTING_REF_ID, leadSendResult.id);

        // form widget - no response
        response = {};
        await this.addAvalabilty(response, context.services.crmService, context.session);
        return response;
    }

    private async addAvalabilty(response: Response, crmService: CrmService, session: SessionStore): Promise<Response> {
        const leadDataList: CaptureRuntimeData = session.get(Constants.CONTACT_CAPTURE_LIST);

        let busyDays: CrmServiceAvailability = session.get(Constants.CONTACT_CAPTURE_BUSY_DAYS) as CrmServiceAvailability;

        // First time?
        if (!busyDays) {
            busyDays = await crmService.getAvailability({
                start: null,
                end: null,
            });
        } else {
            // Try to augment if we have a description
            const messageData = leadDataList.data.find((data) => {
                return data.slotName?.toLowerCase() === "message";
            });

            if (messageData?.collectedValue) {
                const description = messageData.collectedValue?.trim();

                if (description) {
                    const jobType = await crmService.getJobType(description);
                    const existingJobType = session.get(Constants.CONTACT_CAPTURE_JOB_TYPE);

                    // Only call if the jobType changed (visitor changed the description)
                    if (jobType !== existingJobType) {
                        session.set(Constants.CONTACT_CAPTURE_JOB_TYPE, jobType);

                        busyDays = await crmService.getAvailability(
                            {
                                start: null,
                                end: null,
                            },
                            {
                                jobType,
                            },
                        );
                    }
                }
            }
        }

        response.context = {
            active: [
                {
                    name: "BusyDays",
                    timeToLive: {},
                    parameters: {
                        busyDays: formatBusyDays(busyDays),
                    }
                },
            ],
        };

        session.set(Constants.CONTACT_CAPTURE_BUSY_DAYS, busyDays);

        return response;
    }
}

