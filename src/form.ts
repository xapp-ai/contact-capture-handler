/*! Copyright (c) 2024, XAPP AI */
import { BaseDisplay } from "stentor-models";

export type FormField =
    | FormCardInput
    | FormTextInput
    | FormDropdownInput
    | FormChipsInput
    | FormDateInput
    | FormDateRangeInput;

/**
 * Form field base class
 */
export interface FormInput {
    name: string;

    title?: string;

    type: "TEXT" | "DROPDOWN" | "CHECK" | "CHIPS" | "DATE" | "DATERANGE" | "CARD";
    shape?: "ROUND" | "SQUARE"; // ... not sure

    // Like "issue === 'service_repair'" - issue is a field name in this example
    // ths is to support conditional dropdowns
    condition?: string;

    mandatory?: boolean;
    mandatoryError?: string;

    style?: object; // {{ width: '300px', height: '150px' }} 
}

export interface FormFieldTextAddressInput extends FormTextInput {
    format: "ADDRESS";
    /**
     * Base URL of an endpoint that adheres to the Google Maps Location Autocomplete API.
     */
    mapsBaseUrl?: string;
    /**
     * Optional query parameters to help limit the results returned by the Google Maps Autocomplete API.
     */
    mapsUrlQueryParams?: AddressAutocompleteParameters;
    /**
     * Required when you are using the official Google Maps Autocomplete API.
     */
    googleMapsApiKey?: string;
}

/**
 * Text input. Validate according to the format.
 */
export interface FormTextInput extends FormInput {
    multiline?: boolean; // render text area
    format?: "PHONE" | "EMAIL" | "ADDRESS"; // ... default is free text
    placeholder?: string;

    label?: string;
    /**
     * Set these when multiline is true.
     */
    rows?: number;
    rowsMax?: number;
}

/**
 * Dropdown
 */
export interface FormDropdownInput extends FormInput {
    items: SelectableItem[];
}

/**
 * Close/Open style chip selection. Header plus open symbol reveals the chips.
 */
export interface FormChipsInput extends FormInput {
    /**
     * Radio buttons will require the user to only select one.
     */
    radio?: boolean; // single select
    defaultOpen?: boolean;

    minRequired?: number;
    maxAllowed?: number;

    items: SelectableItem[];
}

/**
 * Like chips but with checkboxes
 */
export interface FormSelectInput extends FormInput {
    radio?: boolean; // single select
    defaultOpen?: boolean;

    items: SelectableItem[];
}

/**
 * Card (text/image)
 */
export interface FormCardInput extends FormInput {
    header?: {
        title: string,
        subheader?: string;
    }

    media?: {
        height?: number;
        width?: number;
        imageUrl: string;
        alt?: string;
    }

    text?: string;
    variant?: string;
    color?: string;
    align?: string; // text alignment, which can be set to "left," "center," "right," or "justify."
}

/**
 * Single date
 */
export interface FormDateInput extends FormInput {
    preselecteDate?: Date;
}

/**
 * Date range
 */
export interface FormDateRangeInput extends FormInput {
    preselecteDates?: { from?: Date; to?: Date };
}

/**
 * Basically a name value pair for dropdowns or chips
 */
export interface SelectableItem {
    label: string;
    id: string;
}

/**
 * A step is partial form. Fields plus next/prev/submit buttons as needed.
 * We are going through these "mini screens".
 */
export interface FormStep {
    name: string;
    title?: string;
    fields: FormField[];

    condition?: string;

    // "submit": force "Next" instead of "Submit" (server generated next step). 
    // "omit": don't show submit button (for instance final "Thank you screen")
    nextAction?: "next" | "submit" | "omit";

    // "submit": force "Next" instead of "Submit" (server generated next step). 
    // "omit": don't show submit button (for instance final "Thank you screen")
    previousAction?: "previous" | "submit" | "omit";

    //Force label
    nextLabel?: string;
    previousLabel?: string;

    // Means we have collected everything we could. This is used to tell,
    // that we don't report close (abandoned) after this.
    final?: boolean;

    // Server should send the data to the crm
    crmSubmit?: boolean;
}

/**
 * This is for the top header. The "step" is the name of the step the click should take to.
 */
export interface FormHeaderItem {
    label: string;
    step: string;
}

export interface MultistepForm extends BaseDisplay {
    type: "FORM";
    name: string;
    header: FormHeaderItem[];
    labelHeader: boolean;
    steps: FormStep[];
}


export interface AddressAutocompleteParameters {
    /**
     * This will look like components=country:us or components=country:us|country:ca
     * 
     * @see https://developers.google.com/maps/documentation/places/web-service/autocomplete#components
     */
    components?: string;
    /**
     * The text string on which to search. The Places service will return candidate matches based on this string and order results based on their perceived relevance.
     */
    language?: string;
    /**
     * A text that is the lat & long of the location to use as the center of the search.
     * 
     * For example, location=37.76999,-122.44696
     */
    location?: string;
    locationbias?: string;
    locationrestriction?: string;
    /**
     * When using location with a specific lat & long, this must be provided.
     * 
     * This is in meters
     */
    radius?: string;
    /**
     * The API key, only required when using the official Google Maps API.
     */
    key?: string;
}
