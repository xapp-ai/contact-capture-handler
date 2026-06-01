/*! Copyright (c) 2026, XAPP AI */
import * as chai from "chai";
import * as sinonChai from "sinon-chai";

import { Content, Context, Handler, IntentRequest } from "stentor-models";
import { ContextBuilder } from "stentor-context";
import { IntentRequestBuilder } from "stentor-request";

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
});
