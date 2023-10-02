/*! Copyright (c) 2022, XAPP AI */

import { QuestionAnsweringData } from "@xapp/question-answering-handler";

export type ContactDataType =
    "FIRST_NAME" |
    "LAST_NAME" |
    "FULL_NAME" |
    "PHONE" |
    "ZIP" |
    "ADDRESS" |
    "EMAIL" |
    "SELECTION" |
    "COMPANY" |
    "ORGANIZATION" |
    "MESSAGE" |
    "DATE_TIME";

export interface ContactCaptureData extends QuestionAnsweringData {
    /**
     * Information related to lead capture.
     */
    capture: ContactCaptureBlueprint;
    /**
     * Default is PROGRAMMATIC
     */
    responses?: "GENERATIVE_AI" | "PROGRAMMATIC";
    /**
     * It will not capture the lead and instead provide contact information.
     * 
     * Defaults to true.
     */
    captureLead?: boolean;
    /**
     * Contact information for the 
     */
    contactInformation?: {
        email?: string;
        phone?: string;
        contactUrl?: string;
    }
    /**
     * Optional place IDs
     */
    placeId?: string[];
}

export interface ContactCaptureBlueprint {
    data: DataDescriptorBase[];
}

export interface DataDescriptorBase {
    /**
     * The tag matching to the response that will be used to ask for this data.
     */
    questionContentKey: string;
    /**
     * Type of information to be gathered
     */
    type: ContactDataType;
    /**
     * Possible values to ask of the user
     * 
     * For example, which service are you interested in: Roofing, Gutters
     */
    enums?: string[];
    /**
     * The name of the slot to pull the data from.
     */
    slotName?: string;
    /**
     * When true, if the slotName is not found or doesn't exist, it will just accept the user's
     * raw query input.
     */
    acceptAnyInput?: boolean;
    /**
     * If the data is required.  If not required and the user says no, we will skip it.
     * 
     * For example, if you ask for both phone and email, you can just require one.
     */
    required?: boolean;
    /**
     * Is the value being collected or not
     */
    active?: boolean;
}

export interface DataDescriptorRuntime extends DataDescriptorBase {
    /**
     * The value collected from the user
     */
    collectedValue?: string;
    /**
     * Did the user refuse to answer the question.
     */
    userSkipped?: boolean;
}

export interface CaptureRuntimeData {
    data: DataDescriptorRuntime[];
    lastModifiedMs?: number;
}
