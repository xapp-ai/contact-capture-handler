/*! Copyright (c) 2026, XAPP AI */

import { CrmServiceAvailability, DateTime, TimeOffering } from "stentor-models";

/**
 * Open booking windows per date (yyyy-MM-dd), as the form widget's DATETIME field reads them.
 */
export type OfferingsByDate = { [date: string]: TimeOffering[] };

/**
 * Whether the CRM returned live booking windows for any date.
 */
export function hasTimeSlots(availability: CrmServiceAvailability | undefined): boolean {
    return !!availability?.unavailabilities?.some((day) => Array.isArray(day.timeSlots));
}

/**
 * The wall-clock date (yyyy-MM-dd) and time (HH:mm) of a CRM time in the given timezone.
 *
 * A time without a tz is taken to already be wall-clock in that timezone.
 */
function toWallClock(value: DateTime | undefined, timezone: string): { date: string; time: string } | undefined {
    if (!value?.date || !value.time) {
        return undefined;
    }

    if (!value.tz) {
        return { date: value.date, time: value.time.slice(0, 5) };
    }

    const instant = new Date(`${value.date}T${value.time}${value.tz}`);
    if (isNaN(instant.getTime())) {
        return undefined;
    }

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(instant);
    const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value;

    return {
        date: `${part("year")}-${part("month")}-${part("day")}`,
        time: `${part("hour")}:${part("minute")}`,
    };
}

/**
 * Turns the CRM's live time slots into the open offerings per date, wall-clock in the
 * form's schedule timezone.
 *
 * Every date the CRM sent timeSlots for is present, so a date with no open window maps to
 * an empty list (the widget treats it as closed). A window is keyed by its wall-clock start
 * date, which can differ from the CRM's date once converted.
 *
 * @param availability
 * @param timezone IANA timezone of the DATETIME field's schedule
 */
export function buildOfferingsByDate(availability: CrmServiceAvailability, timezone: string): OfferingsByDate {
    const offeringsByDate: OfferingsByDate = {};

    availability?.unavailabilities?.forEach((day) => {
        if (!Array.isArray(day.timeSlots)) {
            return;
        }

        if (day.date?.date && !offeringsByDate[day.date.date]) {
            offeringsByDate[day.date.date] = [];
        }

        day.timeSlots.forEach((slot) => {
            if (!slot.available) {
                return;
            }

            const start = toWallClock(slot.range?.start, timezone);
            if (!start) {
                return;
            }

            const offering: TimeOffering = { start: start.time };

            // A window that runs past the day can't be expressed as an HH:mm end
            const end = toWallClock(slot.range?.end, timezone);
            if (end && end.date === start.date) {
                offering.end = end.time;
            }

            (offeringsByDate[start.date] = offeringsByDate[start.date] || []).push(offering);
        });
    });

    return offeringsByDate;
}
