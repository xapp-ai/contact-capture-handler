/*! Copyright (c) 2023, XAPP AI */

import {
    compileResponse,
    concatResponseOutput,
    Context,
    existsAndNotEmpty,
    findValueForKey,
    getResponseByTag,
    hasSessionId,
    log,
    Request,
    RequestSlotMap,
    requestSlotValueToString,
    Response,
    toResponseOutput,
} from "stentor";

import * as Constants from "../constants";
import { ContactDataType, CaptureRuntimeData } from "../data";
import { concatenateAside, isSessionClosed, lookingForHelp, newLeadGenerationData, } from "../utils";
import { ContactCaptureHandler } from "../handler";
import { GooglePlacesService, PlacesService } from "../services";

import { ResponseStrategy } from "./ResponseStrategy";

export class ProgrammaticResponseStrategy implements ResponseStrategy {

    public async getResponse(handler: ContactCaptureHandler, request: Request, context: Context): Promise<Response> {

        // TODO: Update this method to return what fields the form-widget should ask for based on the handler.data fields

        const isAbandoned = isSessionClosed(request);

        // Helpful data that will be used
        const asideResponse: Response = context.session.get(Constants.CONTACT_CAPTURE_ASIDE);
        const slots: RequestSlotMap = context.session.get(Constants.CONTACT_CAPTURE_SLOTS);

        const isLookingForHelp = lookingForHelp(request);

        const previousType = context.session.get(Constants.CONTACT_CAPTURE_CURRENT_DATA) as ContactDataType;

        // Our response that we will end up returning
        let response: Response;
        const responses = findValueForKey(handler.intentId, handler.content);

        // if we are NOT capturing leads
        if (!handler.data.captureLead) {
            log().debug(`We are not capturing the lead data.`);
            // First find response for not sending leads
            const noCaptureResponse = getResponseByTag(responses, Constants.CONTACT_CAPTURE_NO_LEAD_CAPTURE_CONTENT);
            // if we have it, set it as the response
            if (noCaptureResponse) {
                log().debug(`Found response with tag ${Constants.CONTACT_CAPTURE_NO_LEAD_CAPTURE_CONTENT}, using it.`);
                response = noCaptureResponse;
            } else {
                log().debug(`Attempting to use placeId to build response.`);
                // Build our own.
                // 1. Grab the place ID and look it up
                // Currently, just get the first one
                const place = existsAndNotEmpty(handler.data.places) ? handler.data.places[0] : undefined;
                if (place) {
                    log().debug(`Using place ${place.placeId}`);
                    let placesService: PlacesService = handler.data.placeService;
                    if (!placesService) {
                        // make sure we have the process.env.PLACES
                        log().debug(`Defaulting to GooglePlacesService...`);
                        if (process.env.PLACES_API_KEY) {
                            placesService = new GooglePlacesService(process.env.PLACES_API_KEY);
                        } else {
                            log().warn(`Unable to use default GooglePlacesService, environment variable PLACES_API_KEY is not set.`);
                        }
                    }
                    // make sure we have one still
                    if (placesService) {
                        const details = await placesService.getDetails({ place_id: place.placeId, fields: ["name", "opening_hours", "formatted_phone_number"] });
                        log().info(`Received details for business ${details.name} ${details.formatted_phone_number}`);
                        // only if we have the phone number
                        if (details.formatted_phone_number) {
                            response = {
                                name: "No Capture with Number",
                                tag: "ContactCaptureNoCaptureStart",
                                outputSpeech: {
                                    displayText: `We can help with that, it is best to give us a call at ${details.formatted_phone_number} to continue the conversation.`
                                }
                            }
                        }
                    }
                }

                if (!response) {
                    log().debug("Unable to build response, defaulting to a generic response without business information.");
                    // defaulting to generic no capture response.
                    response = {
                        name: "No Capture",
                        tag: "ContactCaptureNoCaptureStart",
                        outputSpeech: {
                            displayText: "We can help with that, please contact us to continue the conversation."
                        },
                        displays: []
                    }
                }
            }

            response = concatenateAside(response, asideResponse);

            return response;
        }

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

            leadDataList = newLeadGenerationData(handler.data);

            isFirstQuestion = true;
        } else {
            // See if the lead data is stale
            const now = new Date().getTime();
            if (now - leadDataList.lastModifiedMs > Constants.LEAD_LIST_TTL_MS) {

                // and send it off
                const url: string = request.attributes?.currentUrl as string;

                const extras: Record<string, unknown> = {
                    source: url || "unknown",
                    externalId: hasSessionId(request) ? request.sessionId : "unknown",
                    crmFlags: handler.data?.crmFlags,
                    isAbandoned
                }

                const leadTranscript = context.session.transcript();
                // Save the old leads before re-starting
                await ContactCaptureHandler.sendLead(
                    slots,
                    extras,
                    leadDataList,
                    leadTranscript,
                    context.services.crmService,
                    request,
                    context.services.eventService,
                );
                // Refresh the list
                leadDataList = newLeadGenerationData(handler.data);
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
                response = concatenateAside(response, asideResponse);
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
                externalId: hasSessionId(request) ? request.sessionId : "unknown",
                crmFlags: handler.data?.crmFlags,
                isAbandoned
            }

            const leadTranscript = context.session.transcript();
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

            log().info(`Lead Sent ? ${leadSendResult.success} `);

            context.session.set(Constants.CONTACT_CAPTURE_EXISTING_REF_ID, leadSendResult.id);

            // Clean lead gathering list
            // context.session.set(Constants.LEAD_GENERATION_LIST, undefined);
            context.session.set(Constants.CONTACT_CAPTURE_SENT, leadSendResult.success);
        }

        return response;
    }
}