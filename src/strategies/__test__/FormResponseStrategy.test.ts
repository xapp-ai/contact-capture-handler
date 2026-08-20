/*! Copyright (c) 2026, XAPP AI */
import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";

import { Content, Context, CrmService, Handler, IntentRequest } from "stentor-models";
import { ContextBuilder } from "stentor-context";
import { IntentRequestBuilder } from "stentor-request";

import * as Constants from "../../constants";
import type { ContactCaptureData } from "../../data";
import { ContactCaptureHandler } from "../../handler";
import { FormResponseStrategy } from "../FormResponseStrategy";
import { isMultistepForm } from "../../guards";

chai.use(sinonChai);
const expect = chai.expect;

// Reproduces the production maga-plumbing handler payload: a ContactCapture
// handler where data has none of the form/capture fields the form-widget
// strategy expects (no capture, no captureLead, no forms, no CAPTURE_MAIN_FORM,
// no enableFormScheduling). The form-widget channel must still respond with a
// fallback form instead of throwing.
const PROPS_WITHOUT_CAPTURE: Handler<Content, ContactCaptureData> = {
    intentId: "LeadGeneration",
    type: "ContactCaptureHandler",
    appId: "maga-plumbing",
    organizationId: "surefire-local",
    content: {},
    data: {
        inputUnknownStrategy: "REPROMPT",
        chat: { followUp: " " },
    } as unknown as ContactCaptureData,
};

