/*! Copyright (c) 2024, XAPP AI */

import type { ContactCaptureData } from "../../data";

/**
 * Visitor data collected from the form submission.
 */
export interface FormResultData {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
    zip?: string;
    zip_code?: string;
    address?: string;
    service?: string;
    [key: string]: string | undefined;
}

/**
 * CostGuide visitor config payload.
 */
export interface CostGuideVisitorConfig {
    firstName: string;
    lastName: string;
    address?: string;
    zipCode?: string;
    email?: string;
    phone?: string;
    trade: string;
    advertiserId: number;
    campaignId: string;
    campaignKey: string;
    hideNoMatch: "yes";
    limit: 1;
}

/**
 * Splits a full name into first and last name.
 * - Single-token names put the token in firstName, lastName empty.
 * - Multi-token names split on the first whitespace; remainder becomes lastName.
 *
 * @example splitName("Jane Doe") => { firstName: "Jane", lastName: "Doe" }
 * @example splitName("Mary Anne Van Der Berg") => { firstName: "Mary", lastName: "Anne Van Der Berg" }
 * @example splitName("Cher") => { firstName: "Cher", lastName: "" }
 */
export function splitName(fullName: string): { firstName: string; lastName: string } {
    const trimmed = (fullName || "").trim();
    if (!trimmed) {
        return { firstName: "", lastName: "" };
    }

    const spaceIndex = trimmed.indexOf(" ");
    if (spaceIndex === -1) {
        return { firstName: trimmed, lastName: "" };
    }

    return {
        firstName: trimmed.slice(0, spaceIndex),
        lastName: trimmed.slice(spaceIndex + 1),
    };
}

/**
 * Extracts a US zip code from an address string.
 * Matches 5-digit zip codes optionally followed by -XXXX.
 */
export function extractZipFromAddress(address: string): string | undefined {
    if (!address) return undefined;

    // Match 5-digit zip, optionally followed by -XXXX
    const match = address.match(/\b(\d{5})(?:-\d{4})?\b/);
    return match ? match[1] : undefined;
}

/**
 * Normalizes a phone number to NNN-NNN-NNNN format if it's 10 digits.
 * Otherwise returns the phone as-is.
 */
export function normalizePhone(phone: string): string {
    if (!phone) return "";

    // Extract just the digits
    const digits = phone.replace(/\D/g, "");

    // If exactly 10 digits, format as NNN-NNN-NNNN
    if (digits.length === 10) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    // Otherwise return as-is (international, already formatted, etc.)
    return phone;
}

/**
 * Resolves the trade string from the collected service using the tradeMap or defaultTrade.
 * Returns undefined if neither resolves (caller should omit handoff entirely).
 */
export function resolveTrade(
    service: string | undefined,
    tradeMap: Record<string, string> | undefined,
    defaultTrade: string | undefined
): string | undefined {
    if (service && tradeMap && tradeMap[service]) {
        return tradeMap[service];
    }
    return defaultTrade;
}

/**
 * Builds the CostGuide visitor config payload from form submission data.
 * Returns undefined if trade cannot be resolved (handoff should be omitted).
 */
export function buildCostGuideConfig(
    result: FormResultData,
    externalBooking: NonNullable<ContactCaptureData["externalBooking"]>
): CostGuideVisitorConfig | undefined {
    // Resolve trade first - if unresolvable, return undefined
    const trade = resolveTrade(result.service, externalBooking.tradeMap, externalBooking.defaultTrade);
    if (!trade) {
        return undefined;
    }

    // Resolve names: explicit first_name/last_name win over full_name
    let firstName: string;
    let lastName: string;

    if (result.first_name || result.last_name) {
        firstName = result.first_name || "";
        lastName = result.last_name || "";
    } else {
        const split = splitName(result.full_name || "");
        firstName = split.firstName;
        lastName = split.lastName;
    }

    // Resolve zip: zip, zip_code, or extracted from address
    const zipCode = result.zip || result.zip_code || extractZipFromAddress(result.address || "");

    // Normalize phone
    const phone = normalizePhone(result.phone || "");

    return {
        firstName,
        lastName,
        address: result.address,
        zipCode,
        email: result.email,
        phone: phone || undefined,
        trade,
        advertiserId: externalBooking.advertiserId,
        campaignId: externalBooking.campaignId,
        campaignKey: externalBooking.campaignKey,
        hideNoMatch: "yes",
        limit: 1,
    };
}

/**
 * Builds the static external widget config for the handoff step.
 * This goes in the form definition; per-visitor values come from the submit response.
 */
export function buildExternalWidgetStepConfig(
    externalBooking: NonNullable<ContactCaptureData["externalBooking"]>
): {
    anchorId: string;
    scriptSrc: string;
    configGlobal: string;
    successCallbackKey: string;
    cacheBust: boolean;
    renderTimeoutMs: number;
    config: {
        advertiserId: number;
        campaignId: string;
        campaignKey: string;
        hideNoMatch: "yes";
        limit: 1;
    };
} {
    return {
        anchorId: "airo-anchor",
        scriptSrc: "https://form.contractorappointments.com/js/embed-form.js",
        configGlobal: "airoBookingForm",
        successCallbackKey: "apptScheduledCallback",
        cacheBust: true,
        renderTimeoutMs: 8000, // spike-validated floor - do NOT lower; render measured 111ms-18.7s
        config: {
            advertiserId: externalBooking.advertiserId,
            campaignId: externalBooking.campaignId,
            campaignKey: externalBooking.campaignKey,
            hideNoMatch: "yes",
            limit: 1,
        },
    };
}
