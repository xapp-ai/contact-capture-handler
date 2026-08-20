/*! Copyright (c) 2026, XAPP AI */
import * as chai from "chai";

import { MultistepForm } from "stentor-models";

import { ExternalBookingData } from "../../../data";
import {
    applyExternalBookingHandoff,
    buildExternalBookingConfig,
    buildHandoffStep,
    DEFAULT_EXTERNAL_BOOKING_STEP_NAME,
    splitName,
    extractZip,
    normalizePhone,
} from "../externalBooking";

const expect = chai.expect;

const BASE_BOOKING: ExternalBookingData = {
    enabled: true,
    provider: "costguide",
    advertiserId: 4944,
    campaignId: "6a283d45eddcf",
    campaignKey: "6YGTmNKxtjMDVkWPLwgC",
    allowedTrades: ["Roofing - Asphalt Install or Replace", "Windows - Replace 6-9 Windows"],
    defaultTrade: "Bathroom - Bathtub or Shower Updates",
};

describe("#splitName()", () => {
    it("splits full_name on the first whitespace", () => {
        expect(splitName({ full_name: "Jane Doe" })).to.deep.equal({ firstName: "Jane", lastName: "Doe" });
    });

    it("keeps the remainder (including further spaces) as lastName", () => {
        expect(splitName({ full_name: "Mary Anne Van Der Berg" })).to.deep.equal({
            firstName: "Mary",
            lastName: "Anne Van Der Berg",
        });
    });

    it("puts a single-token name in firstName and leaves lastName empty", () => {
        expect(splitName({ full_name: "Cher" })).to.deep.equal({ firstName: "Cher", lastName: "" });
    });

    it("prefers explicit first_name / last_name over full_name", () => {
        expect(splitName({ full_name: "Jane Doe", first_name: "Janet", last_name: "Smith" })).to.deep.equal({
            firstName: "Janet",
            lastName: "Smith",
        });
    });

    it("uses explicit first_name with no last_name", () => {
        expect(splitName({ first_name: "Janet" })).to.deep.equal({ firstName: "Janet", lastName: "" });
    });
});

describe("#extractZip()", () => {
    it("prefers zip, then zip_code", () => {
        expect(extractZip({ zip: "17002", zip_code: "99999" })).to.equal("17002");
        expect(extractZip({ zip_code: "17002" })).to.equal("17002");
    });

    it("extracts a 5-digit zip from the address when no zip field is present", () => {
        expect(extractZip({ address: "123 Any St., Millerstown, PA 17002" })).to.equal("17002");
    });

    it("handles a ZIP+4 in the address", () => {
        expect(extractZip({ address: "123 Any St, PA 17002-1234" })).to.equal("17002");
    });

    it("returns undefined when no zip can be found", () => {
        expect(extractZip({ address: "123 Any Street" })).to.equal(undefined);
        expect(extractZip({})).to.equal(undefined);
    });
});

describe("#normalizePhone()", () => {
    it("formats a 10-digit phone as NNN-NNN-NNNN", () => {
        expect(normalizePhone("5551234567")).to.equal("555-123-4567");
        expect(normalizePhone("(555) 123-4567")).to.equal("555-123-4567");
    });

    it("passes an already-dashed 10-digit phone through unchanged", () => {
        expect(normalizePhone("555-123-4567")).to.equal("555-123-4567");
    });

    it("passes a non-10-digit / international phone through unchanged", () => {
        expect(normalizePhone("+44 20 7946 0958")).to.equal("+44 20 7946 0958");
        expect(normalizePhone("12345")).to.equal("12345");
    });
});

describe("#buildExternalBookingConfig()", () => {
    it("maps collected data + partner ids into the merge config", () => {
        const config = buildExternalBookingConfig({
            result: {
                full_name: "Jane Doe",
                address: "123 Any St.",
                zip: "17002",
                email: "jane@example.com",
                phone: "5550000000",
            },
            trade: "Roofing - Asphalt Install or Replace",
            externalBooking: BASE_BOOKING,
        });

        expect(config).to.deep.equal({
            firstName: "Jane",
            lastName: "Doe",
            address: "123 Any St.",
            zipCode: "17002",
            email: "jane@example.com",
            phone: "555-000-0000",
            trade: "Roofing - Asphalt Install or Replace",
            advertiserId: 4944,
            campaignId: "6a283d45eddcf",
            campaignKey: "6YGTmNKxtjMDVkWPLwgC",
        });
    });

    it("returns undefined when no trade resolved (so the handoff is omitted)", () => {
        const config = buildExternalBookingConfig({
            result: { full_name: "Jane Doe", zip: "17002" },
            trade: undefined,
            externalBooking: BASE_BOOKING,
        });
        expect(config).to.equal(undefined);
    });

    it("omits fields that were not collected (except the always-present partner ids and trade)", () => {
        const config = buildExternalBookingConfig({
            result: { full_name: "Cher" },
            trade: "Windows - Replace 6-9 Windows",
            externalBooking: BASE_BOOKING,
        });
        expect(config).to.deep.equal({
            firstName: "Cher",
            lastName: "",
            trade: "Windows - Replace 6-9 Windows",
            advertiserId: 4944,
            campaignId: "6a283d45eddcf",
            campaignKey: "6YGTmNKxtjMDVkWPLwgC",
        });
    });
});

