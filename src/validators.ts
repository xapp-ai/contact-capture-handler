/*! Copyright (c) 2022, XAPP AI */

import { LeadDataDescriptorRuntime } from "./data";

const US_NO_LENGTH = 10;
const US_ZIP5_LENGTH = 5;
const US_ZIP9_LENGTH = 9;

export function normalizePhoneNumber(phoneNumber: string): string {
    phoneNumber = phoneNumber.trim().replace(/[^\d]/g, "");

    if (phoneNumber.length === US_NO_LENGTH) {
        return phoneNumber;
    }

    return undefined;
}

export function normalizeEmailAddress(emailAddress: string): string {
    // TODO: use a regex
    if (!!emailAddress && emailAddress.indexOf("@") > 0) {
        return emailAddress;
    }

    return undefined;
}

export function normalizeZipCode(zipCode: string): string {
    zipCode = zipCode.trim().replace(/[^\d]/g, "");

    if (zipCode.length === US_ZIP5_LENGTH) {
        return zipCode;
    }

    if (zipCode.length === US_ZIP9_LENGTH) {
        return `${zipCode.substr(0, 5)}-${zipCode.substr(5, 9)}`;
    }

    return undefined;
}

/**
 * Return normalized (cleaned) otherwise undefined if not valid
 *
 * @param rawQuery
 * @param lead
 */
export function validateLead(rawQuery: string, lead: LeadDataDescriptorRuntime): string {
    switch (lead.type) {
        case "PHONE":
            return normalizePhoneNumber(rawQuery);
        case "EMAIL":
            return normalizeEmailAddress(rawQuery);
        case "ZIP":
            return normalizeZipCode(rawQuery);
        case "SELECTION":
            if (lead.enums && lead.enums.indexOf(rawQuery) < 0) {
                return undefined;
            }
            break;
        case "FULL_NAME":
        case "FIRST_NAME":
        case "LAST_NAME":
        case "ADDRESS":
        case "MESSAGE":
        default:
            break;
    }

    return rawQuery;
}



// export function validateZipCode(zipCode: string): boolean {
//     const zipCodePattern = /^\d{5}$|^\d{5}-\d{4}$/;
//     const result = zipCodePattern.test(zipCode);
//     console.log(`Validating ZIP ${zipCode}: ${result ? "valid" : "invalid"}`);
//     return result;
// }
