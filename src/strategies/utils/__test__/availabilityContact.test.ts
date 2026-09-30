/*! Copyright (c) 2026, XAPP AI */
import { expect } from "chai";

import { CaptureRuntimeData } from "../../../data";
import { availabilityLocationKey, buildAvailabilityContact } from "../availabilityContact";

describe(`${buildAvailabilityContact.name}()`, () => {
    it("returns undefined without a lead data list", () => {
        expect(buildAvailabilityContact(undefined)).to.be.undefined;
        expect(buildAvailabilityContact({} as CaptureRuntimeData)).to.be.undefined;
    });

    it("returns undefined when nothing has been collected", () => {
        const list: CaptureRuntimeData = {
            data: [
                { type: "FULL_NAME", questionContentKey: "name", slotName: "full_name" },
                { type: "PHONE", questionContentKey: "phone", slotName: "phone", collectedValue: "  " },
                { type: "MESSAGE", questionContentKey: "message", slotName: "message", collectedValue: "leak" },
            ],
        };
        expect(buildAvailabilityContact(list)).to.be.undefined;
    });

    it("maps the collected contact slots", () => {
        const list: CaptureRuntimeData = {
            data: [
                { type: "FULL_NAME", questionContentKey: "name", collectedValue: " Jane Doe " },
                { type: "PHONE", questionContentKey: "phone", collectedValue: "5551234567" },
                { type: "EMAIL", questionContentKey: "email", collectedValue: "jane@example.com" },
                { type: "ADDRESS", questionContentKey: "address", collectedValue: "1 Main St, Tampa, FL" },
                { type: "ZIP", questionContentKey: "zip", collectedValue: "33602" },
                { type: "MESSAGE", questionContentKey: "message", collectedValue: "Leaky faucet" },
            ],
        };
        expect(buildAvailabilityContact(list)).to.deep.equal({
            name: "Jane Doe",
            phone: "5551234567",
            email: "jane@example.com",
            address: "1 Main St, Tampa, FL",
            zip: "33602",
        });
    });

    it("joins first and last name when there is no full name", () => {
        const list: CaptureRuntimeData = {
            data: [
                { type: "FIRST_NAME", questionContentKey: "first", collectedValue: "Jane" },
                { type: "LAST_NAME", questionContentKey: "last", collectedValue: "Doe" },
            ],
        };
        expect(buildAvailabilityContact(list)).to.deep.equal({ name: "Jane Doe" });
    });

    it("uses a first name alone", () => {
        const list: CaptureRuntimeData = {
            data: [{ type: "FIRST_NAME", questionContentKey: "first", collectedValue: "Jane" }],
        };
        expect(buildAvailabilityContact(list)).to.deep.equal({ name: "Jane" });
    });

    it("prefers the full name over first and last", () => {
        const list: CaptureRuntimeData = {
            data: [
                { type: "FIRST_NAME", questionContentKey: "first", collectedValue: "J" },
                { type: "FULL_NAME", questionContentKey: "name", collectedValue: "Jane Doe" },
            ],
        };
        expect(buildAvailabilityContact(list)).to.deep.equal({ name: "Jane Doe" });
    });

    it("omits keys that were not collected", () => {
        const list: CaptureRuntimeData = {
            data: [
                { type: "ZIP", questionContentKey: "zip", collectedValue: "33602" },
                { type: "EMAIL", questionContentKey: "email" },
            ],
        };
        const contact = buildAvailabilityContact(list);
        expect(contact).to.deep.equal({ zip: "33602" });
        expect(contact).to.not.have.property("email");
    });
});

describe(`${availabilityLocationKey.name}()`, () => {
    it("returns undefined without location data", () => {
        expect(availabilityLocationKey(undefined)).to.be.undefined;
        expect(availabilityLocationKey({ name: "Jane", phone: "555" })).to.be.undefined;
    });

    it("changes when the address or zip changes", () => {
        const zipOnly = availabilityLocationKey({ zip: "33602" });
        const both = availabilityLocationKey({ zip: "33602", address: "1 Main St" });
        const otherZip = availabilityLocationKey({ zip: "33603" });

        expect(zipOnly).to.be.a("string");
        expect(both).to.not.equal(zipOnly);
        expect(otherZip).to.not.equal(zipOnly);
    });

    it("ignores the non-location fields", () => {
        expect(availabilityLocationKey({ zip: "33602", name: "Jane" })).to.equal(
            availabilityLocationKey({ zip: "33602", phone: "555" }),
        );
    });
});
