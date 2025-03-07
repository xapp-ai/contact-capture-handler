/*! Copyright (c) 2022, XAPP AI */
import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";

chai.use(sinonChai);
const expect = chai.expect;

import {
    Context,
    CrmResponse,
    CrmService,
    CrmServiceAvailability,
    DateTimeRange,
    ErrorEvent,
    ErrorService,
    IntentRequest,
    KnowledgeBaseResult,
} from "stentor-models";
import { IntentRequestBuilder } from "stentor-request";
import { ResponseBuilder, } from "stentor-response";
import { ContextBuilder } from "stentor-context";

import { ContactCaptureHandler } from "../handler";
import { CONTACT_CAPTURE_CURRENT_DATA, CONTACT_CAPTURE_LIST, CONTACT_CAPTURE_SENT, CONTACT_CAPTURE_SLOTS } from "../constants";
import { DetailParams, Place, PlacesService, SearchParams } from "../services";

import { props, propsWithAnyInputQuestion, propsWithCustomForm, propsWithNoCapture, propsWithNoCaptureAndContent, propsWithStandardData } from "./assets";

class MockCRM implements CrmService {
    public update?(): Promise<CrmResponse> {
        throw new Error("Method not implemented.");
    }
    public async getAvailability(range: DateTimeRange): Promise<CrmServiceAvailability> {
        // throw new Error("Method not implemented.");
        return {
            range,
            unavailabilities: [],
        };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public getJobType(): Promise<any> {
        throw new Error("Method not implemented.");
    }
    public async send(): Promise<CrmResponse> {
        return {
            status: "Success"
        };
    }
}

class MockPlacesService implements PlacesService {
    public async search(params: SearchParams): Promise<Place[]> {
        // eslint-disable-next-line no-console
        console.log(`MockPlacesService.search(${JSON.stringify(params)})`);
        return [{ place_id: "place_id" }];
    }
    public async getDetails(params: DetailParams): Promise<Place> {
        // eslint-disable-next-line no-console
        console.log(`MockPlacesService.getDetails(${JSON.stringify(params)})`);
        return { place_id: "place_id", formatted_phone_number: "111-123-3333" }
    }
}

class MockErrorService implements ErrorService {
    error(error: Error): ErrorEvent {
        throw error;
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
    describe(`#${ContactCaptureHandler.sendLead.name}()`, () => {
        const sandbox = sinon.createSandbox();

        afterEach(() => {
            sandbox.restore();
        });
        describe("for a request with tracking", () => {
            it("adds it to the extras", () => {

                const request = new IntentRequestBuilder().withAttributes({
                    rwg_token: "123",
                    merchant_id: "456"
                }).build();

                const crmService = new MockCRM();
                sandbox.spy(crmService, "send");

                ContactCaptureHandler.sendLead(
                    {},
                    {},
                    { data: [] },
                    [],
                    crmService,
                    request,
                    new MockErrorService()
                );

                expect(crmService.send).to.have.been.calledOnce;
                expect(crmService.send).to.have.been.calledWith({
                    fields: [],
                    transcript: [],
                    refId: undefined,
                    jobTypeId: undefined,
                    availabilityClassId: undefined,
                    userId: "userId",
                    sessionId: "sessionId",
                    source: "stentor"
                }, {
                    rwg_token: "123",
                    merchant_id: "456",
                });
            });
        })
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
                    expect(response.respond).to.have.been.calledWithMatch({
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
                });
                it("returns default response", async () => {
                    cc = new ContactCaptureHandler(props);

                    await cc.handleRequest(request, context);

                    expect(response.respond).to.have.been.calledOnce;

                    // get the first argument of the first call
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    const responseArgs = response.respond.getCall(0).args[0];
                    expect(responseArgs).to.exist;
                    expect(responseArgs).to.deep.equal({
                        outputSpeech: {
                            ssml: '<speak>What is your last name?</speak>',
                            displayText: 'What is your last name?'
                        },
                        reprompt: {
                            ssml: '<speak>May I have your last name?</speak>',
                            displayText: 'May I have your last name?'
                        },
                        context: {
                            active: [
                                {
                                    name: "expecting_name",
                                    parameters: null,
                                    timeToLive: {
                                        timeToLiveInSeconds: 2000,
                                        turnsToLive: 1
                                    }
                                }
                            ]
                        },
                        name: 'Last Name',
                        tag: 'LastNameQuestionContent'
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
                describe("with default responses turned off", () => {
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

                        process.env.DISABLE_DEFAULT_RESPONSES = "true";
                    });
                    afterEach(() => {
                        process.env.DISABLE_DEFAULT_RESPONSES = undefined;
                        sandbox.restore();
                    });
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
                                    generated: "This is the answer.  Anything else I can help with?",
                                    document: "This is the answer.  Anything else I can help with?",
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
                        // it is later cleaned up and is concatenated with the contact info request
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
                        jobTypeId: undefined,
                        availabilityClassId: undefined,
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
        describe("for a form request", () => {
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

                request.channel = "form-widget";

                context = new ContextBuilder()
                    .withResponse(response)
                    .withSessionData({ id: "foo", data: {} })
                    .build();

                const crmService = new MockCRM();
                sandbox.spy(crmService, "send");
                context.services.crmService = crmService;

                placesService = new MockPlacesService();
                sandbox.spy(placesService, "getDetails");
            });
            afterEach(() => {
                sandbox.restore();
            });
            describe("with enableScheduling set to true", () => {
                it("returns the custom form", async () => {
                    const handler = new ContactCaptureHandler(propsWithCustomForm);

                    await handler.handleRequest(request, context);

                    expect(response.respond).to.have.been.calledOnce;

                    // pull off the first call
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    const args = response.respond.getCall(0).args[0];

                    expect(args.tag).to.equal("FORM");
                    expect(args.displays).to.have.length(1);
                    expect(args.displays[0].type).to.equal("FORM");
                    expect(args.displays[0].name).to.equal("main");
                    expect(args.displays[0].header).to.have.length(2);
                    expect(args.displays[0].steps).to.have.length(2);
                });
            });
            describe("with enableScheduling set to false", () => {
                it("returns the default form", async () => {
                    const handler = new ContactCaptureHandler({
                        ...propsWithCustomForm,
                        data: {
                            ...propsWithCustomForm.data,
                            enableFormScheduling: false,
                            capture: {
                                data: []
                            }
                        }
                    });

                    await handler.handleRequest(request, context);

                    expect(response.respond).to.have.been.calledOnce;

                    // pull off the first call
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    const args = response.respond.getCall(0).args[0];

                    expect(args.tag).to.equal("FORM");
                    expect(args.displays).to.have.length(1);
                    expect(args.displays[0].type).to.equal("FORM");
                    expect(args.displays[0].name).to.equal("contact_us_only");

                    // first step is contact info
                    const fields = args.displays[0].steps[0].fields;

                    expect(fields).to.have.length(3);
                    const name = fields[0];
                    expect(name.type).to.equal("TEXT");
                    expect(name.mandatory).to.be.true;

                    const phone = fields[1];
                    expect(phone.format).to.equal("PHONE");
                    expect(phone.mandatory).to.be.true;

                    const message = fields[2];
                    expect(message.type).to.equal("TEXT");
                    expect(message.multiline).to.be.true;
                });
                describe("with lead data list already", () => {
                    it("returns the correct form", async () => {
                        const handler = new ContactCaptureHandler({
                            ...propsWithCustomForm,
                            data: {
                                ...propsWithCustomForm.data,
                                enableFormScheduling: false,
                                capture: {
                                    data: [
                                        {
                                            "slotName": "email",
                                            "active": true,
                                            "type": "EMAIL",
                                            "required": true,
                                            "questionContentKey": "EmailQuestionContent"
                                        },
                                    ]
                                }
                            }
                        });

                        await handler.handleRequest(request, context);

                        expect(response.respond).to.have.been.calledOnce;

                        // pull off the first call
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        const args = response.respond.getCall(0).args[0];

                        expect(args.tag).to.equal("FORM");
                        expect(args.displays).to.have.length(1);
                        expect(args.displays[0].type).to.equal("FORM");
                        expect(args.displays[0].name).to.equal("contact_us_only");

                        // first step is contact info
                        const fields = args.displays[0].steps[0].fields;

                        expect(fields).to.have.length(3);
                        const name = fields[0];
                        expect(name.type).to.equal("TEXT");
                        expect(name.mandatory).to.be.true;

                        const email = fields[1];
                        expect(email.format).to.equal("EMAIL");
                        expect(email.mandatory).to.be.true;

                        const message = fields[2];
                        expect(message.type).to.equal("TEXT");
                        expect(message.multiline).to.be.true;
                    });
                });
                describe("with lead data list already in the session store", () => {
                    it("returns the preferred time form", async () => {
                        // testing a real example here that happened
                        const requestActual: IntentRequest = {
                            "platform": "stentor-platform",
                            "type": "INTENT_REQUEST",
                            "intentId": "LeadGeneration",
                            "channel": "form-widget",
                            "sessionId": "stentor-form-session-c7-a0dc-be059339ae99",
                            "userId": "373ef93a-620d9ab0df56",
                            "isNewSession": true,
                            "attributes": {
                                "environment": "production",
                                "origin": "rwg",
                                "rwg_token": "AJKvS9X5g9ljTvfooGv36kwEPIIH_mrNc_DrfYKsCWi90barrQLEZ5W3X6fECqYNiSqUDxyS2tI5A==",
                            },
                            "slots": {}
                        }

                        const contextActual: Context = new ContextBuilder()
                            .withResponse(response)
                            .withSessionData({
                                "data": {
                                    "ContactCaptureBusyDays": {
                                        "range": {},
                                        "unavailabilities": [
                                        ]
                                    },
                                    "ContactCaptureList": {
                                        "data": [
                                            {
                                                "questionContentKey": "FirstNameQuestionContent",
                                                "slotName": "first_name",
                                                "type": "FIRST_NAME"
                                            },
                                            {
                                                "questionContentKey": "LastNameQuestionContent",
                                                "slotName": "last_name",
                                                "type": "LAST_NAME"
                                            },
                                            {
                                                "questionContentKey": "PhoneQuestionContent",
                                                "slotName": "phone",
                                                "type": "PHONE"
                                            },
                                            {
                                                "questionContentKey": "AddressQuestionContent",
                                                "slotName": "address",
                                                "type": "ADDRESS"
                                            }
                                        ],
                                        "lastModifiedMs": 1732097435181
                                    },
                                    "ContactCaptureSlots": {},
                                    "current_handler": "LeadGeneration",
                                    "new_user": true,
                                    "previous_handler": "LeadGeneration",
                                    "slots": {},
                                    "unknownInputs": 0
                                },
                                "id": "stentor-form-session-c7-a0dc-be059339ae99",
                                "transcript": [
                                    {
                                        "createdTime": "2024-11-20T10:10:35.153Z",
                                        "from": {
                                            "id": "373ef93a-620d9ab0df56"
                                        },
                                        "message": "Request LeadGeneration",
                                        "to": [
                                            {
                                                "id": "bot"
                                            }
                                        ]
                                    }
                                ]
                            })
                            .build();

                        const handler = new ContactCaptureHandler({
                            ...propsWithStandardData,
                            data: {
                                ...propsWithStandardData.data,
                                enableFormScheduling: false,
                                enablePreferredTime: true,
                                captureLead: true,
                                capture: {
                                    data: []
                                }
                            }
                        });

                        await handler.handleRequest(requestActual, contextActual);

                        expect(response.respond).to.have.been.calledOnce;

                        // pull off the first call
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        const args = response.respond.getCall(0).args[0];

                        expect(args.tag).to.equal("FORM");
                        expect(args.displays).to.have.length(1);
                        expect(args.displays[0].type).to.equal("FORM");
                        expect(args.displays[0].name).to.equal("booking_preferred_time");
                    });
                });
            });
        });
    });
});