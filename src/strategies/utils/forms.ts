/*! Copyright (c) 2024, XAPP AI */
import { log } from "stentor-logger";
import type {
    FormChipsInput,
    FormField,
    FormFieldTextAddressInput,
    FormStep,
    FormTextInput,
    MultistepForm,
    Response,
    SelectableItem,
} from "stentor-models";
import { capitalize, existsAndNotEmpty } from "stentor-utils";

import { ContactCaptureData, ContactCaptureService, DataDescriptorBase } from "../../data";
import { isFormDateInput } from "../../guards";

// THE DEFAULT CHIPS
export const DEFAULT_SERVICE_CHIP_ITEMS: SelectableItem[] = [
    {
        id: "schedule_visit",
        label: "Schedule Visit",
    },
    {
        id: "get_quote",
        label: "Get Quote",
    },
    {
        id: "contact_us",
        label: "Contact Us",
    },
];

export const DEFAULT_CONTACT_FIELDS: FormField[] = [
    {
        name: "full_name",
        label: "Name",
        type: "TEXT",
        placeholder: "Full Name",
        mandatory: true,
    },
    {
        format: "PHONE",
        name: "phone",
        label: "Phone",
        placeholder: "Your 10 digit phone number",
        type: "TEXT",
        mandatory: true,
    },
    {
        format: "ADDRESS",
        name: "address",
        label: "Address",
        type: "TEXT",
        mandatory: false,
        mapsBaseUrl: "https://places.xapp.ai",
    } as FormFieldTextAddressInput,
];

export interface FieldSettings {
    required?: boolean;
}

export interface FormResponseProps {
    /**
     * Enables preferred time form
     */
    enablePreferredTime?: boolean;
    /**
     * Name of the form to return
     */
    formName?: string;
    /**
     * Optional service options to display in the fallback form
     */
    serviceOptions?: ContactCaptureService[];
    /**
     * Optional header overrides for the fallback form
     */
    headerOverrides?: string[];
    /**
     * Optional message description to help people leave meaningful messages
     */
    messageDescription?: string;
    /**
     * Is there a preselected service
     */
    service?: string;
    /**
     * The fields to capture
     */
    fields?: DataDescriptorBase[];
}

/**
 * Get a simple contact us form.
 *
 * @returns
 */
