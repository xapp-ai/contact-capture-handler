/*! Copyright (c) 2026, XAPP AI */
import { BusyDayDescription, DayOfWeek, NextBusinessDayBlock } from "stentor-models";

const WEEK: DayOfWeek[] = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WEEKDAYS: DayOfWeek[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const DEFAULT_CUTOFF = "17:00";

/** Today's wall-clock date (yyyy-MM-dd), time (HH:mm) and weekday in the timezone, or undefined for a bad zone. */
function wallClock(now: Date, timezone: string): { date: string; time: string; day: number } | undefined {
    let parts: Intl.DateTimeFormatPart[];
    try {
        parts = new Intl.DateTimeFormat("en-CA", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
        }).formatToParts(now);
    } catch {
        return undefined;
    }
    const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value;
    const date = `${part("year")}-${part("month")}-${part("day")}`;

    return {
        date,
        time: `${part("hour")}:${part("minute")}`,
        day: new Date(`${date}T00:00:00Z`).getUTCDay(),
    };
}

function addDays(date: string, days: number): string {
    const next = new Date(`${date}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + days);
    return next.toISOString().slice(0, 10);
}

/**
 * The next business day's morning to hold back from a lead that arrives after hours,
 * so the business isn't booked before it has had a chance to respond.
 *
 * After hours means today (in the business timezone) is not a business day, or it is
 * at or past the same-day cutoff. Undefined when the setting or the timezone is unset,
 * or the lead arrived during business hours.
 *
 * @param now When the lead is being taken
 * @param busyDays The location's default busy days, carrying afterHoursNextDayBlockedUntil
 * @param timezone IANA timezone of the business
 */
export function nextBusinessDayBlock(
    now: Date,
    busyDays: BusyDayDescription | undefined,
    timezone: string | undefined,
): NextBusinessDayBlock | undefined {
    const blockedUntil = busyDays?.afterHoursNextDayBlockedUntil;
    if (!blockedUntil || !timezone) {
        return undefined;
    }

    const today = wallClock(now, timezone);
    if (!today) {
        return undefined;
    }

    const availableDays = busyDays.availableDays ?? WEEKDAYS;
    const businessDays = busyDays.blockWeekends ? availableDays.filter((day) => WEEKDAYS.includes(day)) : availableDays;
    if (businessDays.length === 0) {
        return undefined;
    }
    const isBusinessDay = (day: number): boolean => businessDays.includes(WEEK[day]);

    const cutoff = busyDays.currentDayAvailableUntil || DEFAULT_CUTOFF;
    const afterHours = !isBusinessDay(today.day) || today.time >= cutoff;
    if (!afterHours) {
        return undefined;
    }

    for (let offset = 1; offset <= 7; offset++) {
        if (isBusinessDay((today.day + offset) % 7)) {
            return { date: addDays(today.date, offset), blockedUntil };
        }
    }

    return undefined;
}