describe(`${FormResponseStrategy.name}`, () => {
    let handler: ContactCaptureHandler;
    let request: IntentRequest;
    let context: Context;

    describe("when handler data is missing capture/forms (form-widget first call)", () => {
        beforeEach(() => {
            handler = new ContactCaptureHandler(PROPS_WITHOUT_CAPTURE);
            request = new IntentRequestBuilder()
                .withSlots({})
                .withIntentId(PROPS_WITHOUT_CAPTURE.intentId)
                .build();
            request.isNewSession = true;

            context = new ContextBuilder().withSessionData({ id: "form-session", data: {} }).build();
            // Intentionally no crmService — exercises the no-availability path
        });

        it("does not throw", async () => {
            const strategy = new FormResponseStrategy();
            let threw: Error | undefined;
            try {
                await strategy.getResponse(handler, request, context);
            } catch (e) {
                threw = e as Error;
            }
            expect(threw, threw && threw.stack).to.be.undefined;
        });

        it("returns a multistep form response", async () => {
            const strategy = new FormResponseStrategy();
            const response = await strategy.getResponse(handler, request, context);
            expect(response).to.exist;
            const display = response.displays && response.displays[0];
            expect(display).to.exist;
            expect(isMultistepForm(display)).to.be.true;
        });
    });

    // Regression: on a second request the strategy short-circuits through
    // addAvailability's else branch where it tries to augment with CRM jobType.
    // With no crmService configured, that path used to crash on
    // crmService.getJobType.
    describe("when continuing a session with a message but no CRM service", () => {
        beforeEach(() => {
            handler = new ContactCaptureHandler(PROPS_WITHOUT_CAPTURE);
            request = new IntentRequestBuilder()
                .withSlots({})
                .withIntentId(PROPS_WITHOUT_CAPTURE.intentId)
                .build();
            request.isNewSession = false;
            request.attributes = {
                // Force the preferred-time form variant where contact_info is
                // a non-crmSubmit step, so the strategy short-circuits through
                // addAvailability instead of attempting to send the lead.
                enablePreferredTime: true,
                data: { step: "contact_info", form: "booking_preferred_time" },
            };

            context = new ContextBuilder()
                .withSessionData({
                    id: "form-session",
                    data: {
                        [Constants.CONTACT_CAPTURE_SLOTS]: {},
                        [Constants.CONTACT_CAPTURE_LIST]: {
                            data: [
                                {
                                    slotName: "message",
                                    type: "MESSAGE",
                                    collectedValue: "Need a quote on a water heater",
                                },
                            ],
                        },
                    },
                })
                .build();
            // Still intentionally no crmService
        });

        it("does not throw on the message-augmentation path", async () => {
            const strategy = new FormResponseStrategy();
            let threw: Error | undefined;
            try {
                await strategy.getResponse(handler, request, context);
            } catch (e) {
                threw = e as Error;
            }
            expect(threw, threw && threw.stack).to.be.undefined;
        });
    });

    // #663: the widget's availability settings (forceAvailabilityClass / jobTypeClasses) must reach
    // the CRM's job-type and availability calls, and a CRM rejection must not throw.
    describe("when a CRM service is configured and the handler carries availabilitySettings", () => {
        const settings = {
            forceAvailabilityClass: "drain-emergency",
            defaultAvailabilityClass: "standard",
            jobTypeClasses: [{ jobTypeId: "1043", classId: "drain-emergency" }],
        };

        let crmService: sinon.SinonStubbedInstance<Partial<CrmService>> & {
            getJobType: sinon.SinonStub;
            getAvailability: sinon.SinonStub;
        };

        // seedBusyDays: when set, the first-time branch of addAvailability is skipped and the
        // getJobType augmentation branch runs instead (that is where the settings/jobType plumbing
        // lives). Left unset, addAvailability takes the first-time getAvailability branch.
        const buildContext = (seedBusyDays: boolean): Context => {
            const data: Record<string, unknown> = {
                [Constants.CONTACT_CAPTURE_SLOTS]: {},
                [Constants.CONTACT_CAPTURE_LIST]: {
                    data: [
                        {
                            slotName: "message",
                            type: "MESSAGE",
                            collectedValue: "My drain is backed up",
                        },
                    ],
                },
            };
            if (seedBusyDays) {
                data[Constants.CONTACT_CAPTURE_BUSY_DAYS] = {
                    range: { start: null, end: null },
                    unavailabilities: [],
                };
            }
            const c = new ContextBuilder().withSessionData({ id: "form-session", data }).build();
            // No withServices() on ContextBuilder — inject the stub directly.
            (c.services as { crmService?: Partial<CrmService> }).crmService = crmService;
            return c;
        };

        beforeEach(() => {
            const props: Handler<Content, ContactCaptureData> = {
                ...PROPS_WITHOUT_CAPTURE,
                data: {
                    ...PROPS_WITHOUT_CAPTURE.data,
                    availabilitySettings: settings,
                } as unknown as ContactCaptureData,
            };
            handler = new ContactCaptureHandler(props);
            request = new IntentRequestBuilder()
                .withSlots({})
                .withIntentId(props.intentId)
                .build();
            request.isNewSession = false;
            request.attributes = {
                enablePreferredTime: true,
                data: { step: "contact_info", form: "booking_preferred_time" },
            };

            crmService = {
                getJobType: sinon.stub().resolves({ id: "1043", class: "drain-emergency" }),
                getAvailability: sinon.stub().resolves({ range: { start: null, end: null }, unavailabilities: [] }),
            } as never;
        });

        it("passes the handler's availabilitySettings into getJobType as the 3rd arg", async () => {
            context = buildContext(true);
            const strategy = new FormResponseStrategy();
            await strategy.getResponse(handler, request, context);

            expect(crmService.getJobType).to.have.been.calledOnce;
            const thirdArg = crmService.getJobType.firstCall.args[2];
            expect(thirdArg).to.deep.include({
                forceAvailabilityClass: "drain-emergency",
                jobTypeClasses: settings.jobTypeClasses,
            });
        });

        it("passes availabilitySettings through to getAvailability alongside the jobType", async () => {
            context = buildContext(true);
            const strategy = new FormResponseStrategy();
            await strategy.getResponse(handler, request, context);

            expect(crmService.getAvailability).to.have.been.called;
            const options = crmService.getAvailability.lastCall.args[1];
            expect(options).to.include({ forceAvailabilityClass: "drain-emergency" });
            expect(options.jobType).to.deep.equal({ id: "1043", class: "drain-emergency" });
        });

        it("does not throw when the first-time getAvailability rejects, and stores no busy days", async () => {
            crmService.getAvailability.rejects(new Error("CRM down"));
            context = buildContext(false); // first-time branch: getAvailability called directly
            const strategy = new FormResponseStrategy();

            let threw: Error | undefined;
            try {
                await strategy.getResponse(handler, request, context);
            } catch (e) {
                threw = e as Error;
            }
            expect(threw, threw && threw.stack).to.be.undefined;
            expect(context.session.get(Constants.CONTACT_CAPTURE_BUSY_DAYS)).to.not.exist;
        });

        it("does not throw when getJobType rejects, and skips the availability augmentation", async () => {
            crmService.getJobType.rejects(new Error("classifier down"));
            context = buildContext(true); // augmentation branch: getJobType is called
            const strategy = new FormResponseStrategy();

            let threw: Error | undefined;
            try {
                await strategy.getResponse(handler, request, context);
            } catch (e) {
                threw = e as Error;
            }
            expect(threw, threw && threw.stack).to.be.undefined;
            // getJobType failed, so no jobType-based availability refetch happened.
            expect(crmService.getAvailability).to.not.have.been.called;
        });
    });

    // #671: on the crmSubmit step of an externalBooking-enabled form, the strategy returns a
    // FORM_STEP_UPDATE carrying the partner config built from the SESSION-ACCUMULATED slots
    // (not the display-only submit-step payload), and still sends the lead exactly once.
    describe("external booking handoff on submit", () => {
        const EXTERNAL_BOOKING = {
            enabled: true,
            provider: "costguide" as const,
            advertiserId: 4944,
            campaignId: "6a283d45eddcf",
            campaignKey: "6YGTmNKxtjMDVkWPLwgC",
            // Single-trade contractor: resolves without a model call, so this stays a test of the
            // strategy's wiring rather than of the classifier (which has its own suite).
            allowedTrades: ["Roofing - Asphalt Install or Replace"],
        };

        let sendLead: sinon.SinonStub;

        const buildHandler = (externalBooking: unknown): ContactCaptureHandler =>
            new ContactCaptureHandler({
                ...PROPS_WITHOUT_CAPTURE,
                data: {
                    enableFormScheduling: true,
                    CAPTURE_MAIN_FORM: "main",
                    capture: { data: [] },
                    forms: [
                        {
                            type: "FORM",
                            name: "main",
                            steps: [
                                { name: "confirmation", crmSubmit: true, final: true, nextAction: "submit", fields: [] },
                            ],
                        },
                    ],
                    externalBooking,
                } as unknown as ContactCaptureData,
            });

        // Visitor data accumulated across earlier steps and persisted to the session, exactly as
        // handler.ts assembles it. The confirmation (crmSubmit) step itself is display-only.
        const buildContext = (): Context =>
            new ContextBuilder()
                .withSessionData({
                    id: "form-session",
                    data: {
                        [Constants.CONTACT_CAPTURE_SLOTS]: {
                            full_name: { name: "full_name", value: "Jane Doe" },
                            email: { name: "email", value: "jane@example.com" },
                            phone: { name: "phone", value: "5550000000" },
                            zip: { name: "zip", value: "17002" },
                            help_type: { name: "help_type", value: "roofing" },
                        },
                        [Constants.CONTACT_CAPTURE_LIST]: { data: [] },
                    },
                })
                .build();

        const buildRequest = (): IntentRequest => {
            const r = new IntentRequestBuilder().withSlots({}).withIntentId(PROPS_WITHOUT_CAPTURE.intentId).build();
            r.isNewSession = false;
            // Display-only submit-step payload: no contact fields here.
            r.attributes = { data: { step: "confirmation", form: "main", result: {} } };
            return r;
        };

        beforeEach(() => {
            sendLead = sinon.stub(ContactCaptureHandler, "sendLead").resolves({ success: true, id: "lead-123" } as never);
        });

        afterEach(() => {
            sendLead.restore();
        });

        it("returns a FORM_STEP_UPDATE built from accumulated slots, and sends the lead once", async () => {
            handler = buildHandler(EXTERNAL_BOOKING);
            context = buildContext();
            const response = await new FormResponseStrategy().getResponse(handler, buildRequest(), context);

            expect(sendLead).to.have.been.calledOnce;
            expect(context.session.get(Constants.CONTACT_CAPTURE_EXISTING_REF_ID)).to.equal("lead-123");

            const display = response.displays && (response.displays[0] as Record<string, unknown>);
            expect(display).to.exist;
            expect(display?.type).to.equal("FORM_STEP_UPDATE");
            expect(display?.step).to.equal("book_appointment");
            const config = (display?.externalWidget as { config: Record<string, unknown> }).config;
            // Built from accumulated slots, NOT the empty submit-step payload.
            expect(config).to.deep.include({
                firstName: "Jane",
                lastName: "Doe",
                email: "jane@example.com",
                phone: "555-000-0000",
                zipCode: "17002",
                trade: "Roofing - Asphalt Install or Replace",
            });
        });

        it("omits the handoff (no FORM_STEP_UPDATE) when the trade cannot be resolved, but still sends the lead", async () => {
            handler = buildHandler({ ...EXTERNAL_BOOKING, allowedTrades: [], defaultTrade: undefined });
            context = buildContext();
            const response = await new FormResponseStrategy().getResponse(handler, buildRequest(), context);

            expect(sendLead).to.have.been.calledOnce;
            const hasStepUpdate =
                Array.isArray(response.displays) &&
                response.displays.some((d) => (d as Record<string, unknown>).type === "FORM_STEP_UPDATE");
            expect(hasStepUpdate).to.equal(false);
        });

        // Mis-classification is a when, not an if. Without provenance on the lead the only
        // signal is a customer complaint; with it we can count how often and see why.
        describe("trade provenance on the lead", () => {
            const extrasFromSendLead = (): Record<string, unknown> =>
                sendLead.getCall(0).args[1] as Record<string, unknown>;

            it("records the resolved trade and how it resolved", async () => {
                handler = buildHandler(EXTERNAL_BOOKING);
                context = buildContext();
                await new FormResponseStrategy().getResponse(handler, buildRequest(), context);

                expect(extrasFromSendLead()).to.deep.include({
                    externalBookingTrade: "Roofing - Asphalt Install or Replace",
                    externalBookingTradeResolution: "single-trade",
                });
            });

            it("records the omitted case too, rather than leaving it invisible", async () => {
                handler = buildHandler({ ...EXTERNAL_BOOKING, allowedTrades: [], defaultTrade: undefined });
                context = buildContext();
                await new FormResponseStrategy().getResponse(handler, buildRequest(), context);

                const extras = extrasFromSendLead();
                expect(extras.externalBookingTradeResolution).to.equal("omitted");
                expect(extras.externalBookingTrade).to.equal(undefined);
            });

            it("leaves an app with no externalBooking entirely untouched", async () => {
                handler = buildHandler(undefined);
                context = buildContext();
                await new FormResponseStrategy().getResponse(handler, buildRequest(), context);

                expect(extrasFromSendLead()).to.not.have.property("externalBookingTradeResolution");
            });
        });
    });

    // #687: the form widget sends a per-submission `eventId` in the FORM_SUBMIT payload's
    // `extras`, stable across a retry of that submission. It is the only field on this path
    // that can identify a duplicate lead, and it was being dropped: FormActionResponseData
    // did not declare `extras`, and the extras bag is otherwise built only from top-level
    // request.attributes.
    describe("extras from the FORM_SUBMIT payload", () => {
        let sendLead: sinon.SinonStub;

        const buildHandler = (): ContactCaptureHandler =>
            new ContactCaptureHandler({
                ...PROPS_WITHOUT_CAPTURE,
                data: {
                    enableFormScheduling: true,
                    CAPTURE_MAIN_FORM: "main",
                    capture: { data: [] },
                    forms: [
                        {
                            type: "FORM",
                            name: "main",
                            steps: [
                                { name: "confirmation", crmSubmit: true, final: true, nextAction: "submit", fields: [] },
                            ],
                        },
                    ],
                } as unknown as ContactCaptureData,
            });

        const buildContext = (): Context =>
            new ContextBuilder()
                .withSessionData({
                    id: "form-session",
                    data: {
                        [Constants.CONTACT_CAPTURE_SLOTS]: {
                            full_name: { name: "full_name", value: "Jane Doe" },
                            email: { name: "email", value: "jane@example.com" },
                        },
                        [Constants.CONTACT_CAPTURE_LIST]: { data: [] },
                    },
                })
                .build();

        const buildRequest = (data: Record<string, unknown>): IntentRequest => {
            const r = new IntentRequestBuilder().withSlots({}).withIntentId(PROPS_WITHOUT_CAPTURE.intentId).build();
            r.isNewSession = false;
            r.attributes = { data: { step: "confirmation", form: "main", result: {}, ...data } };
            return r;
        };

        const sentExtras = (): Record<string, unknown> => sendLead.firstCall.args[1] as Record<string, unknown>;

        beforeEach(() => {
            sendLead = sinon
                .stub(ContactCaptureHandler, "sendLead")
                .resolves({ success: true, id: "lead-123" } as never);
        });

        afterEach(() => {
            sendLead.restore();
        });

        it("passes the submission eventId through to the lead extras", async () => {
            const request = buildRequest({ extras: { eventId: "evt-abc-123" } });

            await new FormResponseStrategy().getResponse(buildHandler(), request, buildContext());

            expect(sendLead).to.have.been.calledOnce;
            expect(sentExtras().eventId).to.equal("evt-abc-123");
        });

        it("passes through other client-supplied extras alongside it", async () => {
            const request = buildRequest({
                extras: { eventId: "evt-abc-123", fbp: "fb.1.123.456", fbc: "fb.1.123.789" },
            });

            await new FormResponseStrategy().getResponse(buildHandler(), request, buildContext());

            expect(sentExtras()).to.deep.include({
                eventId: "evt-abc-123",
                fbp: "fb.1.123.456",
                fbc: "fb.1.123.789",
            });
        });

        // The bag carries values we derive server-side. A client must not be able to
        // overwrite them by naming its own key the same thing.
        it("keeps locally-derived values when the client sends a colliding key", async () => {
            const request = buildRequest({
                extras: {
                    eventId: "evt-abc-123",
                    source: "spoofed-source",
                    externalId: "spoofed-session",
                    crmFlags: { spoofed: true },
                    isAbandoned: true,
                },
            });

            await new FormResponseStrategy().getResponse(buildHandler(), request, buildContext());

            const extras = sentExtras();
            expect(extras.eventId).to.equal("evt-abc-123");
            expect(extras.source).to.not.equal("spoofed-source");
            expect(extras.externalId).to.not.equal("spoofed-session");
            expect(extras.crmFlags).to.not.deep.equal({ spoofed: true });
            expect(extras.isAbandoned).to.equal(false);
        });

        // These values are persisted on the lead and forwarded to CRMs, and they come
        // straight from a browser. Only bounded scalars are worth carrying -- the widget
        // never sends anything else.
        it("drops non-scalar values rather than forwarding them to the CRM", async () => {
            const request = buildRequest({
                extras: {
                    eventId: "evt-abc-123",
                    nested: { deeply: { nope: true } },
                    list: [1, 2, 3],
                    fn: "ok-string",
                    count: 42,
                    flag: false,
                },
            });

            await new FormResponseStrategy().getResponse(buildHandler(), request, buildContext());

            const extras = sentExtras();
            expect(extras.eventId).to.equal("evt-abc-123");
            expect(extras.fn).to.equal("ok-string");
            expect(extras.count).to.equal(42);
            expect(extras.flag).to.equal(false);
            expect(extras).to.not.have.property("nested");
            expect(extras).to.not.have.property("list");
        });

        it("truncates an over-long value", async () => {
            const request = buildRequest({ extras: { eventId: "x".repeat(5000) } });

            await new FormResponseStrategy().getResponse(buildHandler(), request, buildContext());

            const eventId = sentExtras().eventId as string;
            expect(eventId.length).to.be.lessThan(5000);
        });

        it("caps how many client-supplied keys are carried", async () => {
            const many: Record<string, unknown> = {};
            for (let i = 0; i < 200; i++) {
                many[`key_${i}`] = `value_${i}`;
            }

            const request = buildRequest({ extras: many });

            await new FormResponseStrategy().getResponse(buildHandler(), request, buildContext());

            const extras = sentExtras();
            const carried = Object.keys(extras).filter((k) => k.startsWith("key_"));
            expect(carried.length).to.be.lessThan(200);
            // The server-derived keys are untouched by the cap.
            expect(extras).to.have.property("externalId", request.sessionId);
        });

        it("still sends the lead when the payload has no extras at all", async () => {
            const request = buildRequest({});

            await new FormResponseStrategy().getResponse(buildHandler(), request, buildContext());

            expect(sendLead).to.have.been.calledOnce;
            const extras = sentExtras();
            expect(extras).to.exist;
            expect(extras.eventId).to.be.undefined;
            // The locally-derived keys are still there. externalId is the *request's*
            // session id, which is what identifies the visitor's conversation.
            expect(extras).to.have.property("externalId", request.sessionId);
        });
    });
});
