/*! Copyright (c) 2024, XAPP AI */
import * as chai from "chai";
import * as sinonChai from "sinon-chai";

chai.use(sinonChai);
const expect = chai.expect;

import type {
    Content,
    Context,
    Handler,
    IntentRequest,
} from "stentor-models";
import { ContextBuilder } from "stentor-context";
import { IntentRequestBuilder } from "stentor-request";
import { ResponseBuilder } from "stentor-response";
import { toResponseOutput } from "stentor-utils";

import * as Constants from "../../constants";
import type { ContactCaptureData } from "../../data";
import { ContactCaptureHandler } from "../../handler";
import type { ChatResult } from "../models/xnlu";

import { ProgrammaticResponseStrategy } from "../ProgrammaticResponseStrategy";
import type { ContactValidation } from "../models/xnlu";

const props: Handler<Content, ContactCaptureData> = {
    intentId: "intentId",
    type: "ContactCaptureHandler",
    appId: "appId",
    organizationId: "organizationId",
    content: {
        ["intentId"]: [
            {
                name: "First Name",
                tag: "FirstNameQuestionContent",
                outputSpeech: {
                    ssml: "<speak>What is your name?</speak>",
                    displayText: "What is your name?",
                },
                reprompt: {
                    ssml: "<speak>May I have your name?</speak>",
                    displayText: "May I have your name?"
                }
            },
            {
                name: "Start",
                tag: "ContactCaptureStart",
                outputSpeech: {
                    ssml: "<speak>Why hello!</speak>",
                    displayText: "Why hello!",
                }
            },
            {
                name: "Start",
                tag: "ContactCaptureHelpStart",
                outputSpeech: {
                    ssml: "<speak>We can help with that.</speak>",
                    displayText: "We can help with that.",
                }
            }
        ],
        ["OCSearch"]: [
            {
                name: "FAQ",
                tag: "KB_TOP_FAQ",
                outputSpeech: {
                    ssml: "<speak>${TOP_FAQ.text}</speak>",
                    displayText: "${TOP_FAQ.text}",
                },
                conditions: "!!session('TOP_FAQ')"
            }
        ],
        ["Thanks"]: [
            {
                name: "No Problem",
                outputSpeech: {
                    ssml: "<speak>No Problem</speak>",
                    displayText: "No problem",
                }
            }
        ]
    },
    data: {
        "places": [],
        "captureLead": true,
        "useChatResponse": true,
        "inputUnknownStrategy": "REPROMPT",
        "capture": {
            "data": [
                {
                    "slotName": "first_name",
                    "active": true,
                    "type": "FIRST_NAME",
                    "questionContentKey": "FirstNameQuestionContent"
                },
                {
                    "slotName": "last_name",
                    "active": true,
                    "type": "LAST_NAME",
                    "questionContentKey": "LastNameQuestionContent"
                },
                {
                    "slotName": "phone",
                    "active": true,
                    "type": "PHONE",
                    "questionContentKey": "PhoneQuestionContent"
                },
                {
                    "slotName": "full_name",
                    "active": false,
                    "type": "FULL_NAME",
                    "questionContentKey": "FullNameQuestionContent"
                },
                {
                    "slotName": "zip",
                    "active": false,
                    "type": "ZIP",
                    "questionContentKey": "ZipQuestionContent"
                },
                {
                    "slotName": "address",
                    "active": true,
                    "type": "ADDRESS",
                    "questionContentKey": "AddressQuestionContent"
                },
                {
                    "slotName": "email",
                    "active": false,
                    "type": "EMAIL",
                    "questionContentKey": "EmailQuestionContent"
                },
                {
                    "slotName": "dateTime",
                    "active": false,
                    "type": "DATE_TIME",
                    "questionContentKey": "DateTimeQuestionContent"
                },
                {
                    "slotName": "organization",
                    "active": true,
                    "acceptAnyInput": true,
                    "type": "ORGANIZATION",
                    "questionContentKey": "OrganizationQuestionContent"
                },
                {
                    "slotName": "selection",
                    "enums": [
                        "Solar",
                        "Roofing"
                    ],
                    "active": false,
                    "type": "SELECTION",
                    "questionContentKey": "SelectionQuestionContent"
                },
                {
                    "slotName": "message",
                    "acceptAnyInput": true,
                    "active": false,
                    "type": "MESSAGE",
                    "questionContentKey": "MessageQuestionContent"
                }
            ]
        },
        "chat": {
            "followUp": ""
        }
    }
};