export function getContactFormFallback(data: ContactCaptureData, props: FormResponseProps): MultistepForm {
    if (typeof data.enablePreferredTime === "boolean") {
        props.enablePreferredTime = data.enablePreferredTime;
    }

    if (existsAndNotEmpty(data.capture?.serviceOptions)) {
        props.serviceOptions = data.capture?.serviceOptions;
    }

    if (data.capture?.messageDescription) {
        props.messageDescription = data.capture?.messageDescription;
    }

    const PREFERRED_TIME_HEADER = [
        {
            step: "service_request",
            label: "Request",
        },
        {
            step: "contact_info",
            label: "Contact Info",
        },
        {
            step: "preferred_time",
            label: "Preferred Date",
        },
        {
            step: "confirmation",
            label: "Review",
        },
        {
            step: "thank_you",
            label: "Request Submitted",
        },
    ];

    let chips: SelectableItem[] = [...DEFAULT_SERVICE_CHIP_ITEMS];

    // let contactUsChip = "contact_us";

    if (existsAndNotEmpty(props.serviceOptions)) {
        chips = props.serviceOptions;
    }

    if (props?.service) {
        // see if it is already in the items, match by id
        const found = chips.findIndex((item) => item.id === props.service);

        if (found >= 0) {
            // if found, set it to selected
            chips[found].selected = true;
        } else {
            // add it to the items
            // we need to replace _ with space
            // and capitalize first letter of each word
            const serviceRaw = props.service.replace("_", " ");
            // split by words and capitalize and recombine
            const service = serviceRaw
                .split(" ")
                .map((word) => capitalize(word))
                .join(" ");

            chips.unshift({
                id: props.service,
                label: service,
                selected: true,
            });
        }
    }

    // we display this on the first page
    let requiredMessage = true;

    // Setup the contact information capture
    let CONTACT_FIELDS: FormField[] = [...DEFAULT_CONTACT_FIELDS];

    // see if we have any data fields and override the defaults
    if (existsAndNotEmpty(data.capture.data)) {
        // first filter to make sure we only adding ones meant for form
        // and are active
        const dataFields = data.capture.data.filter((dataItem) => {
            return dataItem.channel !== "CHAT" && dataItem.active !== false;
        });

        CONTACT_FIELDS = [];

        // find full_name, email, phone, address
        // message is already included by default
        dataFields.forEach((dataField) => {
            // default and will build depending on data
            const field: FormField = {
                name: dataField.slotName,
                label: capitalize(dataField.slotName),
                type: "TEXT",
                mandatory: dataField.required,
            };

            // look for first_name or last_name

            if (dataField.slotName === "full_name" || dataField.slotName === "name") {
                const namefield: FormTextInput = {
                    ...field,
                    name: "full_name",
                    multiline: false,
                    label: "Name",
                    placeholder: "Your full name",
                    // always mandatory
                    mandatory: true,
                };
                CONTACT_FIELDS.push(namefield);
            } else if (dataField.slotName === "email") {
                const emailField: FormTextInput = {
                    ...field,
                    format: "EMAIL",
                    placeholder: "Your email address",
                };
                CONTACT_FIELDS.push(emailField);
            } else if (dataField.slotName === "phone") {
                const phoneField: FormTextInput = {
                    ...field,
                    format: "PHONE",
                    placeholder: "Your phone number we can best reach you on",
                };
                CONTACT_FIELDS.push(phoneField);
            } else if (dataField.slotName === "zip") {
                const zipField: FormTextInput = {
                    ...field,
                    placeholder: "Your zip code",
                };
                CONTACT_FIELDS.push(zipField);
            } else if (dataField.slotName === "address") {
                const addressField: FormFieldTextAddressInput = {
                    ...field,
                    format: "ADDRESS",
                    mapsBaseUrl: "https://places.xapp.ai",
                };
                if (data.capture.addressAutocompleteParams) {
                    addressField.mapsUrlQueryParams = data.capture.addressAutocompleteParams;
                }
                CONTACT_FIELDS.push(addressField);
            } else if (dataField.slotName === "message") {
                if (typeof dataField.required === "boolean") {
                    requiredMessage = dataField.required;
                }
            }
        });
    }

    // find index of name field
    let nameFieldIndex = CONTACT_FIELDS.findIndex((field) => field.name === "full_name");

    if (nameFieldIndex < 0) {
        // add a default name field
        CONTACT_FIELDS.unshift({
            name: "full_name",
            label: "Name",
            type: "TEXT",
            placeholder: "Your full name",
            mandatory: true,
        });

        nameFieldIndex = 0;
    }

    let phoneFieldIndex = CONTACT_FIELDS.findIndex((field) => field.name === "phone");

    const emailFieldIndex = CONTACT_FIELDS.findIndex((field) => field.name === "email");

    // make sure we have either phone or email
    if (phoneFieldIndex < 0 && emailFieldIndex < 0) {
        // add a default phone field
        CONTACT_FIELDS.push({
            format: "PHONE",
            name: "phone",
            label: "Phone",
            placeholder: "Your 10 digit phone number",
            type: "TEXT",
            mandatory: true,
        });

        phoneFieldIndex = CONTACT_FIELDS.length - 1;
    }

    // if we have the autocomplete suggestions and the params, append them
    if (data.capture.addressAutocompleteParams) {
        // loop through the fields and find the ADDRESS field
        // and append them
        CONTACT_FIELDS.forEach((field) => {
            if (field.name === "address") {
                const addressField = field as FormFieldTextAddressInput;
                addressField.mapsUrlQueryParams = data.capture.addressAutocompleteParams;
            }
        });
    }

    // figure out a preferred time conditional based on the service options
    let preferredTimeConditional = `!help_type.includes('contact_us')`;

    // we now loop through our services and build the conditional
    // these will override the default, it turns into a
    if (existsAndNotEmpty(props.serviceOptions)) {
        preferredTimeConditional = props.serviceOptions
            .filter((service) => service.requiresDate)
            .map((chip) => {
                return `help_type.includes('${chip.id}')`;
            })
            .join(" || ");

        // edge case, if we have an empty string, meaning they didn't want any of the chips to go to preferred time, we just false
        if (preferredTimeConditional.length === 0) {
            preferredTimeConditional = "false";
        }
    }

    const PREFERRED_TIME_STEPS: FormStep[] = [
        {
            name: "service_request",
            nextAction: "next",
            fields: [
                {
                    name: "help_type",
                    title: "What can we help you with?",
                    type: "CHIPS",
                    items: chips,
                    mandatory: true,
                    radio: true,
                },
                {
                    name: "message",
                    label: props.messageDescription || "Please provide us with more details about your request",
                    rows: 6,
                    type: "TEXT",
                    multiline: true,
                    mandatory: requiredMessage,
                },
            ],
        },
        {
            name: "contact_info",
            nextAction: "next",
            title: "Contact Information",
            fields: CONTACT_FIELDS,
        },
        {
            name: "preferred_time",
            nextAction: "submit",
            condition: preferredTimeConditional,
            fields: [
                {
                    name: "dateTime",
                    title: "Preferred date",
                    type: "DATE",
                    mandatoryGroup: "date",
                    mandatoryError: "Please select either a date or first available date",
                    // pass through busy day information
                    defaultBusyDays: data.availabilitySettings?.defaultBusyDays,
                },
                {
                    name: "preferred_date",
                    type: "CHIPS",
                    label: "Preferred Date",
                    style: {
                        fontWeight: "bold",
                    },
                    items: [
                        {
                            id: "first_available",
                            label: "First Available Date",
                        },
                    ],
                    mandatoryGroup: "date",
                    mandatoryError: "Please select either a date or first available date",
                },
                {
                    name: "card_time_preference",
                    variant: "body1",
                    style: {
                        marginTop: "10px",
                        fontWeight: "bold",
                    },
                    text: "Preferred Time",
                    type: "CARD",
                },

                {
                    name: "preferred_time",
                    type: "CHIPS",
                    label: "Preferred Time",
                    style: {
                        fontWeight: "bold",
                    },
                    items: [
                        {
                            id: "first_available",
                            label: "First Available Time",
                        },
                        {
                            id: "morning",
                            label: "Morning",
                        },
                        {
                            id: "afternoon",
                            label: "Afternoon",
                        },
                    ],
                    mandatory: true,
                    radio: true,
                },
                {
                    name: "time_request_note_card",
                    text: "These are only date and time preferences.  Someone will confirm the time with you.",
                    style: {
                        fontStyle: "italic",
                    },
                    title: "Card",
                    type: "CARD",
                },
            ],
        },
        {
            final: true,
            name: "confirmation",
            nextLabel: "Submit",
            crmSubmit: true,
            nextAction: "submit",
            fields: [
                {
                    name: "confirmation_card0",
                    variant: "h6",
                    style: {
                        fontStyle: "normal",
                        fontWeight: "bold",
                    },
                    text: "#{help_type} Request",
                    type: "CARD",
                },
                {
                    name: "confirmation_card_data_and_time_preference",
                    variant: "body1",
                    condition: "(!!dateTime || !!preferred_date) || preferred_time?.length > 0",
                    style: {
                        fontStyle: "normal",
                        fontWeight: "bold",
                    },
                    text: "Date & Time Preference",
                    type: "CARD",
                },
                {
                    name: "confirmation_card1_display_date_with_preferred_time",
                    variant: "body1",
                    condition: "!!dateTime && preferred_time?.length > 0",
                    text: "#{dateTime}, #{preferred_time}",
                    type: "CARD",
                },
                {
                    name: "confirmation_card1_display_date_or_display",
                    variant: "overline",
                    condition: "!!dateTime && !!preferred_date && preferred_time?.length > 0",
                    text: "or",
                    type: "CARD",
                },
                {
                    name: "confirmation_card1_display_preferred_date_with_preferred_time",
                    variant: "body1",
                    condition: "!!preferred_date && preferred_time?.length > 0",
                    text: "#{preferred_date}, #{preferred_time}",
                    type: "CARD",
                },
                {
                    name: "confirmation_card_details",
                    variant: "body1",
                    text: "Contact Information",
                    style: {
                        fontStyle: "normal",
                        fontWeight: "bold",
                    },
                    condition: "!!message || !!address || !!phone || !!email",
                    type: "CARD",
                },
                {
                    name: "confirmation_card_name",
                    variant: "body1",
                    text: "#{full_name}",
                    condition: "!!full_name",
                    type: "CARD",
                },
                {
                    name: "confirmation_card_address",
                    variant: "body1",
                    text: "#{address}",
                    condition: "!!address",
                    type: "CARD",
                },
                {
                    name: "confirmation_card_phone",
                    variant: "body1",
                    text: "#{phone}",
                    condition: "!!phone",
                    type: "CARD",
                },
                {
                    name: "confirmation_card_email",
                    variant: "body1",
                    text: "#{email}",
                    condition: "!!email",
                    type: "CARD",
                },
                {
                    name: "confirmation_card_details",
                    variant: "body1",
                    text: "Request Details",
                    style: {
                        fontStyle: "normal",
                        fontWeight: "bold",
                    },
                    condition: "!!message",
                    type: "CARD",
                },
                {
                    name: "confirmation_card_message",
                    variant: "body1",
                    text: "#{message}",
                    condition: "!!message",
                    style: {
                        fontStyle: "italic",
                    },
                    type: "CARD",
                },
                {
                    name: "confirmation_card2_important",
                    condition: "(!!dateTime || !!preferred_date) && preferred_time?.length > 0",
                    text: "IMPORTANT",
                    align: "left",
                    type: "CARD",
                    style: {
                        marginTop: "15px",
                        fontStyle: "normal",
                        fontWeight: "bold",
                    },
                },
                {
                    name: "confirmation_card2_message",
                    condition: "(!!dateTime || !!preferred_date) && preferred_time?.length > 0",
                    text: "Someone will contact you soon to confirm the date & time as well as additional details",
                    type: "CARD",
                    align: "center",
                    variant: "caption",
                    style: {
                        display: "flex",
                        margin: "auto",
                        width: "60%",
                        fontWeight: "bold",
                        fontSize: "0.8rem",
                    },
                },
            ],
        },
        {
            name: "thank_you",
            previousAction: "omit",
            nextAction: "omit",
            fields: [
                {
                    name: "thank_you_text",
                    // condition: "!!help_type.includes('contact_us')",
                    header: {
                        title: "Thank You",
                    },
                    text: "Thank you for your request. We will get back to you as soon as possible.",
                    type: "CARD",
                },
                /*
                {
                    name: "thank_you_text",
                    condition: "!help_type.includes('contact_us')",
                    header: {
                        title: "Thank You"
                    },
                    text: "Thank you for your request.  Someone will call you to confirm the time with you.",
                    type: "CARD"
                } */
            ],
        },
    ];

    // See if we have serviceArea on the capture blueprint data and we have either zip code or address input
    const hasZipCodeInput = CONTACT_FIELDS.some((field) => {
        return (
            field.name.toLowerCase() === "zip" ||
            (field.name.toLowerCase() === "address" && (field as FormFieldTextAddressInput).format === "ADDRESS")
        );
    });

    if (hasZipCodeInput && existsAndNotEmpty(data?.capture?.serviceArea?.zipCodes)) {
        // create the zip code string, which is just a comma separated list of zip codes
        const zip = data.capture.serviceArea.zipCodes;

        // insert a step at index 2
        PREFERRED_TIME_STEPS.splice(2, 0, {
            name: "out_of_service_area",
            condition: `!isInServiceArea(zip, ['${zip.join("', '")}'])`,
            nextAction: "omit",
            fields: [
                {
                    name: "out_of_service_area",
                    type: "CARD",
                    variant: "body1",
                    text: "We are sorry, your address is outside of our service area.",
                },
            ],
        });
    }

    const indexForPhoneOrEmail = emailFieldIndex >= 0 ? emailFieldIndex : phoneFieldIndex;

    const CONTACT_ONLY_STEPS: FormStep[] = [
        {
            crmSubmit: true,
            final: true,
            name: "contact_info",
            nextLabel: "Submit",
            nextAction: "submit",
            fields: [
                // name
                { ...CONTACT_FIELDS[nameFieldIndex] },
                // phone (or email)
                { ...CONTACT_FIELDS[indexForPhoneOrEmail] },
                // message
                {
                    name: "message",
                    label: props.messageDescription || "Let us know what we can help you with.",
                    rows: 3,
                    type: "TEXT",
                    multiline: true,
                    mandatory: true,
                },
            ],
            title: "Contact Information",
        },
        {
            fields: [
                {
                    name: "thank_you_text",
                    header: {
                        title: "Thank You",
                    },
                    text: "Somebody will contact you as soon as possible to follow up with your request.",
                    type: "CARD",
                },
            ],
            previousAction: "omit",
            nextAction: "omit",
            name: "Thanks",
        },
    ];

    // Now build the fallback form

    const contactUsForm: MultistepForm = {
        name: "contact_us_only",
        type: "FORM",
        header: [
            {
                step: "contact_info",
                label: "Contact Info",
            },
            {
                step: "Thanks",
                label: "Thanks",
            },
        ],
        labelHeader: true,
        steps: [],
    };

    if (props.enablePreferredTime) {
        contactUsForm.name = "booking_preferred_time";
        contactUsForm.header = PREFERRED_TIME_HEADER;
        contactUsForm.steps = PREFERRED_TIME_STEPS;
    } else {
        contactUsForm.name = "contact_us_only";
        contactUsForm.steps = CONTACT_ONLY_STEPS;
    }

    // look at the headers and apply the overrides
    if (existsAndNotEmpty(props.headerOverrides)) {
        // loop through the header and find the step
        props.headerOverrides.forEach((header, index) => {
            if (contactUsForm.header[index] && !!header) {
                contactUsForm.header[index].label = header;
            }
        });
    }

    return contactUsForm;
}

