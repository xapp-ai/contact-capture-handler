/*! Copyright (c) 2022, XAPP AI */

import { QuestionAnsweringHandler } from "@xapp/question-answering-handler";

import {
    compileResponse,
    concatResponseOutput,
    Content,
    Context,
    CrmService,
    ErrorService,
    existsAndNotEmpty,
    findValueForKey,
    getResponseByTag,
    hasSessionId,
    isIntentRequest,
    keyFromRequest,
    LeadFormField,
    log,
    Message,
    Request,
    RequestSlotMap,
    requestSlotsToString,
    requestSlotValueToString,
    Response,
    ResponseOutput,
    responseToMessage,
    toResponseOutput,
} from "stentor";

import * as Constants from "./constants";
import { ContactDataType, ContactCaptureData, CaptureRuntimeData } from "./data";
import { generateAlternativeSlots, generatePseudoSlots, lookingForHelp, newLeadGenerationData, NOTE_COMPONENTS } from "./utils";
import { LeadError } from "./model";

/**
 * Handler for capturing contact information.
 * 
 * It extends the Question Answering Handler to allow the user to ask questions
 */
export class ContactCaptureHandler extends QuestionAnsweringHandler<Content, ContactCaptureData> {

    public static readonly TYPE: string = Constants.CONTACT_CAPTURE_HANDLER_TYPE;

    /**
     * Send the lead to the CRM
     * 
     * @param slots 
     * @param extras 
     * @param leadList 
     * @param leadTranscript 
     * @param service 
     * @param request 
     * @param eventService 
     * @param finalResponse 
     * @returns 
     */
    private static async sendLead(
        slots: RequestSlotMap,
        extras: Record<string, unknown>,
        leadList: CaptureRuntimeData,
        leadTranscript: Message[],
        service: CrmService,
        request: Request,
        eventService: ErrorService,
        finalResponse?: Response
    ): Promise<boolean> {
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

        const externalLead = { fields, transcript };
        log().debug(`===\n${JSON.stringify(externalLead, null, 2)}\n===`);

        let sendLead = true;

        const envSendLead = process.env.SEND_LEAD;
        if (envSendLead && typeof envSendLead === "string") {
            // if we have it, use it
            if (envSendLead.toLowerCase() === "true") {
                sendLead = true;
            } else if (envSendLead.toLowerCase() === "false") {
                sendLead = false;
            }
        }
        if (sendLead) {
            try {
                const response = await service.send(externalLead, extras);
                if (response.status === "Success") {
                    return true;
                } else {
                    log().error(`Lead not sent!`);
                    log().error(response.message);
                    eventService.error(new LeadError(`Lead not sent:${response.message}`));
                    return false;
                }
            } catch (e) {
                log().error(`Lead not sent!`);
                log().error(e);
                eventService.error(e);
                return false;
            }
        } else {
            log().warn(`NOT SENDING LEADS.  Set environment variable SEND_LEAD=true to send.`);
            log().info(`===\n${JSON.stringify(externalLead, null, 2)}\n===`);
            // Do we fake it here?
            return false;
        }
    }

    public canHandleRequest(request: Request, context: Context): boolean {

        const key = keyFromRequest(request);

        // Blacklisted, never respond to these
        const NEVER_HANDLE: string[] = ["LaunchRequest", "CancelIntent", "StopIntent"];

        if (NEVER_HANDLE.includes(key)) {
            return false;
        }

        const ALWAYS_HANDLE: string[] = [
            "KnowledgeAnswer",
            "OCSearch",
            "InputUnknown",
            "Name",
            "NameOnly",
            "Address",
            "Email",
            "EmailOnly",
            "NumberOnly",
            "PhoneNumber",
            "PhoneNumberOnly",
            "AppointmentDate"
        ];

        if (ALWAYS_HANDLE.includes(key)) {
            return true;
        }

        return super.canHandleRequest(request, context);
    }

