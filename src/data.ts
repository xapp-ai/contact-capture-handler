/*! Copyright (c) 2022, XAPP AI */
import { CrmServiceAvailabilitySettings, MultistepForm } from "stentor-models";
import { QuestionAnsweringData } from "@xapp/question-answering-handler";

import { PlacesService } from "./services/PlacesService/models";

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

export interface ContactCaptureService {
    /**
     * ID for the service option, typically slugified label
     */
    id: string;
    /**
     * Label displayed to the user
     */
    label: string;
    /**
     * Reserving these for future use, a description of the service
     */
    description?: string;
    /**
     * Optional price for the service
     */
    price?: string;
}

export interface ContactCaptureData extends QuestionAnsweringData {
    /**
     * It will not capture the lead and instead provide contact information.
     * 
     * Defaults to false.
     */
    captureLead?: boolean;
    /**
     * It can take preferred time for an appointment, without confirming if the time is available through an FSM.
     */
    enablePreferredTime?: boolean;
    /**
     * Form Widget channel only, it will enable scheduling within the form.  Otherwise the form widget will simply act as a contact us form. 
     * 
     */
    enableFormScheduling?: boolean;
    /**
     * Optional place IDs to look up information about the business
     */
    places?: { placeId?: string }[];
    /**
     * Optional PlaceService, used for testing, defaults to GooglePlaceService.  
     */
    placeService?: PlacesService;
    /**
     * Information related to lead capture.
     */
    capture: ContactCaptureBlueprint;
    /**
     * Default is PROGRAMMATIC, setting to GENERATIVE_AI will use the response the LLM created.
     */
    responses?: "GENERATIVE_AI" | "PROGRAMMATIC";
    /**
     * Use the chat response when it is a HelpWith response, this can lead to better transitions.
     */
    useChatResponse?: boolean;
    /**
     * The form descriptions for the form widget.
     * 
     * You must also set CAPTURE_MAIN_FORM
     */
    forms?: MultistepForm[];
    /**
     * The name of the "main" capture form
     */
    CAPTURE_MAIN_FORM?: string;
    /**
     * Extra flags for the CRM (the handler doesn't care - just passes on)
     */
    crmFlags?: object;
    /**
     * Optional services that
     */
    serviceOptions?: ContactCaptureService[];
    /**
     * Option to override the default message description in the multiline text field.
     */
    messageDescription?: string;
    /**
     * Optional availability settings to be used when calling CRMService.getAvailability()
     */
    availabilitySettings?: CrmServiceAvailabilitySettings;
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
