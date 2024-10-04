/*! Copyright (c) 2022, XAPP AI */

import { QuestionAnsweringHandler } from "@xapp/question-answering-handler";

import { log } from "stentor-logger";
import type {
    Content,
    Context,
    CrmService,
    ErrorService,
    ExternalLead,
    IntentRequest,
    Message,
    Request,
    RequestSlotMap,
    Response,
    ResponseOutput,
    LeadFormField,
} from "stentor-models";
import { isChannelActionRequest, isIntentRequest, hasSessionId } from "stentor-guards";
import { compileResponse } from "stentor-response";
import {
    existsAndNotEmpty,
    splitTextIntoSentences,
    popLastQuestion,
    ssmlify,
    toResponseOutput,
    responseToMessage,
    keyFromRequest,
    requestSlotsToString,
    requestSlotValueToString,
} from "stentor-utils";

import * as Constants from "./constants";
import type { ContactDataType, ContactCaptureData, CaptureRuntimeData } from "./data";
import { generateAlternativeSlots, generatePseudoSlots, isSessionClosed, NOTE_COMPONENTS } from "./utils";
import { LeadError } from "./model";
import { ResponseStrategySelector } from "./strategies/ResponseStrategySelector";
import type { FormActionResponseData } from "./strategies/FormResponseStrategy";

interface ComponentRequest extends IntentRequest {
    dateTime: string;
    address: string;
    image: string;
}

/**
 * Handler for capturing contact information.
 *
 * It extends the Question Answering Handler to allow the user to ask questions
 */
export class ContactCaptureHandler extends QuestionAnsweringHandler<Content, ContactCaptureData> {

    public static readonly TYPE: string = Constants.CONTACT_CAPTURE_HANDLER_TYPE;

    /**
     * Send the lead to the CRM
     */
    public static async sendLead(
        slots: RequestSlotMap,
        extras: Record<string, unknown>,
        leadList: CaptureRuntimeData,
        leadTranscript: Message[],
        service: CrmService,
        request: Request,
        eventService: ErrorService,
        finalResponse?: Response
    ): Promise<{ success: boolean, id?: string }> {
        const fields: LeadFormField[] = [];

        for (const lead of leadList.data) {
            fields.push({
                name: lead.type as string,
                value: lead.collectedValue
            });
        }

        // Go through the slots and add the extra information if we have it
        // The user might have given us more information earlier in the conversation
        // and we want to make sure we pass it along
        const slotNames = Object.keys(slots);
        // We do not include these since they then are used to make other fields
        const DONT_INCLUDE = [
            ...NOTE_COMPONENTS,
            "title",
            "number",
            // don't need _number & _name because "street" includes both
            "street_number",
            "street_name"
        ];

        slotNames.forEach((name) => {
            // the names in fields are uppercase.
            const NAME = name.toUpperCase();

            const fieldAlreadyExists = fields.find((field) => {
                return field.name === NAME;
            });

            if (!DONT_INCLUDE.includes(name) && !fieldAlreadyExists && slots[name] && slots[name].value) {
                const value = requestSlotValueToString(slots[name].value);
                log().info(`Adding additional field ${NAME} with value: ${value}`);
                // Add it!
                fields.push({
                    name: NAME,
                    value
                });
            }
        });

        // Copy the transcript
        const transcript: Message[] = existsAndNotEmpty(leadTranscript) ? [...leadTranscript] : [];
        // Add the final response to the transcript if it exists
        if (finalResponse) {
            const responseOutput: Response<ResponseOutput> = {
                outputSpeech: toResponseOutput(finalResponse.outputSpeech)
            }
            const finalMessage = responseToMessage(responseOutput, request);

            transcript.push(finalMessage);
        }

        const externalLead: ExternalLead = {
            fields,
            transcript,
            refId: extras.existingRefId as string,
            jobTypeId: extras.jobTypeId as string,
            availabilityClassId: extras.avalabilityClassId as string
        };

        if (request) {
            if (request.userId) {
                externalLead.userId = request.userId;
            }

            if (hasSessionId(request)) {
                externalLead.sessionId = request.sessionId;
            }

            if (request.channel) {
                externalLead.source = request.channel
            }

            if (request.attributes && Object.keys(request.attributes).length > 0) {
                if (request.attributes.rwg_token) {
                    extras.rwg_token = request.attributes.rwg_token;
                }

                if (request.attributes.merchant_id) {
                    extras.merchant_id = request.attributes.merchant_id;
                }

                if (request.attributes.environment) {
                    extras.environment = request.attributes.environment;
                }
            }
        }

        log().debug(`Sending lead to FSM/CRM:`);
        log().debug(`===\n${JSON.stringify(externalLead, null, 2)}\n===`);

        try {
            const response = await service.send(externalLead, extras);
            if (response.status === "Success") {
                return { success: true, id: response.refId };
            } else {
                log().error(`Lead not sent!`);
                log().error(response.message);
                eventService.error(new LeadError(`Lead not sent:${response.message}`));
                return { success: false };
            }
        } catch (e) {
            log().error(`Lead not sent!`);
            log().error(e);
            eventService.error(e);
            return { success: false };
        }
    }