    public async handleRequest(request: Request, context: Context): Promise<void> {

        log().info(`Running in ContactCaptureHandler`);
        const key = keyFromRequest(request);

        log().info(`Request: ${key} Query: "${request.rawQuery}"`);
        if (isIntentRequest(request)) {
            log().info(`Slots: ${requestSlotsToString(request.slots)}`);
        }
        const leadSent = context.session.get(Constants.CONTACT_CAPTURE_SENT) as boolean;
        const previousType = context.session.get(Constants.CONTACT_CAPTURE_CURRENT_DATA) as ContactDataType;

        // If the lead was already sent, give it to the super
        if (leadSent) {
            log().info(`Lead already sent, calling super.handleRequest for content`);
            // short circuit to the super
            return super.handleRequest(request, context);
        }

        const requestSlots: RequestSlotMap = isIntentRequest(request) ? request.slots : {};
        // We keep track of special contact capture slots instead of using the slots field
        // because we may modify them based on this specific use case
        const sessionSlots = context.session.get(Constants.CONTACT_CAPTURE_SLOTS) as RequestSlotMap;
        // Alternative slots is an opportunity for us to adjust the slots based on what LEX gave us
        const alternativeSlots = generateAlternativeSlots(sessionSlots, request, previousType);
        // Pseudo slots are not actual real slots but derivative of others
        const pseudoSlots = generatePseudoSlots({ ...requestSlots, ...sessionSlots, ...alternativeSlots }, request);
        // Now mix them all in priority order
        const slots: RequestSlotMap = { ...requestSlots, ...sessionSlots, ...pseudoSlots, ...alternativeSlots };
        // Persist these new ones for reuse, we want to keep the modifications from the pseudo and alternative
        context.session.set(Constants.CONTACT_CAPTURE_SLOTS, slots);
        log().info('Slots');
        log().info(slots);

        // An asideResponse is used to handle quick knowledge base questions
        // and still continue the lead capture
        let asideResponse: Response;

        switch (key) {
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
                }
            default:
        }

        // If they were redirected from 
        const isLookingForHelp = isIntentRequest(request) ? lookingForHelp(request.intentId) : false;
        // We will use this later to concatenate the 'start' content.
        let isFirstQuestion = false;

        let leadDataList: CaptureRuntimeData = context.session.get(Constants.CONTACT_CAPTURE_LIST);
        // Make sure we have one
        if (!leadDataList) {
            // New potential lead!
            // Make an entry for the "lead sweeper"
            // TODO: Add this functionality back, it goes through and cleans up partial leads
            // and sends them on anyway.
            //
            //  const ageService: AgeService<UserCaptureData> = new DynamoAgeService<UserCaptureData>(
            //      { tableName: process.env.STENTOR_AGE_TABLE_NAME }
            //  );
            //  const crmService = context.services.crmService;
            //  await ageService.set(request.userId, { appId: crmService.appId });

            leadDataList = newLeadGenerationData(this.data);

            isFirstQuestion = true;
        } else {
            // See if the lead data is stale
            const now = new Date().getTime();
            if (now - leadDataList.lastModifiedMs > Constants.LEAD_LIST_TTL_MS) {
                // and send it off
                const url: string = request.attributes?.currentUrl as string;
                const extras: Record<string, unknown> = {
                    source: url || "unknown",
                    completed: true,
                    externalId: hasSessionId(request) ? request.sessionId : "unknown"
                }

                const leadTranscript = context.session.transcript();
                // Save the old leads before re-starting
                await ContactCaptureHandler.sendLead(slots, extras, leadDataList, leadTranscript, context.services.crmService, request, context.services.eventService);
                // Refresh the list
                leadDataList = newLeadGenerationData(this.data);
            }
        }

        // Based on slots figure out what information is missing
        // go through each and check on the slot
        leadDataList.data.forEach((data) => {
            // see if slot exists
            const slot = slots[data.slotName];
            if (slot && slot.value) {
                // Ok, we have it!
                data.collectedValue = requestSlotValueToString(slot.value);
            } else if (data.acceptAnyInput && data.type === previousType) {
                // only set collected value to rawQuery if they accept it and we are on same type
                data.collectedValue = request.rawQuery;
            }
        });
        // Find the next piece of data
        const nextRequiredData = leadDataList.data.find((data) => {
            // the next one is the one we don't have a value for.
            return !data.collectedValue
        });

        const nextType = nextRequiredData ? nextRequiredData.type : undefined;
        // Keep track of if we are repeating ourselves
        // TODO: What do we do when we are stuck on the same data request
        const repeat = nextType === previousType;

