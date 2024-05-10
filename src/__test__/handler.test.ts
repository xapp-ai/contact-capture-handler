/*! Copyright (c) 2022, XAPP AI */
import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";

chai.use(sinonChai);
const expect = chai.expect;

import {
    Content,
    Context,
    IntentRequest,
    Handler,
    ResponseBuilder,
    KnowledgeBaseResult,
    CrmService
} from "stentor";
import { CrmResponse } from "stentor-models";
import { IntentRequestBuilder } from "stentor-request";
import { ContextBuilder } from "stentor-context";

import { ContactCaptureData } from "../data";
import { ContactCaptureHandler } from "../handler";
import { CONTACT_CAPTURE_CURRENT_DATA, CONTACT_CAPTURE_LIST, CONTACT_CAPTURE_SENT, CONTACT_CAPTURE_SLOTS } from "../constants";
import { DetailParams, Place, PlacesService, SearchParams } from "../services";

class MockCRM implements CrmService {
    public async send(): Promise<CrmResponse> {
        return {
            status: "Success"
        };
    }
}

class MockPlacesService implements PlacesService {
    public async search(params: SearchParams): Promise<Place[]> {
        // eslint-disable-next-line no-console
        console.log(params);
        return [{ place_id: "place_id" }];
    }
    public async getDetails(params: DetailParams): Promise<Place> {
        // eslint-disable-next-line no-console
        console.log(params);
        return { place_id: "place_id", formatted_phone_number: "111-123-3333" }
    }
}

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
        "inputUnknownStrategy": "REPROMPT",
        "captureLead": true,
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
        },
        CAPTURE_MAIN_FORM: "",
        FUZZY_MATCH_FAQS: true
    }
}

const propsWithAnyInputQuestion: Handler<Content, ContactCaptureData> = {
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
                }
            },
            {
                name: "Organization",
                tag: "OrganizationQuestionContent",
                outputSpeech: {
                    ssml: "<speak>What is your organization?</speak>",
                    displayText: "What is your organization?",
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
        ]
    },
    data: {
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
                    "active": false,
                    "type": "LAST_NAME",
                    "questionContentKey": "LastNameQuestionContent"
                },
                {
                    "slotName": "phone",
                    "active": false,
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
                    "active": false,
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
        "captureLead": true,
        CAPTURE_MAIN_FORM: ""
    }
}

const propsWithNoCapture: Handler<Content, ContactCaptureData> = {
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
        "inputUnknownStrategy": "REPROMPT",
        "capture": {
            "data": []
        },
        "chat": {
            "followUp": ""
        },
        CAPTURE_MAIN_FORM: ""
    }
}

const propsWithNoCaptureAndContent: Handler<Content, ContactCaptureData> = {
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
                name: "No Capture",
                tag: "ContactCaptureNoCaptureStart",
                outputSpeech: {
                    displayText: "Please call us ASAP!"
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
        "inputUnknownStrategy": "REPROMPT",
        "capture": {
            "data": []
        },
        "chat": {
            "followUp": ""
        },
        CAPTURE_MAIN_FORM: "",
        FUZZY_MATCH_FAQS: true
    }
}

