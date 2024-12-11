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
                expect(response?.context?.active).to.have.length(4);
                const output = toResponseOutput(response.outputSpeech || "");
                expect(output.displayText).to.include("**We can help with the installation of your Phase 2 EV charger.**");
                expect(output.displayText).to.include("Could you please provide your name and the best way for a team member to get in touch with you?");
            });
        });
    });
    describe("with data for FORM and CHAT", () => {

    })
});