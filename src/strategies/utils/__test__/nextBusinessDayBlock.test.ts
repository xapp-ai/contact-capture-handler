/*! Copyright (c) 2026, XAPP AI */
import { expect } from "chai";

import { BusyDayDescription } from "stentor-models";

import { nextBusinessDayBlock } from "../nextBusinessDayBlock";

const CHICAGO = "America/Chicago";
const busyDays: BusyDayDescription = { afterHoursNextDayBlockedUntil: "12:00" };

// Chicago is UTC-6 in November 2026. Mon 9 … Fri 13, Sat 14, Sun 15, Mon 16.
const chicago = (date: string, time: string): Date => new Date(`${date}T${time}:00-06:00`);

describe(`${nextBusinessDayBlock.name}()`, () => {
    it("blocks Monday morning for a Saturday lead", () => {
        expect(nextBusinessDayBlock(chicago("2026-11-14", "10:00"), busyDays, CHICAGO)).to.deep.equal({
            date: "2026-11-16",
            blockedUntil: "12:00",
        });
    });

    it("blocks Monday morning for a Sunday lead", () => {
        expect(nextBusinessDayBlock(chicago("2026-11-15", "09:00"), busyDays, CHICAGO)).to.deep.equal({
            date: "2026-11-16",
            blockedUntil: "12:00",
        });
    });

    it("blocks the next morning for a weekday lead past the 17:00 default cutoff", () => {
        expect(nextBusinessDayBlock(chicago("2026-11-10", "18:30"), busyDays, CHICAGO)).to.deep.equal({
            date: "2026-11-11",
            blockedUntil: "12:00",
        });
    });

    it("counts a lead exactly at the cutoff as after hours", () => {
        expect(nextBusinessDayBlock(chicago("2026-11-10", "17:00"), busyDays, CHICAGO)?.date).to.equal("2026-11-11");
    });

    it("does not block for a lead during business hours", () => {
        expect(nextBusinessDayBlock(chicago("2026-11-10", "15:00"), busyDays, CHICAGO)).to.be.undefined;
    });

    it("blocks Monday for a Friday evening lead", () => {
        expect(nextBusinessDayBlock(chicago("2026-11-13", "18:00"), busyDays, CHICAGO)?.date).to.equal("2026-11-16");
    });

    it("uses the configured cutoff instead of 17:00", () => {
        const early = { ...busyDays, currentDayAvailableUntil: "14:00" };
        expect(nextBusinessDayBlock(chicago("2026-11-10", "15:00"), early, CHICAGO)?.date).to.equal("2026-11-11");
    });

    it("follows availableDays", () => {
        const tueToSat: BusyDayDescription = {
            ...busyDays,
            availableDays: ["tuesday", "wednesday", "thursday", "friday", "saturday"],
        };
        expect(nextBusinessDayBlock(chicago("2026-11-15", "10:00"), tueToSat, CHICAGO)?.date).to.equal("2026-11-17");
        // Saturday is a business day here, so a Saturday morning lead is not after hours
        expect(nextBusinessDayBlock(chicago("2026-11-14", "10:00"), tueToSat, CHICAGO)).to.be.undefined;
    });

    it("treats blockWeekends as Monday to Friday", () => {
        const weekendsBlocked: BusyDayDescription = {
            ...busyDays,
            availableDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
            blockWeekends: true,
        };
        expect(nextBusinessDayBlock(chicago("2026-11-13", "18:00"), weekendsBlocked, CHICAGO)?.date).to.equal(
            "2026-11-16",
        );
    });

    it("reads the day and time in the business timezone, not UTC", () => {
        // 00:30 UTC Saturday is still Friday 18:30 in Chicago
        const now = new Date("2026-11-14T00:30:00Z");
        expect(nextBusinessDayBlock(now, busyDays, CHICAGO)?.date).to.equal("2026-11-16");
        // 15:00 UTC Tuesday is 09:00 in Chicago: business hours
        expect(nextBusinessDayBlock(new Date("2026-11-10T15:00:00Z"), busyDays, CHICAGO)).to.be.undefined;
    });

    it("returns undefined when the setting, the busy days or the timezone is missing", () => {
        const saturday = chicago("2026-11-14", "10:00");
        expect(nextBusinessDayBlock(saturday, {}, CHICAGO)).to.be.undefined;
        expect(nextBusinessDayBlock(saturday, undefined, CHICAGO)).to.be.undefined;
        expect(nextBusinessDayBlock(saturday, busyDays, undefined)).to.be.undefined;
        expect(nextBusinessDayBlock(saturday, busyDays, "")).to.be.undefined;
    });

    it("returns undefined for an invalid timezone or no business days", () => {
        const saturday = chicago("2026-11-14", "10:00");
        expect(nextBusinessDayBlock(saturday, busyDays, "Not/AZone")).to.be.undefined;
        expect(nextBusinessDayBlock(saturday, { ...busyDays, availableDays: [] }, CHICAGO)).to.be.undefined;
    });
});
