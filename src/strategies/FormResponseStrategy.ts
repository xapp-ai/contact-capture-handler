/*! Copyright (c) 2023, XAPP AI */

import {
    compileResponse,
    Context,
    hasSessionId,
    log,
    Request,
    RequestSlotMap,
    requestSlotValueToString,
    Response,
} from "stentor";

import * as Constants from "../constants";
import { CaptureRuntimeData, ContactCaptureData } from "../data";
import { newLeadGenerationData } from "../utils";
import { ContactCaptureHandler } from "../handler";

import { ResponseStrategy } from "./ResponseStrategy";

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
        return (form.name = formName);
    });

    if (!formDeclaration) {
        throw new Error(`FormResponseStrategy: Unknown form: "${formName}"`);
    }

    const formStep = formDeclaration.steps.find((step: any) => {
        return (step.name = stepName);
    });

    if (!formStep) {
        throw new Error(`FormResponseStrategy: Unknown step: "${stepName}". Form: "${formName}"`);
    }

    return formStep;
}

export class FormResponseStrategy implements ResponseStrategy {
    public async getResponse(handler: ContactCaptureHandler, request: Request, context: Context): Promise<Response> {
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

        // If this isn't the first request and we still have missing data,
        // that's a problem, unless it's mid-form submit or a followup form is requested

        if (nextRequiredData) {
            // Update the list on session
            context.session.set(Constants.CONTACT_CAPTURE_LIST, leadDataList);

            const data: FormActionResponseData = request.attributes?.data as FormActionResponseData;

            // Send the requested form
            if (data.followupForm) {
                return getFormResponse(handler.data, data.followupForm);
            }

            const stepFromData = getStepFromData(handler.data, data.form, data.step);

            // Mid-form submit (not final)
            if (!stepFromData.final) {
                return {}; // form widget - no response (carry on)
            }

            // This means the form finished but we still are missing data. Check the blueprint.
            log().error(`Form widget didn't collect this attribute: "${nextRequiredData.slotName}"`);
        }

        // Send the lead if we got here

        // TODO: Code repetition. Share this with ProgrammaticResponseStrategy)

        const url: string = request.attributes?.currentUrl as string;
        const extras = {
            source: url || "unknown",
            completed: true,
            externalId: hasSessionId(request) ? request.sessionId : "unknown",
        };

        const leadTranscript = context.session.transcript();

        // Send the lead time!
        const leadSent = await ContactCaptureHandler.sendLead(
            slots,
            extras,
            leadDataList,
            leadTranscript,
            context.services.crmService,
            request,
            context.services.eventService,
            compileResponse(response, request, context),
        );

        log().info(`Lead Sent ? ${leadSent} `);

        // Clean lead gathering list. This will restart the interview
        context.session.set(Constants.CONTACT_CAPTURE_LIST, undefined);
        context.session.set(Constants.CONTACT_CAPTURE_SENT, false);

        return {}; // form widget - no response
    }
}
