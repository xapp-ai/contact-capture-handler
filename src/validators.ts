/*! Copyright (c) 2022, XAPP AI */

import { DataDescriptorRuntime } from "./data";

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
    if (!emailAddress) {
        return undefined;
    }

    emailAddress = emailAddress.trim();

    if (!!emailAddress && emailAddress.indexOf("@") > 0) {
        return emailAddress;
    }

    return undefined;
}
export function normalizeDateTime(dateTime: string): string {
    return dateTime;

    // TODO:  implement date and time validation
    // var timestamp = Date.parse(dateTime);

    // // Check Epoc date (should be a number)
    // if (isNaN(timestamp) === false) {
    //        return dateTime
    // }

    // return undefined;
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
export function validateLead(rawQuery: string, lead: DataDescriptorRuntime): string {
    switch (lead.type) {
        case "PHONE":
            return normalizePhoneNumber(rawQuery);
        case "EMAIL":
            return normalizeEmailAddress(rawQuery);
        case "DATE_TIME":
            return normalizeDateTime(rawQuery);
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
