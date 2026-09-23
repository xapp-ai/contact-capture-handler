/*! Copyright (c) 2026, XAPP AI */
import * as chai from "chai";

import { MultistepForm } from "stentor-models";

import { ExternalBookingData } from "../../../data";
import {
    toCategoryTrade,
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

describe("#toCategoryTrade()", () => {
    // Why this exists: a real Erie Home lead on 2026-09-22 posted with trade
    // "Roofing - Repair". Erie holds no roofing-repair contract, so CostGuide's form could not
    // find a contract matching that trade for that advertiser and rendered nothing -- which
    // read as our handoff being broken. CostGuide (Vito Sauro) asked that every trade in a
    // category be sent as that category's single canonical trade.
    it("sends any roofing trade as the canonical roofing trade", () => {
        expect(toCategoryTrade("Roofing - Repair")).to.equal("Roofing - Asphalt Install or Replace");
    });

    it("sends any windows trade as the canonical windows trade", () => {
        expect(toCategoryTrade("Windows - Replace 1 Window")).to.equal("Windows - Replace 6-9 Windows");
        expect(toCategoryTrade("Windows - Glass Repair")).to.equal("Windows - Replace 6-9 Windows");
    });

    it("categorises by the leading word, not the part before the dash", () => {
        // "Windows Repair - Service Call" splits on the dash as "Windows Repair", which matches
        // no category; it is still a windows trade.
        expect(toCategoryTrade("Windows Repair - Service Call")).to.equal("Windows - Replace 6-9 Windows");
    });

    it("sends any siding or bathroom trade as its canonical trade", () => {
        expect(toCategoryTrade("Siding - Fiber Cement")).to.equal("Siding - Vinyl Install or Replace");
        expect(toCategoryTrade("Bathroom - Remodel")).to.equal("Bathroom - Bathtub or Shower Updates");
    });

    it("leaves the canonical trade itself alone", () => {
        expect(toCategoryTrade("Roofing - Asphalt Install or Replace")).to.equal("Roofing - Asphalt Install or Replace");
    });

    it("ignores case and surrounding whitespace", () => {
        expect(toCategoryTrade("  roofing - repair ")).to.equal("Roofing - Asphalt Install or Replace");
    });

    it("passes a category we were given no mapping for through untouched", () => {
        // Only the four categories CostGuide listed are mapped. Rewriting a doors or gutters
        // trade to something we invented would be a guess at which contract they hold.
        expect(toCategoryTrade("Doors - Exterior Door Install or Replace"))
            .to.equal("Doors - Exterior Door Install or Replace");
    });

    it("passes an empty or missing trade through", () => {
        expect(toCategoryTrade(undefined)).to.equal(undefined);
    });
});

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

    it("takes the zip, not a five-digit street number", () => {
        // The first live CostGuide handoff sent zipCode 15603 -- the house number -- for
        // "15603 Jillians Forest Way, Centreville, VA 20120, USA". CostGuide matches the
        // contractor on zip and runs with hideNoMatch, so their widget rendered nothing and it
        // read as our handoff being broken. Every fixture here had a 3-digit street number.
        expect(extractZip({ address: "15603 Jillians Forest Way, Centreville, VA 20120, USA" }))
            .to.equal("20120");
    });

    it("takes the zip when a five-digit street number is followed by a ZIP+4", () => {
        expect(extractZip({ address: "15603 Jillians Forest Way, Centreville, VA 20120-1234" }))
            .to.equal("20120");
    });

    it("returns undefined when no zip can be found", () => {
        expect(extractZip({ address: "123 Any Street" })).to.equal(undefined);
        expect(extractZip({})).to.equal(undefined);
    });

    it("returns a bare zip typed into the address box", () => {
        // ADDRESS is free text -- validators.ts passes it through untouched and nothing forces an
        // autocomplete selection -- so a visitor typing only their zip there is realistic. That
        // match also sits at index 0, and dropping it would omit zipCode and give CostGuide the
        // same blank widget this fix exists to prevent.
        expect(extractZip({ address: "20120" })).to.equal("20120");
        expect(extractZip({ address: "  20120  " })).to.equal("20120");
        expect(extractZip({ address: "20120-1234" })).to.equal("20120");
    });

    it("returns undefined rather than passing a lone street number off as a zip", () => {
        // A wrong zip is worse than none: CostGuide would match a contractor in the wrong part of
        // the country and the booking would look fine. No zip at least fails visibly.
        expect(extractZip({ address: "15603 Jillians Forest Way" })).to.equal(undefined);
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

    it("still hands over what we know when no trade resolved, omitting only the trade", () => {
        // Not resolving a trade is a reason to withhold THE TRADE, not the five fields we are
        // certain about. Returning undefined dropped the whole config, so the partner's widget
        // mounted with nothing and asked the homeowner for their zip, name, address, email and
        // phone over again -- everything they had just given us. Observed on erie-home-6181:
        // every "no-match" submit sent the visitor back to CostGuide's own first step.
        const config = buildExternalBookingConfig({
            result: { full_name: "Jane Doe", zip: "17002", email: "jane@example.com" },
            trade: undefined,
            externalBooking: BASE_BOOKING,
        });

        expect(config).to.deep.equal({
            firstName: "Jane",
            lastName: "Doe",
            zipCode: "17002",
            email: "jane@example.com",
            advertiserId: 4944,
            campaignId: "6a283d45eddcf",
            campaignKey: "6YGTmNKxtjMDVkWPLwgC",
        });
    });

    it("sends no trade key at all rather than an empty one when none resolved", () => {
        // The partner drops its own "what kind of work" step when `trade` is present
        // (`(n.estimateAction() || n.fullTrade()) && d("estimateAction")`). An empty or null
        // trade would satisfy that and skip the one question we actually need them to ask.
        const config = buildExternalBookingConfig({
            result: { full_name: "Jane Doe", zip: "17002" },
            trade: undefined,
            externalBooking: BASE_BOOKING,
        });

        expect(config).to.not.have.property("trade");
    });

    it("never substitutes defaultTrade for a trade the classifier could not resolve", () => {
        // Deliberate: posting "my furnace stopped working" to a roofer as roofing is worse than
        // not naming a trade. The fallback belongs to the timeout and low-confidence paths in
        // tradeClassifier, not to a no-match.
        const config = buildExternalBookingConfig({
            result: { full_name: "Jane Doe", zip: "17002" },
            trade: undefined,
            externalBooking: { ...BASE_BOOKING, defaultTrade: "Roofing - Repair" },
        });

        expect(config).to.not.have.property("trade");
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

describe("#buildExternalBookingConfig() trade category", () => {
    it("posts the category's canonical trade, not the trade the form resolved", () => {
        const config = buildExternalBookingConfig({
            result: { full_name: "Jane Doe", phone: "5551234567" },
            trade: "Roofing - Repair",
            externalBooking: BASE_BOOKING,
        });

        expect(config.trade).to.equal("Roofing - Asphalt Install or Replace");
    });

    it("leaves a trade in a category CostGuide gave no mapping for as it is", () => {
        const config = buildExternalBookingConfig({
            result: { full_name: "Jane Doe" },
            trade: "Doors - Exterior Door Install or Replace",
            externalBooking: BASE_BOOKING,
        });

        expect(config.trade).to.equal("Doors - Exterior Door Install or Replace");
    });
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
            showLeadBuyers: "yes",
            source: "thankyoupage",
        });
        expect(step.externalWidget.config).to.not.have.property("firstName");
        expect(step.externalWidget.config).to.not.have.property("zipCode");
    });

    it("asks CostGuide to show the lead-buyer consent box", () => {
        // A real lead on 2026-09-22 came back non-distributable: the TrustedForm recording
        // showed the homeowner never saw the consent box that carries the "request estimate"
        // control, so there was no consent to pass a lead on. CostGuide (Vito Sauro) said
        // passing advertiserId alone should have displayed it but showLeadBuyers forces it,
        // and that it does not change how many contractors are shown.
        const step = buildHandoffStep(BASE_BOOKING);

        expect(step.externalWidget.config.showLeadBuyers).to.equal("yes");
        expect(step.externalWidget.config.limit).to.equal(1);
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