describe(`${ContactCaptureHandler.name}`, () => {
    let cc: ContactCaptureHandler;
    let response: ResponseBuilder;
    let request: IntentRequest;
    let context: Context;
    // Services
    let crmService: CrmService;
    let placesService: PlacesService;

    it(`returns an instance of itself`, () => {
        expect(new ContactCaptureHandler(props)).to.be.instanceOf(ContactCaptureHandler);
    });
    describe(`#${ContactCaptureHandler.prototype.canHandleRequest.name}()`, () => {
        beforeEach(() => {
            request = new IntentRequestBuilder()
                .withSlots({})
                .withIntentId(props.intentId)
                .updateDevice({
                    canSpeak: false
                }).build();

            context = new ContextBuilder()
                .withResponse(response)
                .withSessionData({ id: "foo", data: {} })
                .build();
        });
        it("returns as expected", () => {
            const handler = new ContactCaptureHandler(propsWithNoCapture);
            const handled = handler.canHandleRequest(request, context);
            expect(handled).to.be.true
        });
        describe("for a knowledge base request", () => {
            it("returns as expected", () => {
                request = new IntentRequestBuilder()
                    .withSlots({})
                    .withIntentId("KnowledgeAnswer")
                    .updateDevice({
                        canSpeak: false
                    }).build();
                const handler = new ContactCaptureHandler(propsWithNoCapture);
                const handled = handler.canHandleRequest(request, context);
                expect(handled).to.be.false
            });
        });
        describe("with captureLeads set to true", () => {
            it("returns as expected", () => {
                const handler = new ContactCaptureHandler(props);
                const handled = handler.canHandleRequest(request, context);
                expect(handled).to.be.true
            });
            describe("for a knowledge base request", () => {
                it("returns as expected", () => {
                    request = new IntentRequestBuilder()
                        .withSlots({})
                        .withIntentId("KnowledgeAnswer")
                        .updateDevice({
                            canSpeak: false
                        }).build();
                    const handler = new ContactCaptureHandler(props);
                    const handled = handler.canHandleRequest(request, context);
                    expect(handled).to.be.true
                });
            });
        });
    });
    describe(`#${ContactCaptureHandler.prototype.handleRequest.name}()`, () => {
        describe("with captureLead set to true", () => {
            describe("for a initial request", () => {
                const sandbox = sinon.createSandbox();
                beforeEach(() => {
                    response = new ResponseBuilder({
                        device: {
                            audioSupported: false,
                            channel: "test",
                            canPlayAudio: false,
                            canPlayVideo: false,
                            canSpeak: false,
                            canThrowCard: false,
                            canTransferCall: false,
                            hasScreen: true,
                            hasWebBrowser: true,
                            videoSupported: false
                        }
                    });
                    sandbox.spy(response, "respond");

                    request = new IntentRequestBuilder()
                        .withSlots({})
                        .withIntentId(props.intentId)
                        .updateDevice({
                            canSpeak: false
                        }).build();

                    context = new ContextBuilder()
                        .withResponse(response)
                        .withSessionData({ id: "foo", data: {} })
                        .build();
                });
                afterEach(() => {
                    sandbox.restore();
                });
                it("returns the initial response", async () => {
                    cc = new ContactCaptureHandler(props);

                    await cc.handleRequest(request, context);

                    expect(response.respond).to.have.been.calledOnce;
                    expect(response.respond).to.have.been.calledWith({
                        name: "First Name",
                        // This is the start
                        tag: "ContactCaptureStart",
                        outputSpeech: {
                            // It concatenates the ContactCaptureStart & FirstNameQuestionContent question
                            ssml: "<speak>Why hello!\n\nWhat is your name?</speak>",
                            displayText: "Why hello!\n\nWhat is your name?",
                        },
                        reprompt: {
                            ssml: '<speak>May I have your name?</speak>',
                            displayText: 'May I have your name?'
                        }
                    });

                    // verity necessary context is created
                    const sessionStore = context.storage.sessionStore?.data;
                    const slots = sessionStore ? sessionStore[CONTACT_CAPTURE_SLOTS] : undefined;
                    expect(slots).to.deep.equal({});
                    const leadSent = sessionStore ? sessionStore[CONTACT_CAPTURE_SENT] : undefined;
                    expect(leadSent).to.be.undefined;
                    const previousType = sessionStore ? sessionStore[CONTACT_CAPTURE_CURRENT_DATA] : undefined;
                    expect(previousType).to.equal("FIRST_NAME");
                    const list = sessionStore ? sessionStore[CONTACT_CAPTURE_LIST] : undefined;
                    // the length is the number of TRUE fields we are trying to capture
                    expect(list.data).to.have.length(5);
                    expect(list.lastModifiedMs).to.be.a("number");
                });
            });
            describe("for a request without the necessary content", () => {
                const sandbox = sinon.createSandbox();
                beforeEach(() => {
                    response = new ResponseBuilder({
                        device: {
                            audioSupported: false,
                            channel: "test",
                            canPlayAudio: false,
                            canPlayVideo: false,
                            canSpeak: false,
                            canThrowCard: false,
                            canTransferCall: false,
                            hasScreen: true,
                            hasWebBrowser: true,
                            videoSupported: false
                        }
                    });
                    sandbox.spy(response, "respond");

                    request = new IntentRequestBuilder()
                        .withSlots({
                            "first_name": {
                                value: "Michael",
                                name: "first_name"
                            }
                        })
                        .withIntentId(props.intentId)
                        .updateDevice({
                            canSpeak: false
                        }).build();

                    context = new ContextBuilder()
                        .withResponse(response)
                        .withSessionData({
                            id: "foo",
                            data: {
                                ContactCaptureCurrentData: "FIRST_NAME",
                                ContactCaptureSlots: {},
                                ContactCaptureList: {
                                    data: [{
                                        type: 'FIRST_NAME',
                                        enums: undefined,
                                        questionContentKey: 'FirstNameQuestionContent',
                                        slotName: 'first_name'
                                    },
                                    {
                                        type: 'LAST_NAME',
                                        enums: undefined,
                                        questionContentKey: 'LastNameQuestionContent',
                                        slotName: 'last_name'
                                    },]
                                }
                            }
                        })
                        .build();
                });
                afterEach(() => {
                    sandbox.restore();
                })
                it("returns the error response", async () => {
                    cc = new ContactCaptureHandler(props);

                    await cc.handleRequest(request, context);

                    expect(response.respond).to.have.been.calledOnce;
                    expect(response.respond).to.have.been.calledWith({
                        outputSpeech: {
                            displayText: 'ERROR: I am not configured correctly. Missing content for tag LastNameQuestionContent',
                            ssml: '<speak>ERROR: I am not configured correctly. Missing content for tag LastNameQuestionContent</speak>'
                        },
                        tag: 'ERROR'
                    });

                    const sessionStore = context.storage.sessionStore?.data;
                    const slots = sessionStore ? sessionStore[CONTACT_CAPTURE_SLOTS] : undefined;
                    expect(slots).to.deep.equal({
                        "first_name": {
                            name: "first_name",
                            value: "Michael"
                        },
                        "full_name": {
                            name: "full_name",
                            value: "Michael"
                        }
                    });
                    const leadSent = sessionStore ? sessionStore[CONTACT_CAPTURE_SENT] : undefined;
                    expect(leadSent).to.be.undefined;
                    const previousType = sessionStore ? sessionStore[CONTACT_CAPTURE_CURRENT_DATA] : undefined;
                    expect(previousType).to.equal("LAST_NAME");
                });
            });
            describe("for a request that takes any customer response", () => {
                describe("and we have the provided slot", () => {
                    const sandbox = sinon.createSandbox();
                    beforeEach(() => {
                        response = new ResponseBuilder({
                            device: {
                                audioSupported: false,
                                channel: "test",
                                canPlayAudio: false,
                                canPlayVideo: false,
                                canSpeak: false,
                                canThrowCard: false,
                                canTransferCall: false,
                                hasScreen: true,
                                hasWebBrowser: true,
                                videoSupported: false
                            }
                        });
                        sandbox.spy(response, "respond");

                        request = new IntentRequestBuilder()
                            .withSlots({
                                "organization": {
                                    name: "organization",
                                    value: "XAPP AI"
                                }
                            })
                            .withIntentId(propsWithAnyInputQuestion.intentId)
                            .updateDevice({
                                canSpeak: false
                            }).build();

                        context = new ContextBuilder()
                            .withResponse(response)
                            .withSessionData({
                                id: "foo",
                                data: {
                                    ContactCaptureCurrentData: "ORGANIZATION",
                                    ContactCaptureSlots: {},
                                    ContactCaptureList: {
                                        data: [
                                            {
                                                type: 'FIRST_NAME',
                                                enums: undefined,
                                                questionContentKey: 'FirstNameQuestionContent',
                                                slotName: 'first_name'
                                            },
                                            {
                                                type: 'ORGANIZATION',
                                                enums: undefined,
                                                questionContentKey: 'OrganizationQuestionContent',
                                                slotName: 'organization'
                                            }
                                        ]
                                    }
                                }
                            })
                            .build();
                    });
                    afterEach(() => {
                        sandbox.restore();
                    });
                    it("sets the slot as the value", async () => {

                        cc = new ContactCaptureHandler(propsWithAnyInputQuestion);

                        await cc.handleRequest(request, context);

                        // verity necessary context is created
                        const sessionStore = context.storage.sessionStore?.data;
                        const slots = sessionStore ? sessionStore[CONTACT_CAPTURE_SLOTS] : undefined;
                        expect(slots).to.deep.equal({
                            "organization": {
                                name: "organization",
                                value: "XAPP AI"
                            }
                        });
                        const leadSent = sessionStore ? sessionStore[CONTACT_CAPTURE_SENT] : undefined;
                        expect(leadSent).to.be.undefined;
                        const previousType = sessionStore ? sessionStore[CONTACT_CAPTURE_CURRENT_DATA] : undefined;
                        expect(previousType).to.equal("FIRST_NAME");
                        const list = sessionStore ? sessionStore[CONTACT_CAPTURE_LIST] : undefined;
                        // the length is the number of TRUE fields we are trying to capture
                        expect(list.data).to.have.length(2);

                        const orgData = list.data[1];
                        expect(orgData.collectedValue).to.equal("XAPP AI");
                    });
                });
                describe("and we don't have the provided slot", () => {
                    const sandbox = sinon.createSandbox();
                    beforeEach(() => {
                        response = new ResponseBuilder({
                            device: {
                                audioSupported: false,
                                channel: "test",
                                canPlayAudio: false,
                                canPlayVideo: false,
                                canSpeak: false,
                                canThrowCard: false,
                                canTransferCall: false,
                                hasScreen: true,
                                hasWebBrowser: true,
                                videoSupported: false
                            }
                        });
                        sandbox.spy(response, "respond");

                        request = new IntentRequestBuilder()
                            .withSlots({})
                            .withIntentId("OCSearch")
                            .withRawQuery("i work at XAPP AI")
                            .build();

                        context = new ContextBuilder()
                            .withResponse(response)
                            .withSessionData({
                                id: "foo",
                                data: {
                                    ContactCaptureCurrentData: "ORGANIZATION",
                                    ContactCaptureSlots: {},
                                    ContactCaptureList: {
                                        data: [{
                                            type: 'FIRST_NAME',
                                            enums: undefined,
                                            questionContentKey: 'FirstNameQuestionContent',
                                            slotName: 'first_name'
                                        },
                                        {
                                            type: 'ORGANIZATION',
                                            enums: undefined,
                                            questionContentKey: 'OrganizationQuestionContent',
                                            slotName: 'organization',
                                            acceptAnyInput: true,
                                        },
                                        {
                                            type: "MESSAGE",
                                            enums: undefined,
                                            questionContentKey: 'MessageQuestionContent',
                                            slotName: 'message',
                                            acceptAnyInput: true,
                                        }
                                        ]
                                    }
                                }
                            })
                            .build();
                    });
                    afterEach(() => {
                        sandbox.restore();
                    });
                    it("sets the slot as the value", async () => {

                        cc = new ContactCaptureHandler(propsWithAnyInputQuestion);

                        await cc.handleRequest(request, context);

                        // verity necessary context is created
                        const sessionStore = context.storage.sessionStore?.data;
                        const slots = sessionStore ? sessionStore[CONTACT_CAPTURE_SLOTS] : undefined;
                        expect(slots).to.deep.equal({});
                        const leadSent = sessionStore ? sessionStore[CONTACT_CAPTURE_SENT] : undefined;
                        expect(leadSent).to.be.undefined;
                        const previousType = sessionStore ? sessionStore[CONTACT_CAPTURE_CURRENT_DATA] : undefined;
                        expect(previousType).to.equal("FIRST_NAME");
                        const list = sessionStore ? sessionStore[CONTACT_CAPTURE_LIST] : undefined;
                        // the length is the number of TRUE fields we are trying to capture
                        expect(list.data).to.have.length(3);

                        const orgData = list.data[1];
                        expect(orgData.collectedValue).to.equal("i work at XAPP AI");

                        const messageData = list.data[2];
                        expect(messageData.collectedValue).to.be.undefined;
                    });
                });
            });
            describe("with a knowledgebase request", () => {
                const sandbox = sinon.createSandbox();
                beforeEach(() => {
                    response = new ResponseBuilder({
                        device: {
                            audioSupported: false,
                            channel: "test",
                            canPlayAudio: false,
                            canPlayVideo: false,
                            canSpeak: false,
                            canThrowCard: false,
                            canTransferCall: false,
                            hasScreen: true,
                            hasWebBrowser: true,
                            videoSupported: false
                        }
                    });
                    sandbox.spy(response, "respond");

                    const kbResult: KnowledgeBaseResult = {
                        faqs: [
                            {
                                question: "What is your favorite color?",
                                document: "Blue!"
                            }
                        ]
                    };

                    request = new IntentRequestBuilder()
                        .withSlots({})
                        .withIntentId("OCSearch")
                        .withRawQuery("what is your favorite color?")
                        .withKnowledgeBaseResult(kbResult)
                        .build();

                    context = new ContextBuilder()
                        .withResponse(response)
                        .withSessionData({
                            id: "foo",
                            data: {
                                ['knowledge_base_result']: kbResult,
                                ContactCaptureCurrentData: "ORGANIZATION",
                                ContactCaptureSlots: {},
                                ContactCaptureList: {
                                    data: [
                                        {
                                            type: 'FIRST_NAME',
                                            enums: undefined,
                                            questionContentKey: 'FirstNameQuestionContent',
                                            slotName: 'first_name'
                                        },
                                        {
                                            type: 'ORGANIZATION',
                                            enums: undefined,
                                            questionContentKey: 'OrganizationQuestionContent',
                                            slotName: 'organization',
                                            collectedValue: "XAPP AI"
                                        }
                                    ]
                                }
                            },

                        })
                        .build();
                });
                afterEach(() => {
                    sandbox.restore();
                });
                it("returns the initial response with the aside", async () => {

                    cc = new ContactCaptureHandler(props);

                    await cc.handleRequest(request, context);

                    expect(response.respond).to.have.been.calledTwice;
                    // first call is getting the FAQ response
                    expect(response.respond).to.have.been.calledWith(
                        {
                            name: 'FAQ',
                            tag: 'KB_TOP_FAQ',
                            outputSpeech: {
                                ssml: '<speak>Blue!</speak>',
                                displayText: 'Blue!'
                            },
                            conditions: "!!session('TOP_FAQ')"
                        }
                    );
                    // second call is when we concatenate it
                    expect(response.respond).to.have.been.calledWith(
                        {
                            name: "First Name",
                            tag: "FirstNameQuestionContent",
                            outputSpeech: {
                                // It concatenates the FAQ and the first name question
                                ssml: '<speak>Blue!\n\nMay I have your name?</speak>',
                                displayText: 'Blue!\n\nMay I have your name?',
                            },
                            reprompt: {
                                ssml: '<speak>May I have your name?</speak>',
                                displayText: 'May I have your name?'
                            },
                            displays: undefined
                        }
                    );

                    // verity necessary context is created
                    const sessionStore = context.storage.sessionStore?.data;
                    const slots = sessionStore ? sessionStore[CONTACT_CAPTURE_SLOTS] : undefined;
                    expect(slots).to.deep.equal({});
                    const leadSent = sessionStore ? sessionStore[CONTACT_CAPTURE_SENT] : undefined;
                    expect(leadSent).to.be.undefined;
                    const previousType = sessionStore ? sessionStore[CONTACT_CAPTURE_CURRENT_DATA] : undefined;
                    expect(previousType).to.equal("FIRST_NAME");
                    const list = sessionStore ? sessionStore[CONTACT_CAPTURE_LIST] : undefined;
                    // the length is the number of TRUE fields we are trying to capture
                    expect(list.data).to.have.length(2);
                });
                describe("that uses the default response", () => {
                    beforeEach(() => {
                        response = new ResponseBuilder({
                            device: {
                                audioSupported: false,
                                channel: "test",
                                canPlayAudio: false,
                                canPlayVideo: false,
                                canSpeak: false,
                                canThrowCard: false,
                                canTransferCall: false,
                                hasScreen: true,
                                hasWebBrowser: true,
                                videoSupported: false
                            }
                        });
                        sandbox.spy(response, "respond");

                        const kbResult: KnowledgeBaseResult = {
                            faqs: [],
                            generated: [
                                {
                                    title: "Answer",
                                    generated: "This is the answer.",
                                    document: "This is the answer.",
                                    type: "retrieval-augmented-generation",
                                    hasAnswer: true
                                }
                            ]
                        };

                        request = new IntentRequestBuilder()
                            .withSlots({})
                            .withIntentId("OCSearch")
                            .withRawQuery("what is your favorite color?")
                            .withKnowledgeBaseResult(kbResult)
                            .build();

                        context = new ContextBuilder()
                            .withResponse(response)
                            .withSessionData({
                                id: "foo",
                                data: {
                                    ['knowledge_base_result']: kbResult,
                                    ContactCaptureCurrentData: "ORGANIZATION",
                                    ContactCaptureSlots: {},
                                    ContactCaptureList: {
                                        data: [
                                            {
                                                type: 'FIRST_NAME',
                                                enums: undefined,
                                                questionContentKey: 'FirstNameQuestionContent',
                                                slotName: 'first_name'
                                            },
                                            {
                                                type: 'ORGANIZATION',
                                                enums: undefined,
                                                questionContentKey: 'OrganizationQuestionContent',
                                                slotName: 'organization',
                                                collectedValue: "XAPP AI"
                                            }
                                        ]
                                    }
                                },
                            })
                            .build();
                    });
                    it("returns the initial response with the aside", async () => {

                        cc = new ContactCaptureHandler(props);

                        await cc.handleRequest(request, context);

                        expect(response.respond).to.have.been.calledTwice;
                        // first call is getting the FAQ response
                        expect(response.respond).to.have.been.calledWith(
                            {
                                outputSpeech: {
                                    displayText: 'This is the answer.',
                                    ssml: '<speak>This is the answer.</speak>',
                                    suggestions: []
                                },
                                reprompt: { displayText: '', ssml: '<speak></speak>' },
                                displays: [],
                                tag: 'KB_RAG',
                            }
                        );
                        // second call is when we concatenate it
                        expect(response.respond).to.have.been.calledWith(
                            {
                                name: "First Name",
                                tag: "FirstNameQuestionContent",
                                outputSpeech: {
                                    // It concatenates the FAQ and the first name question
                                    ssml: '<speak>This is the answer.\n\nMay I have your name?</speak>',
                                    displayText: 'This is the answer.\n\nMay I have your name?',
                                    suggestions: []
                                },
                                reprompt: {
                                    ssml: '<speak>May I have your name?</speak>',
                                    displayText: 'May I have your name?'
                                },
                                displays: []
                            }
                        );

                        // verity necessary context is created
                        const sessionStore = context.storage.sessionStore?.data;
                        const slots = sessionStore ? sessionStore[CONTACT_CAPTURE_SLOTS] : undefined;
                        expect(slots).to.deep.equal({});
                        const leadSent = sessionStore ? sessionStore[CONTACT_CAPTURE_SENT] : undefined;
                        expect(leadSent).to.be.undefined;
                        const previousType = sessionStore ? sessionStore[CONTACT_CAPTURE_CURRENT_DATA] : undefined;
                        expect(previousType).to.equal("FIRST_NAME");
                        const list = sessionStore ? sessionStore[CONTACT_CAPTURE_LIST] : undefined;
                        // the length is the number of TRUE fields we are trying to capture
                        expect(list.data).to.have.length(2);
                    });
                })
            });
            describe("when request completes the data required", () => {
                const sandbox = sinon.createSandbox();

                beforeEach(() => {
                    response = new ResponseBuilder({
                        device: {
                            audioSupported: false,
                            channel: "test",
                            canPlayAudio: false,
                            canPlayVideo: false,
                            canSpeak: false,
                            canThrowCard: false,
                            canTransferCall: false,
                            hasScreen: true,
                            hasWebBrowser: true,
                            videoSupported: false
                        }
                    });
                    sandbox.spy(response, "respond");

                    request = new IntentRequestBuilder()
                        .withSlots({
                            "first_name": {
                                value: "Michael",
                                name: "first_name"
                            },
                            "last_name": {
                                value: "Myers",
                                name: "last_name"
                            },
                            "phone_number": {
                                name: "phone_number",
                                value: "123-456-7777"
                            }
                        })
                        .withIntentId(props.intentId)
                        .updateDevice({
                            canSpeak: false
                        }).build();

                    context = new ContextBuilder()
                        .withResponse(response)
                        .withSessionData({
                            id: "foo",
                            data: {
                                ContactCaptureCurrentData: "FIRST_NAME",
                                ContactCaptureSlots: {},
                                ContactCaptureList: {
                                    data: [{
                                        type: 'FIRST_NAME',
                                        enums: undefined,
                                        questionContentKey: 'FirstNameQuestionContent',
                                        slotName: 'first_name'
                                    },
                                    {
                                        type: 'LAST_NAME',
                                        enums: undefined,
                                        questionContentKey: 'LastNameQuestionContent',
                                        slotName: 'last_name'
                                    },
                                    {
                                        type: "PHONE",
                                        enums: undefined,
                                        questionContentKey: 'PhoneQuestionContent',
                                        slotName: "phone_number"
                                    }
                                    ]
                                }
                            }
                        })
                        .build();

                    crmService = new MockCRM();

                    sandbox.spy(crmService, "send");

                    context.services.crmService = crmService;
                });
                afterEach(() => {
                    sandbox.restore();
                });
                it("calls the CRMService.send function", async () => {
                    cc = new ContactCaptureHandler(props);
                    cc.data.crmFlags = { foo: 3 };

                    await cc.handleRequest(request, context);
                    expect(crmService.send).to.have.been.calledOnce;
                    expect(crmService.send).to.have.been.calledWith({
                        fields: [
                            { name: 'FIRST_NAME', value: 'Michael' },
                            { name: 'LAST_NAME', value: 'Myers' },
                            { name: 'PHONE', value: '123-456-7777' },
                            { name: 'PHONE_NUMBER', value: '123-456-7777' },
                            { name: 'FULL_NAME', value: 'Michael Myers' }
                        ],
                        transcript: [],
                        refId: undefined,
                        userId: "userId",
                        sessionId: "sessionId",
                        source: "stentor"
                    }, {
                        source: 'unknown',
                        currentUrl: undefined,
                        externalId: 'sessionId',
                        crmFlags: { foo: 3 },
                        isAbandoned: false
                    });

                    const sessionStore = context.storage.sessionStore?.data;
                    const leadSent = sessionStore ? sessionStore[CONTACT_CAPTURE_SENT] : undefined;
                    expect(leadSent).to.be.true;
                });
                describe("when SEND_LEAD is set to false", () => {
                    beforeEach(() => {
                        process.env.SEND_LEAD = "false";
                    });
                    afterEach(() => {
                        delete process.env.SEND_LEAD;
                    });
                    it("doesn't send the lead", async () => {
                        cc = new ContactCaptureHandler(props);
                        await cc.handleRequest(request, context);
                        expect(crmService.send).to.have.not.been.called;
                    });
                })
            });
            describe("after a lead has been sent", () => {
                const sandbox = sinon.createSandbox();
                let crmService: CrmService;
                beforeEach(() => {
                    response = new ResponseBuilder({
                        device: {
                            audioSupported: false,
                            channel: "test",
                            canPlayAudio: false,
                            canPlayVideo: false,
                            canSpeak: false,
                            canThrowCard: false,
                            canTransferCall: false,
                            hasScreen: true,
                            hasWebBrowser: true,
                            videoSupported: false
                        }
                    });
                    sandbox.spy(response, "respond");

                    request = new IntentRequestBuilder()
                        .withSlots({
                            "first_name": {
                                value: "Michael",
                                name: "first_name"
                            },
                            "last_name": {
                                value: "Myers",
                                name: "last_name"
                            },
                            "phone_number": {
                                name: "phone_number",
                                value: "123-456-7777"
                            }
                        })
                        .withIntentId(
                            "Thanks"
                        )
                        .updateDevice({
                            canSpeak: false
                        }).build();

                    context = new ContextBuilder()
                        .withResponse(response)
                        .withSessionData({
                            id: "foo",
                            data: {
                                ContactCaptureCurrentData: "FIRST_NAME",
                                ContactCaptureLeadSent: true,
                                ContactCaptureSlots: {},
                                ContactCaptureList: {
                                    data: [{
                                        type: 'FIRST_NAME',
                                        enums: undefined,
                                        questionContentKey: 'FirstNameQuestionContent',
                                        slotName: 'first_name'
                                    },
                                    {
                                        type: 'LAST_NAME',
                                        enums: undefined,
                                        questionContentKey: 'LastNameQuestionContent',
                                        slotName: 'last_name'
                                    },
                                    {
                                        type: "PHONE",
                                        enums: undefined,
                                        questionContentKey: 'PhoneQuestionContent',
                                        slotName: "phone_number"
                                    }
                                    ]
                                }
                            }
                        })
                        .build();

                    crmService = new MockCRM();

                    sandbox.spy(crmService, "send");

                    context.services.crmService = crmService;
                });
                afterEach(() => {
                    sandbox.restore();
                });
                it("communicates we have all the info we need", async () => {
                    cc = new ContactCaptureHandler(props);
                    await cc.handleRequest(request, context);
                    expect(crmService.send).to.have.not.been.called;

                    expect(response.respond).to.have.been.calledOnce;
                    expect(response.respond).to.have.been.calledWith({
                        outputSpeech: { ssml: '<speak>No Problem</speak>', displayText: 'No problem' },
                        name: 'No Problem'
                    });
                });
            });
        });
        describe("with captureLead set to false", () => {
            const sandbox = sinon.createSandbox();
            beforeEach(() => {
                response = new ResponseBuilder({
                    device: {
                        audioSupported: false,
                        channel: "test",
                        canPlayAudio: false,
                        canPlayVideo: false,
                        canSpeak: false,
                        canThrowCard: false,
                        canTransferCall: false,
                        hasScreen: true,
                        hasWebBrowser: true,
                        videoSupported: false
                    }
                });
                sandbox.spy(response, "respond");

                request = new IntentRequestBuilder()
                    .withSlots({})
                    .withIntentId(props.intentId)
                    .updateDevice({
                        canSpeak: false
                    }).build();

                context = new ContextBuilder()
                    .withResponse(response)
                    .withSessionData({ id: "foo", data: {} })
                    .build();

                placesService = new MockPlacesService();
                sandbox.spy(placesService, "getDetails");
            });
            afterEach(() => {
                sandbox.restore();
            });
            describe("with content available", () => {
                /** User has set content with appropriate tag */
                it("returns as expected", async () => {

                    const handler = new ContactCaptureHandler(propsWithNoCaptureAndContent);

                    await handler.handleRequest(request, context);

                    expect(response.respond).to.have.been.calledOnce;
                    expect(response.respond).to.have.been.calledWith({
                        outputSpeech: { displayText: 'Please call us ASAP!', ssml: '<speak></speak>' },
                        name: 'No Capture',
                        tag: "ContactCaptureNoCaptureStart"
                    });
                });
            });
            describe("with places and placesservice", () => {
                it("returns as expected", async () => {

                    const props = { ...propsWithNoCapture };

                    if (props.data) {
                        props.data.places = [{ placeId: "place_id" }];
                        props.data.placeService = placesService;
                    }

                    const handler = new ContactCaptureHandler(props);

                    await handler.handleRequest(request, context);


                    expect(placesService.getDetails).to.have.been.calledOnce;

                    expect(response.respond).to.have.been.calledOnce;
                    expect(response.respond).to.have.been.calledWith({
                        outputSpeech: {
                            displayText: 'We can help with that, it is best to give us a call at 111-123-3333 to continue the conversation.',
                            ssml: '<speak></speak>'
                        },
                        name: 'No Capture with Number',
                        tag: "ContactCaptureNoCaptureStart"
                    });
                });
            });
            describe("without places", () => {
                it("returns as expected", async () => {
                    const props = { ...propsWithNoCapture };

                    if (props.data) {
                        delete props.data.places;
                        props.data.placeService = placesService;
                    }

                    const handler = new ContactCaptureHandler(props);

                    await handler.handleRequest(request, context);

                    expect(placesService.getDetails).to.have.been.not.been.called;

                    expect(response.respond).to.have.been.calledOnce;
                    expect(response.respond).to.have.been.calledWith({
                        name: 'No Capture',
                        tag: 'ContactCaptureNoCaptureStart',
                        outputSpeech: {
                            displayText: 'We can help with that, please contact us to continue the conversation.',
                            ssml: '<speak></speak>'
                        },
                        displays: []
                    });
                });
            });
            describe("with a Knowledgebase request", () => {
                it("returns as expected", async () => {

                    const handler = new ContactCaptureHandler(propsWithNoCaptureAndContent);

                    const kbResult: KnowledgeBaseResult = {
                        faqs: [
                            {
                                question: "What is your favorite color?",
                                document: "Blue!"
                            }
                        ]
                    };

                    request = new IntentRequestBuilder()
                        .withSlots({})
                        .withIntentId("OCSearch")
                        .withRawQuery("what is your favorite color?")
                        .withKnowledgeBaseResult(kbResult)
                        .build();

                    context = new ContextBuilder()
                        .withResponse(response)
                        .withSessionData({
                            id: "foo",
                            data: {
                                ['knowledge_base_result']: kbResult,
                                ContactCaptureCurrentData: "ORGANIZATION",
                                ContactCaptureSlots: {},
                                ContactCaptureList: {
                                    data: [
                                        {
                                            type: 'FIRST_NAME',
                                            enums: undefined,
                                            questionContentKey: 'FirstNameQuestionContent',
                                            slotName: 'first_name'
                                        },
                                        {
                                            type: 'ORGANIZATION',
                                            enums: undefined,
                                            questionContentKey: 'OrganizationQuestionContent',
                                            slotName: 'organization',
                                            collectedValue: "XAPP AI"
                                        }
                                    ]
                                }
                            },

                        })
                        .build();

                    await handler.handleRequest(request, context);

                    expect(response.respond).to.have.been.calledTwice;
                    expect(response.respond).to.have.been.calledWith({
                        name: 'No Capture',
                        tag: "ContactCaptureNoCaptureStart",
                        outputSpeech: {
                            ssml: '<speak>Blue!</speak>',
                            displayText: 'Blue!\n\nPlease call us ASAP!'
                        },
                        reprompt: undefined,
                        displays: undefined
                    });
                });
            });
        });
    });
});