describe(`${ProgrammaticResponseStrategy.name}`, () => {
    let handler: ContactCaptureHandler;
    let response: ResponseBuilder;
    let request: IntentRequest;
    let context: Context;
    before(() => {
        handler = new ContactCaptureHandler(props);
        request = new IntentRequestBuilder()
            .withSlots({})
            .withIntentId(props.intentId)
            .updateDevice({
                canSpeak: false
            }).build();

        request.overrideKey = "HelpWith";

        request.attributes = {
            "CHAT_RESPONSE": {
                text: "Best you get in touch with us for that.",
                markdownText: "Best you get in touch with us for that.",
            }
        };

        context = new ContextBuilder()
            .withResponse(response)
            .build();
    })
    describe("with useChat set to false", () => {
        beforeEach(() => {
            context = new ContextBuilder()
                .withResponse(response)
                .withSessionData({
                    id: "foo",
                    data: {
                        "CHAT_RESPONSE": {
                            text: "Best you get in touch with us for that.",
                            markdownText: "Best you get in touch with us for that.",
                        }
                    }
                })
                .build();
        });
        it("returns a response with the session value", async () => {

            const copy: ContactCaptureData = { ...props.data } as ContactCaptureData;
            copy.useChatResponse = false;

            const strategy = new ProgrammaticResponseStrategy(copy);
            const response = await strategy.getResponse(handler, request, context);
            // eslint-disable-next-line no-console
            expect(response).to.exist;
            const output = toResponseOutput(response.outputSpeech || "");
            expect(output.displayText).to.include("We can help with that.\n\nWhat is your name?");
        });
    });
    describe("with useChat set to true", () => {
        beforeEach(() => {
            context = new ContextBuilder()
                .withResponse(response)
                .withSessionData({
                    id: "foo",
                    data: {
                        "CHAT_RESPONSE": {
                            text: "Best you get in touch with us for that.",
                            markdownText: "Best you get in touch with us for that.",
                        }
                    }
                })
                .build();
        });
        it("returns a response with the session value", async () => {
            const strategy = new ProgrammaticResponseStrategy(props.data);
            const response = await strategy.getResponse(handler, request, context);
            expect(response).to.exist;
            const output = toResponseOutput(response.outputSpeech || "");
            expect(output.displayText).to.include("Best you get in touch with us for that.");
        });
        describe("with chat completion result on the request", () => {
            beforeEach(() => {
                context = new ContextBuilder()
                    .withResponse(response)
                    .withSessionData({
                        id: "foo",
                        data: {
                            "CHAT_RESPONSE": {
                                text: "Best you get in touch with us for that.",
                                markdownText: "Best you get in touch with us for that.",
                            }
                        }
                    })
                    .build();

                const chatResult: ChatResult = {
                    "needsAssistance": "YES",
                    "potentialLead": true,
                    "messageType": "CONTACT_REQUEST",
                    "answer": "**We can help with the installation of your Phase 2 EV charger.**",
                    "followUpQuestion": "Could you please provide your name and the best way for a team member to get in touch with you?",
                    "response": "**We can help with the installation of your Phase 2 EV charger.** Could you please provide your name and the best way for a team member to get in touch with you?",
                    "answeredQuestion": true,
                    "suggestions": [
                        "Contact Information",
                        "EV Charger Installation"
                    ],
                    "urgency": "HIGH",
                    "askedForContactInfo": true,
                    "documentIds": [
                        "1"
                    ],
                    "model": "gpt-4o",
                    "queryTime": 3942,
                    "queries": [
                        "hi, i need some help getting a phase 2 ev charger setup"
                    ]
                };

                request = new IntentRequestBuilder()
                    .withSlots({})
                    .withAttributes({
                        CHAT_COMPLETION_RESULT: chatResult
                    })
                    .withIntentId(props.intentId)
                    .updateDevice({
                        canSpeak: false
                    }).build();

                request.overrideKey = "HelpWith";
            });
            it("returns a response from the chat result on the request attributes", async () => {
                const strategy = new ProgrammaticResponseStrategy(props.data);
                const response = await strategy.getResponse(handler, request, context);
                expect(response).to.exist;
                expect(response.tag).to.equal(Constants.CONTACT_CAPTURE_HELP_START_CONTENT);
                expect(response?.context?.active).to.have.length(5);
                const output = toResponseOutput(response.outputSpeech || "");
                expect(output.displayText).to.include("**We can help with the installation of your Phase 2 EV charger.**");
                expect(output.displayText).to.include("Could you please provide your name and the best way for a team member to get in touch with you?");
            });
        });
        describe("when in the middle of data capture", () => {

        });
    });
    describe("with CONTACT_VALIDATION on request", () => {
        describe("when validation is successful", () => {
            it("uses normalizedValue for collectedValue", async () => {
                const contactValidation: ContactValidation = {
                    field: "PHONE",
                    isValid: true,
                    confidence: "high",
                    extractedValue: "(555) 123-4567",
                    normalizedValue: "5551234567",
                    isQuestion: false,
                    shouldAnswerQuestion: false,
                    refusedToProvide: false
                };

                const testRequest = new IntentRequestBuilder()
                    .withSlots({})
                    .withAttributes({
                        CONTACT_VALIDATION: contactValidation
                    })
                    .withIntentId(props.intentId)
                    .updateDevice({ canSpeak: false })
                    .build();

                const testContext = new ContextBuilder()
                    .withResponse(response)
                    .withSessionData({
                        id: "foo",
                        data: {
                            [Constants.CONTACT_CAPTURE_CURRENT_DATA]: "PHONE",
                            [Constants.CONTACT_CAPTURE_SLOTS]: {},
                            [Constants.CONTACT_CAPTURE_LIST]: {
                                data: [
                                    { type: "PHONE", slotName: "phone", questionContentKey: "PhoneQuestionContent", active: true },
                                    // Add another field so the capture doesn't complete and try to send lead
                                    { type: "ADDRESS", slotName: "address", questionContentKey: "AddressQuestionContent", active: true }
                                ],
                                lastModifiedMs: Date.now()
                            }
                        }
                    })
                    .build();

                const strategy = new ProgrammaticResponseStrategy(props.data);
                await strategy.getResponse(handler, testRequest, testContext);

                // Check that the lead data was updated with normalized value
                const leadDataList = testContext.session.get(Constants.CONTACT_CAPTURE_LIST);
                expect(leadDataList.data[0].collectedValue).to.equal("5551234567");
                expect(leadDataList.data[0].validationConfidence).to.equal("high");
            });
            it("uses extractedValue when normalizedValue is not available", async () => {
                const contactValidation: ContactValidation = {
                    field: "PHONE",
                    isValid: true,
                    confidence: "medium",
                    extractedValue: "(555) 123-4567",
                    // Note: no normalizedValue
                    isQuestion: false,
                    shouldAnswerQuestion: false,
                    refusedToProvide: false
                };

                const testRequest = new IntentRequestBuilder()
                    .withSlots({})
                    .withAttributes({
                        CONTACT_VALIDATION: contactValidation
                    })
                    .withIntentId(props.intentId)
                    .updateDevice({ canSpeak: false })
                    .build();

                const testContext = new ContextBuilder()
                    .withResponse(response)
                    .withSessionData({
                        id: "foo",
                        data: {
                            [Constants.CONTACT_CAPTURE_CURRENT_DATA]: "PHONE",
                            [Constants.CONTACT_CAPTURE_SLOTS]: {},
                            [Constants.CONTACT_CAPTURE_LIST]: {
                                data: [
                                    { type: "PHONE", slotName: "phone", questionContentKey: "PhoneQuestionContent", active: true },
                                    { type: "ADDRESS", slotName: "address", questionContentKey: "AddressQuestionContent", active: true }
                                ],
                                lastModifiedMs: Date.now()
                            }
                        }
                    })
                    .build();

                const strategy = new ProgrammaticResponseStrategy(props.data);
                await strategy.getResponse(handler, testRequest, testContext);

                // Should fall back to extractedValue when normalizedValue is missing
                const leadDataList = testContext.session.get(Constants.CONTACT_CAPTURE_LIST);
                expect(leadDataList.data[0].collectedValue).to.equal("(555) 123-4567");
                expect(leadDataList.data[0].validationConfidence).to.equal("medium");
            });
        });
        describe("when user refuses to provide information", () => {
            it("stores partial lead and returns refusal response for privacy refusal", async () => {
                const contactValidation: ContactValidation = {
                    field: "PHONE",
                    isValid: false,
                    confidence: "high",
                    isQuestion: false,
                    shouldAnswerQuestion: false,
                    refusedToProvide: true,
                    refusalType: "privacy",
                    suggestedResponse: "I understand your privacy concerns."
                };

                const testRequest = new IntentRequestBuilder()
                    .withSlots({})
                    .withAttributes({
                        CONTACT_VALIDATION: contactValidation
                    })
                    .withIntentId(props.intentId)
                    .updateDevice({ canSpeak: false })
                    .build();

                const testContext = new ContextBuilder()
                    .withResponse(response)
                    .withSessionData({
                        id: "foo",
                        data: {
                            [Constants.CONTACT_CAPTURE_CURRENT_DATA]: "PHONE",
                            [Constants.CONTACT_CAPTURE_SLOTS]: {},
                            [Constants.CONTACT_CAPTURE_LIST]: {
                                data: [
                                    { type: "FIRST_NAME", slotName: "first_name", questionContentKey: "FirstNameQuestionContent", active: true, collectedValue: "John" },
                                    { type: "PHONE", slotName: "phone", questionContentKey: "PhoneQuestionContent", active: true }
                                ],
                                lastModifiedMs: Date.now()
                            }
                        }
                    })
                    .build();

                const strategy = new ProgrammaticResponseStrategy(props.data);
                const result = await strategy.getResponse(handler, testRequest, testContext);

                // Check that refusal was detected and session was updated
                expect(testContext.session.get(Constants.CONTACT_CAPTURE_REFUSED)).to.be.true;
                expect(testContext.session.get(Constants.CONTACT_CAPTURE_REFUSAL_TYPE)).to.equal("privacy");
                expect(testContext.session.get(Constants.CONTACT_CAPTURE_PARTIAL_LEAD)).to.exist;

                // Check that response includes the suggested response
                const output = toResponseOutput(result.outputSpeech || "");
                expect(output.displayText).to.include("I understand");
            });
            it("returns will-contact response for will_contact_them refusal", async () => {
                const contactValidation: ContactValidation = {
                    field: "PHONE",
                    isValid: false,
                    confidence: "high",
                    isQuestion: false,
                    shouldAnswerQuestion: false,
                    refusedToProvide: true,
                    refusalType: "will_contact_them"
                };

                const testRequest = new IntentRequestBuilder()
                    .withSlots({})
                    .withAttributes({
                        CONTACT_VALIDATION: contactValidation
                    })
                    .withIntentId(props.intentId)
                    .updateDevice({ canSpeak: false })
                    .build();

                const testContext = new ContextBuilder()
                    .withResponse(response)
                    .withSessionData({
                        id: "foo",
                        data: {
                            [Constants.CONTACT_CAPTURE_CURRENT_DATA]: "PHONE",
                            [Constants.CONTACT_CAPTURE_SLOTS]: {},
                            [Constants.CONTACT_CAPTURE_LIST]: {
                                data: [
                                    { type: "PHONE", slotName: "phone", questionContentKey: "PhoneQuestionContent", active: true }
                                ],
                                lastModifiedMs: Date.now()
                            }
                        }
                    })
                    .build();

                const strategy = new ProgrammaticResponseStrategy(props.data);
                const result = await strategy.getResponse(handler, testRequest, testContext);

                const output = toResponseOutput(result.outputSpeech || "");
                expect(output.displayText).to.include("look forward to hearing from you");
            });
            it("falls back to default response when suggestedResponse is not provided", async () => {
                const contactValidation: ContactValidation = {
                    field: "PHONE",
                    isValid: false,
                    confidence: "high",
                    isQuestion: false,
                    shouldAnswerQuestion: false,
                    refusedToProvide: true,
                    refusalType: "not_interested"
                    // Note: no suggestedResponse
                };

                const testRequest = new IntentRequestBuilder()
                    .withSlots({})
                    .withAttributes({
                        CONTACT_VALIDATION: contactValidation
                    })
                    .withIntentId(props.intentId)
                    .updateDevice({ canSpeak: false })
                    .build();

                const testContext = new ContextBuilder()
                    .withResponse(response)
                    .withSessionData({
                        id: "foo",
                        data: {
                            [Constants.CONTACT_CAPTURE_CURRENT_DATA]: "PHONE",
                            [Constants.CONTACT_CAPTURE_SLOTS]: {},
                            [Constants.CONTACT_CAPTURE_LIST]: {
                                data: [
                                    { type: "PHONE", slotName: "phone", questionContentKey: "PhoneQuestionContent", active: true }
                                ],
                                lastModifiedMs: Date.now()
                            }
                        }
                    })
                    .build();

                const strategy = new ProgrammaticResponseStrategy(props.data);
                const result = await strategy.getResponse(handler, testRequest, testContext);

                // Should use default "not interested" response since no suggestedResponse
                const output = toResponseOutput(result.outputSpeech || "");
                expect(output.displayText).to.include("No problem");
                expect(output.displayText).to.include("change your mind");
            });
        });
        describe("when validation fails (invalid input)", () => {
            it("combines suggestedResponse with reprompt on repeat", async () => {
                const contactValidation: ContactValidation = {
                    field: "PHONE",
                    isValid: false,
                    confidence: "high",
                    isQuestion: false,
                    shouldAnswerQuestion: false,
                    refusedToProvide: false,
                    errorMessage: "Incomplete phone number",
                    suggestedResponse: "That doesn't look like a valid phone number."
                };

                const testRequest = new IntentRequestBuilder()
                    .withSlots({})
                    .withAttributes({
                        CONTACT_VALIDATION: contactValidation
                    })
                    .withIntentId(props.intentId)
                    .updateDevice({ canSpeak: false })
                    .build();

                const testContext = new ContextBuilder()
                    .withResponse(response)
                    .withSessionData({
                        id: "foo",
                        data: {
                            [Constants.CONTACT_CAPTURE_CURRENT_DATA]: "PHONE",
                            [Constants.CONTACT_CAPTURE_SLOTS]: {},
                            [Constants.CONTACT_CAPTURE_LIST]: {
                                data: [
                                    { type: "PHONE", slotName: "phone", questionContentKey: "PhoneQuestionContent", active: true }
                                ],
                                lastModifiedMs: Date.now()
                            }
                        }
                    })
                    .build();

                const strategy = new ProgrammaticResponseStrategy(props.data);
                const result = await strategy.getResponse(handler, testRequest, testContext);

                // Check that response combines X-NLU suggestion with reprompt
                const output = toResponseOutput(result.outputSpeech || "");
                expect(output.displayText).to.include("That doesn't look like a valid phone number");
                expect(output.displayText).to.include("phone number");
            });
            it("uses only reprompt when suggestedResponse is not provided", async () => {
                const contactValidation: ContactValidation = {
                    field: "PHONE",
                    isValid: false,
                    confidence: "high",
                    isQuestion: false,
                    shouldAnswerQuestion: false,
                    refusedToProvide: false,
                    errorMessage: "Incomplete phone number"
                    // Note: no suggestedResponse
                };

                const testRequest = new IntentRequestBuilder()
                    .withSlots({})
                    .withAttributes({
                        CONTACT_VALIDATION: contactValidation
                    })
                    .withIntentId(props.intentId)
                    .updateDevice({ canSpeak: false })
                    .build();

                const testContext = new ContextBuilder()
                    .withResponse(response)
                    .withSessionData({
                        id: "foo",
                        data: {
                            [Constants.CONTACT_CAPTURE_CURRENT_DATA]: "PHONE",
                            [Constants.CONTACT_CAPTURE_SLOTS]: {},
                            [Constants.CONTACT_CAPTURE_LIST]: {
                                data: [
                                    { type: "PHONE", slotName: "phone", questionContentKey: "PhoneQuestionContent", active: true }
                                ],
                                lastModifiedMs: Date.now()
                            }
                        }
                    })
                    .build();

                const strategy = new ProgrammaticResponseStrategy(props.data);
                const result = await strategy.getResponse(handler, testRequest, testContext);

                // Should use reprompt only (no X-NLU suggestion to prepend)
                const output = toResponseOutput(result.outputSpeech || "");
                expect(output.displayText).to.equal("May I have your phone number?");
            });
        });
        describe("when user asks a question (isQuestion: true)", () => {
            it("does not set collectedValue, allowing aside flow to handle", async () => {
                const contactValidation: ContactValidation = {
                    field: "PHONE",
                    isValid: false,
                    confidence: "high",
                    isQuestion: true,
                    questionIntent: "service_inquiry",
                    shouldAnswerQuestion: true,
                    refusedToProvide: false
                };

                const testRequest = new IntentRequestBuilder()
                    .withSlots({})
                    .withAttributes({
                        CONTACT_VALIDATION: contactValidation
                    })
                    .withIntentId(props.intentId)
                    .updateDevice({ canSpeak: false })
                    .build();

                const testContext = new ContextBuilder()
                    .withResponse(response)
                    .withSessionData({
                        id: "foo",
                        data: {
                            [Constants.CONTACT_CAPTURE_CURRENT_DATA]: "PHONE",
                            [Constants.CONTACT_CAPTURE_SLOTS]: {},
                            [Constants.CONTACT_CAPTURE_LIST]: {
                                data: [
                                    { type: "PHONE", slotName: "phone", questionContentKey: "PhoneQuestionContent", active: true },
                                    { type: "ADDRESS", slotName: "address", questionContentKey: "AddressQuestionContent", active: true }
                                ],
                                lastModifiedMs: Date.now()
                            }
                        }
                    })
                    .build();

                const strategy = new ProgrammaticResponseStrategy(props.data);
                await strategy.getResponse(handler, testRequest, testContext);

                // collectedValue should NOT be set when isQuestion is true
                const leadDataList = testContext.session.get(Constants.CONTACT_CAPTURE_LIST);
                expect(leadDataList.data[0].collectedValue).to.be.undefined;
            });
        });
        describe("when no CONTACT_VALIDATION present", () => {
            it("falls back to existing slot-based logic", async () => {
                const testRequest = new IntentRequestBuilder()
                    .withSlots({
                        phone: { name: "phone", value: "5551234567" }
                    })
                    .withIntentId(props.intentId)
                    .updateDevice({ canSpeak: false })
                    .build();

                const testContext = new ContextBuilder()
                    .withResponse(response)
                    .withSessionData({
                        id: "foo",
                        data: {
                            [Constants.CONTACT_CAPTURE_CURRENT_DATA]: "PHONE",
                            [Constants.CONTACT_CAPTURE_SLOTS]: {
                                phone: { name: "phone", value: "5551234567" }
                            },
                            [Constants.CONTACT_CAPTURE_LIST]: {
                                data: [
                                    { type: "PHONE", slotName: "phone", questionContentKey: "PhoneQuestionContent", active: true },
                                    // Add another field so the capture doesn't complete and try to send lead
                                    { type: "ADDRESS", slotName: "address", questionContentKey: "AddressQuestionContent", active: true }
                                ],
                                lastModifiedMs: Date.now()
                            }
                        }
                    })
                    .build();

                const strategy = new ProgrammaticResponseStrategy(props.data);
                await strategy.getResponse(handler, testRequest, testContext);

                // Check that the lead data was updated from slot value (fallback behavior)
                const leadDataList = testContext.session.get(Constants.CONTACT_CAPTURE_LIST);
                expect(leadDataList.data[0].collectedValue).to.equal("5551234567");
                // No validationConfidence since we didn't use X-NLU validation
                expect(leadDataList.data[0].validationConfidence).to.be.undefined;
            });
        });
    });
});