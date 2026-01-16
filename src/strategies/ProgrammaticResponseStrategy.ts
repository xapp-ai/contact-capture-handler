/*! Copyright (c) 2023, XAPP AI */

import { hasSessionId } from "stentor-guards";
import { log } from "stentor-logger";
import { Context, Response, Request, RequestSlotMap } from "stentor-models";
import { concatResponseOutput, compileResponse } from "stentor-response";
import {
    existsAndNotEmpty,
    findValueForKey,
    getResponseByTag,
    requestSlotValueToString,
    toResponseOutput,
} from "stentor-utils";

import * as Constants from "../constants";
import { ContactCaptureData, ContactDataType, CaptureRuntimeData } from "../data";
import {
    concatenateAside,
    getDefaultResponseByTag,
    isSessionClosed,
    lookingForHelp,
    newLeadGenerationData,
} from "../utils";
import { ContactCaptureHandler } from "../handler";
import { GooglePlacesService, PlacesService } from "../services";

import type { ResponseStrategy } from "./ResponseStrategy";
import type { ResultVariableGeneratedInformation } from "@xapp/question-answering-handler/lib/models";
import type { ChatResult, ContactValidation } from "./models/xnlu";

/**
 * Extract CONTACT_VALIDATION from request attributes
 */
function getContactValidation(request: Request): ContactValidation | undefined {
    return request.attributes?.["CONTACT_VALIDATION"] as ContactValidation | undefined;
}

/**
 * Get the appropriate refusal response based on refusal type
 */
function getRefusalResponse(
    responses: Response[],
    contactValidation: ContactValidation,
): Response {
    const refusalType = contactValidation.refusalType || "other";

    // Map refusal types to content tags
    const tagMapping: Record<string, string> = {
        "privacy": Constants.CONTACT_CAPTURE_REFUSAL_PRIVACY_CONTENT,
        "not_interested": Constants.CONTACT_CAPTURE_REFUSAL_NOT_INTERESTED_CONTENT,
        "will_contact_them": Constants.CONTACT_CAPTURE_REFUSAL_WILL_CONTACT_CONTENT,
        "prefers_other_method": Constants.CONTACT_CAPTURE_REFUSAL_OTHER_METHOD_CONTENT,
        "other": Constants.CONTACT_CAPTURE_REFUSAL_CONTENT,
    };

    const contentTag = tagMapping[refusalType] || Constants.CONTACT_CAPTURE_REFUSAL_CONTENT;

    // Try to get configured response first
    let response = getResponseByTag(responses, contentTag);

    // Fall back to default response
    if (!response) {
        response = getDefaultResponseByTag(contentTag);
    }

    // If X-NLU provided a suggested response, combine it with configured response
    if (contactValidation.suggestedResponse && response) {
        response = {
            ...response,
            outputSpeech: concatResponseOutput(
                toResponseOutput(contactValidation.suggestedResponse),
                toResponseOutput(response.outputSpeech),
                { delimiter: " " },
            ),
        };
    } else if (contactValidation.suggestedResponse) {
        response = {
            outputSpeech: toResponseOutput(contactValidation.suggestedResponse),
            tag: contentTag,
        };
    }

    // If we still don't have a response, use a fallback
    if (!response) {
        response = {
            outputSpeech: toResponseOutput("I understand. If you change your mind, we're here to help."),
            tag: Constants.CONTACT_CAPTURE_REFUSAL_CONTENT,
        };
    }

    return response;
}

/**
 * Combine X-NLU's suggested response with configured reprompt
 */
function combineValidationReprompt(response: Response, contactValidation: ContactValidation): Response {
    if (!contactValidation.suggestedResponse) {
        // No suggestion, just use reprompt
        if (response.reprompt) {
            response.outputSpeech = response.reprompt;
        }
        return response;
    }

    const suggestion = toResponseOutput(contactValidation.suggestedResponse);
    const reprompt = response.reprompt ? toResponseOutput(response.reprompt) : toResponseOutput(response.outputSpeech);

    // Combine: X-NLU suggestion + configured reprompt
    response.outputSpeech = concatResponseOutput(suggestion, reprompt, { delimiter: " " });

    return response;
}

export class ProgrammaticResponseStrategy implements ResponseStrategy {
    private data: ContactCaptureData;

    public constructor(data?: ContactCaptureData) {
        this.data = data;
    }

