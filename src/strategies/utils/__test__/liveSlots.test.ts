/*! Copyright (c) 2026, XAPP AI */
import { expect } from "chai";

import { CrmServiceAvailability, CrmServiceTimeAvailability } from "stentor-models";

import { buildOfferingsByDate, hasTimeSlots } from "../liveSlots";

const slot = (date: string, start: string, end: string, tz: string, available = true): CrmServiceTimeAvailability => ({
    range: { start: { date, time: start, tz }, end: { date, time: end, tz } },
    available,
});

describe(`${hasTimeSlots.name}()`, () => {
    it("is false without availability or without any timeSlots", () => {
        expect(hasTimeSlots(undefined)).to.be.false;
        expect(hasTimeSlots({ range: null, unavailabilities: [] })).to.be.false;
        expect(hasTimeSlots({ range: null, unavailabilities: [{ date: { date: "2026-10-22" }, available: false }] })).to
            .be.false;
    });

    it("is true when any date carries timeSlots, even an empty list", () => {
        expect(
            hasTimeSlots({
                range: null,
                unavailabilities: [
                    { date: { date: "2026-10-22" }, available: false },
                    { date: { date: "2026-10-23" }, available: false, timeSlots: [] },
                ],
            }),
        ).to.be.true;
    });
});

describe(`${buildOfferingsByDate.name}()`, () => {
    it("returns the open windows as HH:mm wall-clock in the schedule timezone (UTC CRM, Pacific business)", () => {
        // 15:00Z / 19:00Z on Oct 22 are 08:00 / 12:00 in Los Angeles (PDT, -07:00)
        const availability: CrmServiceAvailability = {
            range: null,
            unavailabilities: [
                {
                    date: { date: "2026-10-22" },
                    available: true,
                    timeSlots: [
                        slot("2026-10-22", "15:00:00", "19:00:00", "Z"),
                        slot("2026-10-22", "19:00:00", "23:00:00", "Z", false),
                        slot("2026-10-22", "21:00:00", "23:00:00", "Z"),
                    ],
                },
            ],
        };

        expect(buildOfferingsByDate(availability, "America/Los_Angeles")).to.deep.equal({
            "2026-10-22": [
                { start: "08:00", end: "12:00" },
                { start: "14:00", end: "16:00" },
            ],
        });
    });

    it("converts offset times into the schedule timezone", () => {
        const availability: CrmServiceAvailability = {
            range: null,
            unavailabilities: [
                {
                    date: { date: "2026-10-22" },
                    available: true,
                    // 09:00 Eastern is 06:00 Pacific
                    timeSlots: [slot("2026-10-22", "09:00:00", "11:00:00", "-04:00")],
                },
            ],
        };

        expect(buildOfferingsByDate(availability, "America/Los_Angeles")).to.deep.equal({
            "2026-10-22": [{ start: "06:00", end: "08:00" }],
        });
    });

    it("keys a window by its wall-clock date when the conversion crosses midnight", () => {
        // 02:00Z on Oct 23 is 19:00 on Oct 22 in Los Angeles
        const availability: CrmServiceAvailability = {
            range: null,
            unavailabilities: [
                {
                    date: { date: "2026-10-23" },
                    available: true,
                    timeSlots: [slot("2026-10-23", "02:00:00", "04:00:00", "Z")],
                },
            ],
        };

        expect(buildOfferingsByDate(availability, "America/Los_Angeles")).to.deep.equal({
            "2026-10-22": [{ start: "19:00", end: "21:00" }],
            "2026-10-23": [],
        });
    });

    it("maps a date whose windows are all full to an empty list", () => {
        const availability: CrmServiceAvailability = {
            range: null,
            unavailabilities: [
                {
                    date: { date: "2026-10-22" },
                    available: false,
                    timeSlots: [slot("2026-10-22", "15:00:00", "19:00:00", "Z", false)],
                },
                { date: { date: "2026-10-23" }, available: false, timeSlots: [] },
            ],
        };

        expect(buildOfferingsByDate(availability, "America/Los_Angeles")).to.deep.equal({
            "2026-10-22": [],
            "2026-10-23": [],
        });
    });

    it("treats times without a tz as already wall-clock in the schedule timezone", () => {
        const availability: CrmServiceAvailability = {
            range: null,
            unavailabilities: [
                {
                    date: { date: "2026-10-22" },
                    available: true,
                    timeSlots: [
                        {
                            range: {
                                start: { date: "2026-10-22", time: "08:00:00" },
                                end: { date: "2026-10-22", time: "12:00:00" },
                            },
                            available: true,
                        },
                    ],
                },
            ],
        };

        expect(buildOfferingsByDate(availability, "America/Los_Angeles")).to.deep.equal({
            "2026-10-22": [{ start: "08:00", end: "12:00" }],
        });
    });

    it("omits the end when the window has none or it runs past the day", () => {
        const availability: CrmServiceAvailability = {
            range: null,
            unavailabilities: [
                {
                    date: { date: "2026-10-22" },
                    available: true,
                    timeSlots: [
                        {
                            range: { start: { date: "2026-10-22", time: "08:00:00", tz: "-07:00" }, end: undefined },
                            available: true,
                        },
                        slot("2026-10-22", "22:00:00", "01:00:00", "-07:00"),
                    ],
                },
            ],
        };
        // The second window's end is on the next day
        availability.unavailabilities[0].timeSlots[1].range.end.date = "2026-10-23";

        expect(buildOfferingsByDate(availability, "America/Los_Angeles")).to.deep.equal({
            "2026-10-22": [{ start: "08:00" }, { start: "22:00" }],
        });
    });

    it("skips windows with no start time and ignores dates without timeSlots", () => {
        const availability: CrmServiceAvailability = {
            range: null,
            unavailabilities: [
                { date: { date: "2026-10-21" }, available: false },
                {
                    date: { date: "2026-10-22" },
                    available: true,
                    timeSlots: [{ range: { start: { date: "2026-10-22" }, end: undefined }, available: true }],
                },
            ],
        };

        expect(buildOfferingsByDate(availability, "America/Los_Angeles")).to.deep.equal({ "2026-10-22": [] });
    });
});