        log().info(`Asking for ${nextType}, previous was ${previousType}.`);
        log().info(`${isFirstQuestion ? 'Their first question' : 'Not their first question'} and they ${isLookingForHelp ? 'are looking for help' : 'are not looking for help'} `)
        log().info(`isFirstQuestion: ${isFirstQuestion}  lookingForHelp: ${isLookingForHelp}`)

        context.session.set(Constants.CONTACT_CAPTURE_CURRENT_DATA, nextType);

        const responses = findValueForKey(this.intentId, this.content);

        let response: Response;
        // Two paths here to get the response depending on if we have a next step or not
        // 1. We have a step, we find the content and ask the question
        // 2. We don't have any more information to ask so we close out the lead capture.
        if (nextRequiredData) {
            // Ask the questions
            const contentId = nextRequiredData.questionContentKey;
            const originalResponse = getResponseByTag(responses, contentId);
            // Make a copy because when we are running tests we get pass by reference errors impacting other tests
            response = originalResponse ? { ...originalResponse } : undefined;
            log().debug(`Response for tag ${contentId}`);
            log().debug(response);
            if (!response) {
                const errorMessage = `Missing content for tag ${contentId}`;
                log().error(errorMessage);
                response = {
                    outputSpeech: {
                        displayText: `ERROR: I am not configured correctly. ${errorMessage}`,
                        ssml: `ERROR: I am not configured correctly. ${errorMessage}`,
                    },
                    tag: "ERROR"
                }
            }

            // If we have an aside response, concat them.
            if (asideResponse) {
                log().debug(`We have an aside response, concatenating with found response.`);
                log().debug(asideResponse);
                // I think we want to use the reprompt here.
                const reprompt = concatResponseOutput({ displayText: "\n \n \n", ssml: "" }, toResponseOutput(response.reprompt));
                response.outputSpeech = concatResponseOutput(toResponseOutput(asideResponse.outputSpeech), toResponseOutput(reprompt), { delimiter: "\n\n" });
                response.reprompt = response.reprompt;
                response.displays = asideResponse.displays;
            } else if (repeat) {
                // Give them the reprompt on a repeat
                response.outputSpeech = response.reprompt;
            }

            // if it is the first question, we need to concatentate the lead gen start content at the front
            if (isFirstQuestion) {
                let leadStartResponse: Response;
                if (isLookingForHelp) {
                    leadStartResponse = getResponseByTag(responses, Constants.CONTACT_CAPTURE_HELP_START_CONTENT);
                } else {
                    leadStartResponse = getResponseByTag(responses, Constants.CONTACT_CAPTURE_START_CONTENT);
                }
                response.outputSpeech = concatResponseOutput(toResponseOutput(leadStartResponse.outputSpeech), toResponseOutput(response.outputSpeech));
                // since this is a start, we lose a little bit of fidelity 
                // on what question we ask but we need to track the start
                response.tag = leadStartResponse.tag;
            }

            // Update the list on session
            context.session.set(Constants.CONTACT_CAPTURE_LIST, leadDataList);
        } else {
            // We have everything, finish it up.
            const leadAlreadySent = context.session.get(Constants.CONTACT_CAPTURE_SENT) as boolean;
            if (leadAlreadySent) {
                response = getResponseByTag(responses, Constants.CONTACT_CAPTURE_SENT_CONTENT);
            } else {
                response = getResponseByTag(responses, Constants.CONTACT_CAPTURE_END_CONTENT);
            }

            // Send the lead
            const url: string = request.attributes?.currentUrl as string;
            const extras = {
                source: url || "unknown",
                completed: true,
                externalId: hasSessionId(request) ? request.sessionId : "unknown"
            }

            const leadTranscript = context.session.transcript();
            // Send the lead time!
            const leadSent = await ContactCaptureHandler.sendLead(slots, extras, leadDataList, leadTranscript, context.services.crmService, request, context.services.eventService, compileResponse(response, request, context));
            log().info(`Lead Sent ? ${leadSent} `);
            // Clean lead gathering list
            // context.session.set(Constants.LEAD_GENERATION_LIST, undefined);
            context.session.set(Constants.CONTACT_CAPTURE_SENT, leadSent);
        }
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
}
