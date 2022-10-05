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
    "MESSAGE";

export interface ContactCaptureData extends QuestionAnsweringData {
    leadGenerationBlueprint: LeadGenerationBlueprint;
}

export interface LeadGenerationBlueprint {
    leads: LeadDataDescriptorBase[];
}

export interface LeadDataDescriptorBase {
    /**
     * The ID matching to the response that will be used to ask for this data.
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
     * The name of the slot to pull the data from
     */
    slotName?: string;
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

export interface LeadDataDescriptorRuntime extends LeadDataDescriptorBase {
    /**
     * The value collected from the user
     */
    collectedValue?: string;
    /**
     * Did the user refuse to answer the question.
     */
    userSkipped?: boolean;
}

export interface LeadGenerationRuntimeData {
    data: LeadDataDescriptorRuntime[];
    lastModifiedMs?: number;
}
