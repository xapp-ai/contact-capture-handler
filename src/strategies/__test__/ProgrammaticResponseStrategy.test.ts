/*! Copyright (c) 2024, XAPP AI */
import * as chai from "chai";
import * as sinonChai from "sinon-chai";

chai.use(sinonChai);
const expect = chai.expect;

import {
    Content,
    Context,
    ContextBuilder,
    Handler,
    IntentRequest,
    IntentRequestBuilder,
    ResponseBuilder,
    toResponseOutput,
} from "stentor";

import { ContactCaptureData } from "../../data";
import { ContactCaptureHandler } from "../../handler";

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
}

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
    })
    describe("with useChat set to true", () => {
        it("returns a response with the session value", async () => {

            const strategy = new ProgrammaticResponseStrategy(props.data);
            const response = await strategy.getResponse(handler, request, context);
            // eslint-disable-next-line no-console
            expect(response).to.exist;
            const output = toResponseOutput(response.outputSpeech || "");
            expect(output.displayText).to.include("Best you get in touch with us for that.");
        });
    });
});