    public canHandleRequest(request: Request, context: Context): boolean {

        const key = keyFromRequest(request);

        // Blacklisted, never respond to these
        const NEVER_HANDLE: string[] = ["LaunchRequest", "CancelIntent", "StopIntent", "ByeIntent"];

        if (NEVER_HANDLE.includes(key)) {
            return false;
        }

        const ALWAYS_HANDLE: string[] = [
            "InputUnknown",
            "Name",
            "NameAnd",
            "NameOnly",
            "Address",
            "Email",
            "EmailOnly",
            "NumberOnly",
            "PhoneNumber",
            "PhoneNumberOnly",
            "AppointmentDate",
            "OptionSelect",
            "ContactMethod",
            "ContactMethodOnly"
        ];

        // ThatsAllIntent
        // OCNo
        // OCYes?

        // These a
        // StopIntent
        // CancelIntent

        if (this?.data?.captureLead) {
            // we add these if we are capturing the lead then we want to keep the
            // user in this flow while still answering their question
            ALWAYS_HANDLE.push(...["KnowledgeAnswer", "OCSearch"]);
        }

        if (ALWAYS_HANDLE.includes(key)) {
            return true;
        }

        if (isChannelActionRequest(request)) {
            return true;
        }

        return super.canHandleRequest(request, context);
    }

