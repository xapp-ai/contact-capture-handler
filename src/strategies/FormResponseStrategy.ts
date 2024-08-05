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
import { CrmServiceAvailability, SessionStore } from "stentor-models";

import * as Constants from "../constants";
import { CaptureRuntimeData } from "../data";
import { isSessionClosed, newLeadGenerationData } from "../utils";
import { ContactCaptureHandler } from "../handler";

import { ResponseStrategy } from "./ResponseStrategy";
import { getFormResponse, getStepFromData } from "./utils/forms";


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

        const slots: RequestSlotMap = context.session.get(Constants.CONTACT_CAPTURE_SLOTS);

        // Our response that we will end up returning
        let response: Response;

        let leadDataList: CaptureRuntimeData = context.session.get(Constants.CONTACT_CAPTURE_LIST);

        const origin = request.attributes?.origin || "unknown";
        // Always use enablePreferredTime from the request if it's there, otherwise use origin and if it is rwg
        const enablePreferredTime: boolean = typeof request?.attributes?.enablePreferredTime === "boolean" ? request.attributes.enablePreferredTime : origin === "rwg";
        const service: string | undefined = typeof request?.attributes?.service === "string" ? request.attributes.service : undefined;

        // Make sure we have one
        if (!leadDataList) {
            leadDataList = newLeadGenerationData(handler.data);

            // First call - send the main form
            response = getFormResponse(handler.data, { formName: handler.data.CAPTURE_MAIN_FORM, fallback: { enablePreferredTime, service } });

            // Update the list on session
            context.session.set(Constants.CONTACT_CAPTURE_LIST, leadDataList);

            // First availability
            await this.addAvailability(response, context.services.crmService, context.session);

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
                response = getFormResponse(handler.data, { formName: data.followupForm, fallback: { enablePreferredTime, service } });
                await this.addAvailability(response, context.services.crmService, context.session);
                return response;
            }

            // Don't submit until the form says so
            if (!stepFromData.crmSubmit) {
                response = {};
                await this.addAvailability(response, context.services.crmService, context.session);
                return response;
            }

            // Form widget has to say we are finished (unless session is closed)
            // if (!stepFromData.final) {
            //     return {};
            // }
        }

        const existingRefId = context.session.get(Constants.CONTACT_CAPTURE_EXISTING_REF_ID);
        const jobType = context.session.get(Constants.CONTACT_CAPTURE_JOB_TYPE);

        // if we created a CRM object and then closed, then we are done
        if (isAbandoned && existingRefId) {
            log().info(`Abandoned and has existingRefEd ${existingRefId}, returning`);
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
            jobTypeId: jobType?.id,
            avalabilityClassId: jobType?.class,
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
        await this.addAvailability(response, context.services.crmService, context.session);
        return response;
    }

    private async addAvailability(response: Response, crmService: CrmService, session: SessionStore): Promise<Response> {
        const leadDataList: CaptureRuntimeData = session.get(Constants.CONTACT_CAPTURE_LIST);

        let busyDays: CrmServiceAvailability = session.get(Constants.CONTACT_CAPTURE_BUSY_DAYS) as CrmServiceAvailability;

        // First time?
        if (!busyDays) {
            busyDays = await crmService.getAvailability({
                start: null,
                end: null,
            });

            session.set(Constants.CONTACT_CAPTURE_BUSY_DAYS, busyDays);
        } else {
            // Try to augment if we have a description
            const messageData = leadDataList.data.find((data) => {
                return data.slotName?.toLowerCase() === "message";
            });

            if (messageData?.collectedValue) {
                const description = messageData.collectedValue?.trim();
                const existingDescription = session.get(Constants.CONTACT_CAPTURE_DESCRIPTION);

                // Only call if description changed
                if (description !== existingDescription) {
                    session.set(Constants.CONTACT_CAPTURE_DESCRIPTION, description);

                    const jobType = await crmService.getJobType(description);
                    const existingJobType = session.get(Constants.CONTACT_CAPTURE_JOB_TYPE);

                    // Only call if the jobType changed (visitor changed the description)
                    if (jobType.id !== existingJobType?.id) {
                        session.set(Constants.CONTACT_CAPTURE_JOB_TYPE, jobType);

                        busyDays = await crmService.getAvailability(
                            {
                                start: null,
                                end: null,
                            },
                            {
                                jobType
                            }
                        );

                        session.set(Constants.CONTACT_CAPTURE_BUSY_DAYS, busyDays);
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


        return response;
    }
}

