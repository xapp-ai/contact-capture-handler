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
});