    public async getResponse(handler: ContactCaptureHandler, request: Request, context: Context): Promise<Response> {
        const isAbandoned = isSessionClosed(request);

        // Helpful data that will be used
        const asideResponse: Response = context.session.get(Constants.CONTACT_CAPTURE_ASIDE);
        // And immediately clear it out so we don't use the same one again
        context.session.set(Constants.CONTACT_CAPTURE_ASIDE, undefined);

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
                            log().warn(
                                `Unable to use default GooglePlacesService, environment variable PLACES_API_KEY is not set.`,
                            );
                        }
                    }
                    // make sure we have one still
                    if (placesService) {
                        const details = await placesService.getDetails({
                            place_id: place.placeId,
                            fields: ["name", "opening_hours", "formatted_phone_number"],
                        });
                        log().info(`Received details for business ${details.name} ${details.formatted_phone_number}`);
                        // only if we have the phone number
                        if (details.formatted_phone_number) {
                            response = {
                                name: "No Capture with Number",
                                tag: "ContactCaptureNoCaptureStart",
                                outputSpeech: {
                                    displayText: `We can help with that, it is best to give us a call at ${details.formatted_phone_number} to continue the conversation.`,
                                },
                            };
                        }
                    }
                }

                if (!response) {
                    log().debug(
                        "Unable to build response, defaulting to a generic response without business information.",
                    );
                    // defaulting to generic no capture response.
                    response = {
                        name: "No Capture",
                        tag: "ContactCaptureNoCaptureStart",
                        outputSpeech: {
                            displayText: "We can help with that, please contact us to continue the conversation.",
                        },
                        displays: [],
                    };
                }
            }

            // concatenate the aside response if we have one, it is ignored if we don't have one
            response = concatenateAside(response, asideResponse);

            return response;
        }

        // We will use this later to concatenate the 'start' content.
        let isFirstQuestion = false;

        let leadDataList: CaptureRuntimeData = context.session.get(Constants.CONTACT_CAPTURE_LIST);
        // Make sure we have one, if we don't then it is their first question and we generate a new list
        // the list keeps track of what we still need from the user.
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

            leadDataList = newLeadGenerationData(handler.data, "CHAT");

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
                    isAbandoned,
                };

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
                leadDataList = newLeadGenerationData(handler.data, "CHAT");
            }
        }

        // Get contact validation result from X-NLU (if available)
        const contactValidation = getContactValidation(request);

        // Based on slots figure out what information is missing
        // go through each and check on the slot
        leadDataList.data.forEach((data) => {
            // see if slot exists
            const slot = slots ? slots[data.slotName] : undefined;

            // Check if we have contact validation for the current field being collected
            if (contactValidation && data.type === previousType) {
                // Case 1: Valid input - use normalized value if available
                if (contactValidation.isValid && !contactValidation.isQuestion && !contactValidation.refusedToProvide) {
                    data.collectedValue = contactValidation.normalizedValue
                        || contactValidation.extractedValue
                        || (slot?.value ? requestSlotValueToString(slot.value) : undefined)
                        || request.rawQuery;
                    data.validationConfidence = contactValidation.confidence;
                    log().info(`Validated ${data.type} with confidence ${contactValidation.confidence}: ${data.collectedValue}`);
                }
                // Case 2: Refusal - mark as skipped (handled later in refusal handling)
                else if (contactValidation.refusedToProvide) {
                    data.userSkipped = true;
                    data.refusalType = contactValidation.refusalType;
                    log().info(`User refused to provide ${data.type}, refusal type: ${contactValidation.refusalType}`);
                }
                // Case 3: Question detected - let existing flow handle via asideResponse (don't set collectedValue)
                // Case 4: Invalid input - don't set collectedValue, will trigger reprompt
            }
            // Fallback to existing slot-based logic when no validation present
            else if (slot && slot.value) {
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
            return !data.collectedValue;
        });

        const nextType = nextRequiredData ? nextRequiredData.type : undefined;
        // Keep track of if we are repeating ourselves
        // TODO: What do we do when we are stuck on the same data request
        const repeat = nextType === previousType;

        log().info(`Asking for ${nextType}, previous was ${previousType}.`);
        log().info(
            `${isFirstQuestion ? "Their first question" : "Not their first question"} and they ${isLookingForHelp ? "are looking for help" : "are not looking for help"} `,
        );
        log().info(`isFirstQuestion: ${isFirstQuestion}  lookingForHelp: ${isLookingForHelp}`);

        context.session.set(Constants.CONTACT_CAPTURE_CURRENT_DATA, nextType);

        // Check for refusal - this takes priority and exits the capture flow
        if (contactValidation?.refusedToProvide) {
            log().info(`User refused to provide contact info, refusal type: ${contactValidation.refusalType}`);

            // Store partial lead data in session (don't send to CRM per user requirement)
            context.session.set(Constants.CONTACT_CAPTURE_REFUSED, true);
            context.session.set(Constants.CONTACT_CAPTURE_REFUSAL_TYPE, contactValidation.refusalType);
            context.session.set(Constants.CONTACT_CAPTURE_PARTIAL_LEAD, leadDataList);

            // Get appropriate refusal response based on refusal type
            response = getRefusalResponse(responses, contactValidation);

            // Exit capture flow by returning early
            return response;
        }

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
                // get the default response if we don't have an override
                response = getDefaultResponseByTag(contentId);

                // if we still don't have one, send an error message
                if (!response) {
                    const errorMessage = `Missing content for tag ${contentId}`;
                    log().error(errorMessage);
                    response = {
                        outputSpeech: {
                            displayText: `ERROR: I am not configured correctly. ${errorMessage}`,
                            ssml: `ERROR: I am not configured correctly. ${errorMessage}`,
                        },
                        tag: "ERROR",
                    };
                }
            }

            // If we have an aside response, concat them.
            if (asideResponse) {
                log().debug(`We have an aside response, concatenating with found response.`);
                log().debug(asideResponse);
                // I think we want to use the reprompt here.
                response = concatenateAside(response, asideResponse);
            } else if (repeat && contactValidation && !contactValidation.isValid && !contactValidation.isQuestion) {
                // Invalid input detected by X-NLU - combine suggestedResponse with reprompt
                log().debug(`Invalid input detected, combining X-NLU suggestion with reprompt`);
                response = combineValidationReprompt(response, contactValidation);
            } else if (repeat) {
                // Give them the reprompt on a repeat
                response.outputSpeech = response.reprompt;
                // TODO: DO we need to pass through the context here again?  It may be missed and not work
            }

            // if it is the first question, we need to concatenate the lead gen start content at the front
            if (isFirstQuestion) {
                let leadStartResponse: Response;
                if (isLookingForHelp) {
                    // useChatResponse allows us to use the chat response for the help start content
                    // we look for it on the data object first and then an environment variable
                    let useChatResponse = false;

                    const hasUseChatResponseOnData = typeof this.data.useChatResponse === "boolean";

                    if (hasUseChatResponseOnData) {
                        useChatResponse = this.data.useChatResponse;
                    } else if (process.env.USE_CHAT_RESPONSE === "true") {
                        useChatResponse = true;
                    }

                    const attributes = request.attributes;

                    // we only use the chat response on the first response
                    if (useChatResponse && attributes) {
                        // See if we have the response on the session data
                        const chatResponse: ResultVariableGeneratedInformation = attributes["CHAT_RESPONSE"];

                        // lets get the
                        const chatResult = attributes["CHAT_COMPLETION_RESULT"] as ChatResult;

                        if (chatResult?.askedForContactInfo) {
                            log().info(`Asked for contact info, using chat response for help start content.`);

                            if (chatResult.answer) {
                                leadStartResponse = {
                                    outputSpeech: toResponseOutput(chatResult.answer),
                                    tag: Constants.CONTACT_CAPTURE_HELP_START_CONTENT,
                                };
                            }

                            if (chatResult.followUpQuestion) {
                                response = {
                                    outputSpeech: toResponseOutput(chatResult.followUpQuestion),
                                    tag: Constants.CONTACT_CAPTURE_HELP_START_CONTENT,
                                };
                            }
                        } else if (chatResponse) {
                            log().info(`Using chat response for help start content`);
                            leadStartResponse = {
                                outputSpeech: toResponseOutput(chatResponse.markdownText),
                                tag: Constants.CONTACT_CAPTURE_HELP_START_CONTENT,
                            };
                        }
                    }
                    if (!leadStartResponse) {
                        leadStartResponse = getResponseByTag(responses, Constants.CONTACT_CAPTURE_HELP_START_CONTENT);
                    }
                } else {
                    leadStartResponse = getResponseByTag(responses, Constants.CONTACT_CAPTURE_START_CONTENT);
                }
                // TODO: What happens when leadStartResponse is empty

                response.outputSpeech = concatResponseOutput(
                    toResponseOutput(leadStartResponse.outputSpeech),
                    toResponseOutput(response.outputSpeech),
                    { delimiter: "\n\n" },
                );

                // since this is a start, we lose a little bit of fidelity
                // on what question we ask but we need to track the start
                response.tag = leadStartResponse.tag;
                // add all the contexts if not
                if (!existsAndNotEmpty(response.context?.active)) {
                    response.context = {
                        active: [
                            {
                                name: "expecting_name",
                                parameters: null,
                                timeToLive: {
                                    timeToLiveInSeconds: 400,
                                    turnsToLive: 2,
                                },
                            },
                            {
                                name: "expecting_email",
                                parameters: null,
                                timeToLive: {
                                    timeToLiveInSeconds: 400,
                                    turnsToLive: 2,
                                },
                            },
                            {
                                name: "expecting_phone",
                                parameters: null,
                                timeToLive: {
                                    timeToLiveInSeconds: 400,
                                    turnsToLive: 2,
                                },
                            },
                            {
                                name: "expecting_address",
                                parameters: null,
                                timeToLive: {
                                    timeToLiveInSeconds: 400,
                                    turnsToLive: 2,
                                },
                            },
                            {
                                name: "expecting_contact_pref",
                                parameters: null,
                                timeToLive: {
                                    timeToLiveInSeconds: 400,
                                    turnsToLive: 2,
                                },
                            },
                        ],
                    };
                }
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
                // this is a duplicate of source on ExternalLead
                // leaving as is for now
                source: url || "unknown",
                // adding this to be more descriptive
                currentUrl: url,
                externalId: hasSessionId(request) ? request.sessionId : "unknown",
                crmFlags: handler.data?.crmFlags,
                isAbandoned,
            };

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