// Minimal MultistepForm-shaped fixtures; cast because the full type carries display
// metadata (type/header/labelHeader) irrelevant to the handoff transform under test.
const asForm = (form: object): MultistepForm => form as unknown as MultistepForm;

const generatedForm = (): MultistepForm =>
    asForm({
        name: "contact_capture",
        steps: [
            { name: "service_request", nextAction: "next", fields: [{ name: "svc", type: "TEXT" }] },
            { name: "contact_info", nextAction: "next", fields: [{ name: "email", type: "TEXT" }] },
            {
                name: "confirmation",
                crmSubmit: true,
                final: true,
                nextAction: "submit",
                fields: [{ name: "c", type: "CARD" }],
            },
            { name: "thank_you", previousAction: "omit", nextAction: "omit", fields: [{ name: "ty", type: "CARD" }] },
        ],
    });

describe("#buildHandoffStep()", () => {
    it("is a terminal, full-bleed step with no per-visitor data in the static config", () => {
        const step = buildHandoffStep(BASE_BOOKING);
        expect(step.name).to.equal("book_appointment");
        expect(step.fullBleed).to.equal(true);
        expect(step.previousAction).to.equal("omit");
        expect(step.nextAction).to.equal("omit");
        expect(step.warnBeforeUnload).to.equal(true);
        expect(step.externalWidget.anchorId).to.equal("airo-anchor");
        expect(step.externalWidget.renderTimeoutMs).to.equal(8000);
        // static config carries only partner ids + fixed flags, never visitor data
        expect(step.externalWidget.config).to.deep.equal({
            advertiserId: 4944,
            campaignId: "6a283d45eddcf",
            campaignKey: "6YGTmNKxtjMDVkWPLwgC",
            hideNoMatch: "yes",
            limit: 1,
            source: "thankyoupage",
        });
        expect(step.externalWidget.config).to.not.have.property("firstName");
        expect(step.externalWidget.config).to.not.have.property("zipCode");
    });

    it("honors a custom stepName", () => {
        expect(buildHandoffStep({ ...BASE_BOOKING, stepName: "book_now" }).name).to.equal("book_now");
    });
});

describe("#applyExternalBookingHandoff()", () => {
    it("returns the form unchanged when disabled or unset (byte-identical to today)", () => {
        const form = generatedForm();
        expect(applyExternalBookingHandoff(form, undefined)).to.equal(form);
        expect(applyExternalBookingHandoff(form, { ...BASE_BOOKING, enabled: false })).to.equal(form);
        // steps untouched
        expect(form.steps.map((s) => s.name)).to.deep.equal([
            "service_request",
            "contact_info",
            "confirmation",
            "thank_you",
        ]);
    });

    it("appends the handoff, drops the trailing ack, and marks the submit step final", () => {
        const result = applyExternalBookingHandoff(generatedForm(), BASE_BOOKING);
        expect(result.steps.map((s) => s.name)).to.deep.equal([
            "service_request",
            "contact_info",
            "confirmation",
            DEFAULT_EXTERNAL_BOOKING_STEP_NAME,
        ]);
        const submit = result.steps.find((s) => s.name === "confirmation");
        expect(submit?.crmSubmit).to.equal(true);
        expect(submit?.final).to.equal(true);
        expect(submit?.nextAction).to.equal("submit");
    });

    it("fills externalWidget into a custom form's existing step without appending a duplicate", () => {
        const custom = asForm({
            name: "custom",
            steps: [
                {
                    name: "contact_info",
                    crmSubmit: true,
                    final: true,
                    nextAction: "submit",
                    fields: [{ name: "e", type: "TEXT" }],
                },
                { name: "book_appointment", nextAction: "omit", fields: [] },
            ],
        });
        const result = applyExternalBookingHandoff(custom, BASE_BOOKING);
        expect(result.steps).to.have.length(2);
        const handoff = result.steps.find((s) => s.name === "book_appointment");
        expect(handoff?.fullBleed).to.equal(true);
        expect((handoff as never as { externalWidget?: unknown }).externalWidget).to.exist;
    });
});