    public async handleRequest(request: Request, context: Context): Promise<void> {
        log().info(`Running in ContactCaptureHandler`);
        const key = keyFromRequest(request);

        if (isIntentRequest(request)) {
            log().info(`Request: ${key} Channel: ${request.channel} Query: "${request.rawQuery}"`);
            log().info(`Request Slots: ${requestSlotsToString(request.slots)}`);
        } else if (isChannelActionRequest(request)) {
            const data: FormActionResponseData = request.attributes?.data as FormActionResponseData;
            log().info(`Request: CHANNEL_ACTION_REQUEST Channel: ${request.channel} Action: "${request.action}" Step: "${data?.step}"`);
            log().info(`Attributes: ${JSON.stringify(data?.result || {})}`)
        }

        const leadSent = context.session.get(Constants.CONTACT_CAPTURE_SENT) as boolean;
        const previousType = context.session.get(Constants.CONTACT_CAPTURE_CURRENT_DATA) as ContactDataType;

        // If the lead was already sent, nothing to do
        // TODO: What to do in the form widget?
        if (leadSent) {
            log().info(`Lead already sent, calling super.handleRequest for content`);
            // what happens when we don't have lead sent content?
            // so
            // short circuit to the super
            return super.handleRequest(request, context);
        }

        // Component Input
        this.handleMultiModalInput(request as ComponentRequest);

        /**
         * Set the Slots (captured data so far) on the Session Storage
         */
        const requestSlots: RequestSlotMap = isIntentRequest(request) ? request.slots : {};

        // Convert the form fields to RequestSlotMap so we handle it the rest of the way through
        const formSlots: RequestSlotMap = {};

        if (isChannelActionRequest(request) && request.action === "FORM_SUBMIT") {
            const data: FormActionResponseData = request.attributes?.data as FormActionResponseData;
            for (const [name, value] of Object.entries(data.result)) {
                formSlots[name] = {
                    name,
                    value,
                };
            }
        }

        // We keep track of special contact capture slots instead of using the slots field
        // because we may modify them based on this specific use case
        const sessionSlots = context.session.get(Constants.CONTACT_CAPTURE_SLOTS) as RequestSlotMap;
        // Alternative slots is an opportunity for us to adjust the slots based on what LEX gave us
        const alternativeSlots = generateAlternativeSlots(sessionSlots, request, previousType);
        // Pseudo slots are not actual real slots but derivative of others
        const pseudoSlots = generatePseudoSlots({ ...requestSlots, ...sessionSlots, ...alternativeSlots }, request);
        // Now mix them all in priority order
        const slots: RequestSlotMap = { ...requestSlots, ...sessionSlots, ...pseudoSlots, ...alternativeSlots, ...formSlots };
        // Persist these new ones for reuse, we want to keep the modifications from the pseudo and alternative
        context.session.set(Constants.CONTACT_CAPTURE_SLOTS, slots);

        log().info(`Contact capture slots: ${requestSlotsToString(slots)}`);

        // An asideResponse is used to handle quick knowledge base questions
        // and still continue the lead capture
        let asideResponse: Response;

        switch (key) {
            case "CancelIntent":
            case "StopIntent":
            case "ByeIntent":
                super.handleRequest(request, context);
                break;
            case "OCSearch":
            case "KnowledgeAnswer":
                // Get content from the super for the knowledge answer
                // We just don't want to recreate the logic for
                // determining a KnowledgeAnswer content
                super.handleRequest(request, context);

                // If the request didn't generate an alternate set of slots
                // then we set it as the aside.  Since the KnowledgeAnswer is a
                // fallback, we can sometimes look at the query (like when asking for first or last names)
                // and just use the query directly.  This happens when we don't recognize a name.
                // In this case we don't set the asideResponse with the knowledge base response.
                if (
                    Object.keys(alternativeSlots).length === 0 &&
                    context.response.response &&
                    Object.keys(context.response.response).length > 0
                ) {

                    asideResponse = context.response.response;

                    const asideResponseOutput = toResponseOutput(asideResponse.outputSpeech);

                    const asideText = asideResponseOutput.displayText;
                    const asideSentences: string[] = splitTextIntoSentences(asideText);

                    if (asideSentences.length > 1) {
                        // Pop the last question off the end
                        const [newAsideText] = popLastQuestion(asideText);

                        asideResponseOutput.displayText = newAsideText;
                        asideResponseOutput.ssml = ssmlify(newAsideText);

                        asideResponse.outputSpeech = asideResponseOutput;
                    }

                    context.session.set(Constants.CONTACT_CAPTURE_ASIDE, asideResponse);

                }
            default:
            // default falls through below where we perform the lead capture
        }

        // Alert people the new setting
        if (typeof this.data.captureLead !== "boolean") {
            log().warn(`'captureLead' is not set on handler data, currently defaulting to false which means it will not capture lead data.type: ${typeof this.data.captureLead} value: ${this.data.captureLead}`);
            log().debug(this.data);
        }

        if (typeof this.data.enableFormScheduling !== "boolean") {
            log().warn(`'enableFormScheduling' is not set on handler data, currently defaulting to false which means it will not enable scheduling within the form. data.type: ${typeof this.data.enableFormScheduling} value: ${this.data.enableFormScheduling}`);
            log().debug(this.data);
        }

        // Optional alert for closed widgets

        // The action check is for backward compatibility - can be deleted later

        let closedEarly = false;
        if (isSessionClosed(request)) {
            // TODO: Make this prettier
            const slots: RequestSlotMap = context.session.get(Constants.CONTACT_CAPTURE_SLOTS);
            const savedLeadMessage = requestSlotsToString(slots);

            if (savedLeadMessage && savedLeadMessage.trim().length > 0) {
                const crmAlerter = (context.services.crmService as any).alerter;

                if (crmAlerter) {
                    crmAlerter(savedLeadMessage);
                }

                // if (process.env.INCOMPLETE_LEAD_NOTIFICATION_EMAIL) {
                //     sendEmail(process.env.INCOMPLETE_LEAD_NOTIFICATION_EMAIL, { lead: savedLeadMessage });
                // } else {
                //     log().info("Form closing was ignored (incomplete lead notification). No sender function.");
                // }
            } else {
                log().info("Form closing was ignored (incomplete lead notification). Too early.");
                closedEarly = true;
            }

            context.session.set(Constants.CONTACT_CAPTURE_ABANDONED, true);
        }
        // Determine our strategy, this is where the heavy lifting occurs
        const strategy = new ResponseStrategySelector().getStrategy(request, this.data);
        // Get the response. Finish, if it's an early close of the widget (no data)
        const response = closedEarly ? {} : await strategy.getResponse(this, request, context);
        // Compile and respond
        const compiled = compileResponse(response, request, context);
        // Change turnsToLive to 1
        if (existsAndNotEmpty(compiled?.context?.active)) {
            compiled.context.active.forEach((context) => {
                context.timeToLive.turnsToLive = 1;
                context.timeToLive.timeToLiveInSeconds = 2000;
            });
        }
        log().debug(`Response`);
        log().debug(compiled);
        context.response.respond(compiled);
    }

    private handleMultiModalInput(request: ComponentRequest): void {

        const request_type = "INTENT_REQUEST";
        request.slots = !request.slots ? {} : request.slots;

        // DateTime
        if (request.dateTime) {
            request.type = request_type;
            request.rawQuery = request.dateTime;
            request.slots.dateTime = {
                name: "DateTime",
                value: request.dateTime,
            };
        }

        // Location Form
        else if (request.address) {
            request.type = request_type;
            request.rawQuery = request.address;
            request.slots.address = {
                name: "Address",
                value: request.address,
            };
        }

        // Uploaded Image
        else if (request.image) {
            request.type = request_type;
            request.rawQuery = request.image;
            request.slots.image = {
                name: "Image",
                value: request.image,
            };

        }
    }
}