/**
 * Gets the current form in use
 *
 * @param data
 * @param props
 * @returns
 */
function getForm(data: ContactCaptureData, props: FormResponseProps): MultistepForm {
    // check if scheduling is enabled, otherwise use the fallback form
    if (!data?.enableFormScheduling) {
        // remove this after a couple of releases
        log().warn(
            `NEW FEATURE! You must enable scheduling if you are running this standalone.  Set enableFormScheduling to true in handler data.`,
        );

        return getContactFormFallback(data, props);
    }

    const { formName } = props;
    const hasCustomForm = existsAndNotEmpty(data.forms);

    if (!hasCustomForm) {
        log().warn(`No custom forms found.  Using default form.`);
        return getContactFormFallback(
            {
                ...data,
                enablePreferredTime: true,
            },
            props,
        );
    }

    // forms can be empty
    let formDeclaration = (data?.forms || []).find((form) => {
        return form.name === formName;
    });

    if (!formDeclaration) {
        log().warn(`No form found with name: ${formName}.  Using first custom form.`);
        formDeclaration = data.forms[0];
    }

    // Going to augment the form with the service chip selected or default busy days
    formDeclaration.steps.forEach((step) => {
        if (existsAndNotEmpty(step.fields)) {
            if (props?.service) {
                // look for chip type
                const chipField: FormChipsInput = step.fields.find((field) => {
                    return field.type === "CHIPS";
                }) as FormChipsInput;

                if (chipField) {
                    // find the service chip
                    const serviceChip = chipField.items.find((item) => {
                        return item.id === props.service;
                    });

                    if (serviceChip) {
                        serviceChip.selected = true;
                    }
                }
            }

            // Also look for a DATE type field
            // and we set defaultBusyDays
            const dateField = step.fields.find((field) => {
                return isFormDateInput(field);
            });

            // see if they have any default busy days by checking keys on the
            const hasDefaultBusyDays = Object.keys(dateField?.defaultBusyDays || {}).length > 0;

            if (!!dateField && !hasDefaultBusyDays) {
                dateField.defaultBusyDays = data?.availabilitySettings?.defaultBusyDays;
            }
        }
    });

    return formDeclaration;
}

export function getFormResponse(data: ContactCaptureData, props: FormResponseProps): Response {
    const form = getForm(data, props);

    // The form is a DISPLAY of type "FORM"
    const response: Response = {
        tag: "FORM",
        displays: [{ type: "FORM", ...form }],
    };

    return response;
}

/**
 * Gets the next step from the form
 *
 * @param data
 * @param formName
 * @param stepName
 * @returns
 */
export function getStepFromData(data: ContactCaptureData, props: FormResponseProps, stepName: string): FormStep {
    const formDeclaration = getForm(data, props);

    if (!formDeclaration) {
        throw new Error(`FormResponseStrategy: Unknown form: "${props.formName}"`);
    }

    const formStep = formDeclaration.steps.find((step) => {
        return step.name == stepName;
    });

    if (!formStep) {
        // this is getting thrown frequently  with undefined stepName and undefined formName
        throw new Error(`FormResponseStrategy: Unknown step: "${stepName}". Form: "${props.formName}"`);
    }

    return formStep;
}
