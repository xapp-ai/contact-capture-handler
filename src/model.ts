/*! Copyright (c) 2022, XAPP AI */

import { RequestSlotMap } from "stentor";

/**
 * These are generated, they don't exist in the model but are made
 * of other slots from the model;
 */
export interface PseudoSlots extends RequestSlotMap {
    /**
     * Address is street number and street name
     */
    address?: {
        name: "address";
        type: string;
    }
    /**
     * First name and last name
     */
    full_name?: {
        name: "full_name";
        type: string;
    }
    /**
     * Note is passed along in the notes section of the lead
     */
    note?: {
        name: "note";
        type: string;
    }
}