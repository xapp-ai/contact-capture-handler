/*! Copyright (c) 2026, XAPP AI */

import { CrmServiceAvailabilityContact } from "stentor-models";

import { CaptureRuntimeData, ContactDataType } from "../../data";

/**
 * Builds what the visitor has told us so far, for CRMs whose availability depends on who or where
 * the customer is (for example ranking slots by drive time).
 *
 * Returns undefined when nothing relevant has been collected, so callers can leave `contact` off
 * the availability options entirely.
 *
 * @param leadDataList The CONTACT_CAPTURE_LIST session data
 */
export function buildAvailabilityContact(
    leadDataList: CaptureRuntimeData | undefined,
): CrmServiceAvailabilityContact | undefined {
    if (!Array.isArray(leadDataList?.data)) {
        return undefined;
    }

    const valueOf = (type: ContactDataType): string | undefined => {
        const value = leadDataList.data.find((d) => d.type === type && d.collectedValue?.trim())?.collectedValue;
        return value?.trim();
    };

    const firstLast = [valueOf("FIRST_NAME"), valueOf("LAST_NAME")].filter(Boolean).join(" ");

    const collected: CrmServiceAvailabilityContact = {
        name: valueOf("FULL_NAME") || firstLast || undefined,
        phone: valueOf("PHONE"),
        email: valueOf("EMAIL"),
        address: valueOf("ADDRESS"),
        zip: valueOf("ZIP"),
    };

    const contact: CrmServiceAvailabilityContact = {};
    for (const [key, value] of Object.entries(collected) as [keyof CrmServiceAvailabilityContact, string][]) {
        if (value) {
            contact[key] = value;
        }
    }

    return Object.keys(contact).length > 0 ? contact : undefined;
}

/**
 * A comparable key for the location portion of the contact, used to refetch availability only when
 * the address or zip actually changes.
 *
 * Returns undefined when no location has been collected.
 *
 * @param contact
 */
export function availabilityLocationKey(contact: CrmServiceAvailabilityContact | undefined): string | undefined {
    if (!contact?.address && !contact?.zip) {
        return undefined;
    }

    return JSON.stringify([contact.address || "", contact.zip || ""]);
}
