/*! Copyright (c) 2024, XAPP AI */
import { log } from "stentor-logger";
import type {
    FormChipsInput,
    FormDropdownInput,
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
        mandatoryGroup: "contact_method",
        mandatoryError: "Please provide either a phone number or email address",
    },
    {
        format: "EMAIL",
        name: "email",
        label: "Email",
        placeholder: "Your email address",
        type: "TEXT",
        mandatoryGroup: "contact_method",
        mandatoryError: "Please provide either a phone number or email address",
    },
    {
        name: "zip",
        label: "Zip Code",
        placeholder: "Your zip code",
        type: "TEXT",
        mandatory: true,
    },
];

export interface FieldSettings {
    required?: boolean;
}

/**
 * Sanitizes a service ID to be safely used in conditionals.
 * Removes potentially dangerous characters that could break JavaScript evaluation.
 * @param id - The service ID to sanitize
 * @returns Sanitized service ID safe for use in conditionals
 */
function sanitizeServiceId(id: string): string {
    // Only allow alphanumeric characters, underscores, and hyphens
    // This prevents injection of quotes, parentheses, or other special characters
    return id.replace(/[^a-zA-Z0-9_-]/g, "");
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
     * Optional disclaimer to show before submitting the form.
     */
    disclaimer?: {
        text: string;
        requireAccepted?: boolean;
    };
    /**
     * Optional services that will be displayed to the user in the form widget.
     *
     * For example: "Get Quote", "Request HVAC Service", "Schedule Appointment"
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
    /**
     * When true, removes the 'preferred_date' field from the preferred time form,
     * removes the mandatoryGroup from the dateTime field, and makes dateTime mandatory.
     */
    turnOffFirstAvailableDay?: boolean;
    /**
     * Custom options for the preferred time field. Replaces the default items
     * (First Available Time, Morning, Afternoon) with user-defined options.
     */
    preferredTimeOptions?: SelectableItem[];
    /**
     * Custom confirmation text for the preferred date/time selection.
     * If provided, replaces the default text shown in the preferred_time_confirmation_message field.
     */
    preferredDateConfirmationText?: string;
    /**
     * Controls the input type for the service selection on the first page of the fallback form.
     *
     * - `"chips"` (default): Displays service options as interactive chip buttons
     * - `"dropdown"`: Displays service options as a dropdown/select field
     *
     * This only affects the first step (service_request) of forms with enablePreferredTime=true.
     *
     * @default "chips"
     * @example
     * // Use dropdown instead of chips for service selection
     * { firstPageInputType: "dropdown" }
     */
    firstPageInputType?: "chips" | "dropdown";
    /**
     * Controls whether the message textarea field is displayed on the first page of the fallback form.
     *
     * When set to `false`, the message field will be hidden from the first page (service_request step).
     * This is useful when you want a simpler first page with just service selection.
     *
     * Note: This only affects the first step of forms with enablePreferredTime=true.
     * For contact-only forms (enablePreferredTime=false), the message field is always displayed
     * as it's a core part of the single-step contact form.
     *
     * @default true
     * @example
     * // Hide message field on first page
     * { showFirstPageMessage: false }
     */
    showFirstPageMessage?: boolean;
    /**
     * Custom title/question text for the service selection field on the first page.
     *
     * This text appears as the title/prompt above the chips or dropdown selection field
     * where users select which service they need help with.
     *
     * This only affects the first step (service_request) of forms with enablePreferredTime=true.
     *
     * @default "What can we help you with?"
     * @example
     * // Customize the service selection prompt
     * { serviceSelectionTitle: "How can we assist you today?" }
     * @example
     * // Use a more specific prompt
     * { serviceSelectionTitle: "What type of service do you need?" }
     */
    serviceSelectionTitle?: string;
}

/**
 * Get a simple contact us form.
 *
 * @returns
 */
export function getContactFormFallback(data: ContactCaptureData, props: FormResponseProps): MultistepForm {
    // Create a merged configuration object without mutating the input props
    // Props take precedence over data - only apply data values if props don't have them
    const mergedProps: FormResponseProps = {
        ...(typeof data.enablePreferredTime === "boolean" && { enablePreferredTime: data.enablePreferredTime }),
        ...(typeof data.turnOffFirstAvailableDay === "boolean" && {
            turnOffFirstAvailableDay: data.turnOffFirstAvailableDay,
        }),
        ...(existsAndNotEmpty(data.preferredTimeOptions) && { preferredTimeOptions: data.preferredTimeOptions }),
        ...(data.preferredDateConfirmationText && { preferredDateConfirmationText: data.preferredDateConfirmationText }),
        ...(data.firstPageInputType && { firstPageInputType: data.firstPageInputType }),
        ...(typeof data.showFirstPageMessage === "boolean" && { showFirstPageMessage: data.showFirstPageMessage }),
        ...(data.serviceSelectionTitle && { serviceSelectionTitle: data.serviceSelectionTitle }),
        ...(existsAndNotEmpty(data.capture?.serviceOptions) && { serviceOptions: data.capture.serviceOptions }),
        ...(data.capture?.messageDescription && { messageDescription: data.capture.messageDescription }),
        ...(data.capture?.disclaimer && { disclaimer: data.capture.disclaimer }),
        ...props, // Props override data
    };

    // Use mergedProps instead of props throughout the rest of the function
    props = mergedProps;

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
        // Sanitize the service ID to ensure it only contains safe characters
        const sanitizedServiceId = sanitizeServiceId(props.service);

        // see if it is already in the items, match by id
        const found = chips.findIndex((item) => item.id === sanitizedServiceId);

        if (found >= 0) {
            // if found, set it to selected
            chips[found].selected = true;
        } else {
            // add it to the items
            // we need to replace _ with space
            // and capitalize first letter of each word
            const serviceRaw = sanitizedServiceId.replace(/_/g, " ");
            // split by words and capitalize and recombine
            const service = serviceRaw
                .split(" ")
                .map((word) => capitalize(word))
                .join(" ");

            chips.unshift({
                id: sanitizedServiceId,
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
            } else if (dataField.slotName === "selection") {
                const selectionField: FormChipsInput = {
                    type: "CHIPS",
                    name: "selection",
                    radio: dataField.radio || false,
                    title: dataField.title || "Select an option",
                    mandatory: dataField.required || false,
                    items: [],
                };

                // go through the enums on the dataField and make items
                (dataField.enums || [])?.forEach((enumOption) => {
                    selectionField.items.push({
                        label: enumOption,
                        id: enumOption.toUpperCase(),
                    });
                });

                CONTACT_FIELDS.push(selectionField);
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
                // Sanitize the chip ID to prevent injection attacks in the conditional
                const sanitizedId = sanitizeServiceId(chip.id);
                return `help_type.includes('${sanitizedId}')`;
            })
            .join(" || ");

        // edge case, if we have an empty string, meaning they didn't want any of the chips to go to preferred time, we just false
        if (preferredTimeConditional.length === 0) {
            preferredTimeConditional = "false";
        }
    }

    const confirmationFields: FormField[] = [
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
            name: "confirmation_card_request_details",
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
            name: "preferred_time_confirmation_message",
            condition: "(!!dateTime || !!preferred_date) && preferred_time?.length > 0",
            text: props.preferredDateConfirmationText || "Someone from our team will contact you son to confirm the date & time as well as additional details",
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
    ];

    // Add disclaimer fields if provided
    if (props.disclaimer) {
        confirmationFields.push({
            name: "confirmation_card3_disclaimer",
            //   condition: "!!help_type && !help_type.includes('contact_us')",
            text: "DISCLAIMER",
            align: "left",
            type: "CARD",
            style: {
                marginTop: "15px",
                fontStyle: "normal",
                fontWeight: "bold",
            },
        });
        confirmationFields.push({
            name: "confirmation_card3",
            //   condition: "!!help_type && !help_type.includes('contact_us')",
            text: props.disclaimer.text,
            type: "CARD",
            style: {
                display: "flex",
                margin: "auto",
                width: "60%",
                fontWeight: "bold",
                fontSize: "0.8rem",
            },
        });

        // Add consent checkbox if required
        if (props.disclaimer.requireAccepted) {
            confirmationFields.push({
                name: "consent_approval",
                //   condition: "!!help_type && !help_type.includes('contact_us')",
                type: "CHECK",
                items: [
                    {
                        id: "agreed",
                        label: "I agree",
                    },
                ],
                mandatory: true,
                mandatoryError: 'Please click "I agree" to submit your request.',
            });
        }
    }

    // Build the preferred_time step fields based on configuration
    const preferredTimeFields: FormField[] = [];

    // Add dateTime field
    if (props.turnOffFirstAvailableDay) {
        // When turnOffFirstAvailableDay is true, make dateTime mandatory without mandatoryGroup
        preferredTimeFields.push({
            name: "dateTime",
            title: "Preferred date",
            type: "DATE",
            mandatory: true,
            mandatoryError: "Please select a date",
            // pass through busy day information
            defaultBusyDays: data.availabilitySettings?.defaultBusyDays,
        });
    } else {
        // Default behavior with mandatoryGroup
        preferredTimeFields.push({
            name: "dateTime",
            title: "Preferred date",
            type: "DATE",
            mandatoryGroup: "date",
            mandatoryError: "Please select either a date or first available date",
            // pass through busy day information
            defaultBusyDays: data.availabilitySettings?.defaultBusyDays,
        });

        // Only add preferred_date field if turnOffFirstAvailableDay is not set
        preferredTimeFields.push({
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
        });
    }

    // Add time preference card
    preferredTimeFields.push({
        name: "card_time_preference",
        variant: "body1",
        style: {
            marginTop: "10px",
            fontWeight: "bold",
        },
        text: "Preferred Time",
        type: "CARD",
    });

    // Add preferred_time field with custom or default items
    const preferredTimeItems = existsAndNotEmpty(props.preferredTimeOptions)
        ? props.preferredTimeOptions
        : [
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
          ];

    preferredTimeFields.push({
        name: "preferred_time",
        type: "CHIPS",
        label: "Preferred Time",
        style: {
            fontWeight: "bold",
        },
        items: preferredTimeItems,
        mandatory: true,
        radio: true,
    });

    // Add note card
    preferredTimeFields.push({
        name: "time_request_note_card",
        text: "These are only date and time preferences. Someone will confirm the date & time with you.",
        style: {
            fontStyle: "italic",
        },
        title: "Card",
        type: "CARD",
    });

    // Build the service selection field based on firstPageInputType
    const serviceSelectionTitle = props.serviceSelectionTitle || "What can we help you with?";
    const serviceSelectionField: FormChipsInput | FormDropdownInput =
        props.firstPageInputType === "dropdown"
            ? {
                  name: "help_type",
                  title: serviceSelectionTitle,
                  type: "DROPDOWN",
                  items: chips,
                  mandatory: true,
              }
            : {
                  name: "help_type",
                  title: serviceSelectionTitle,
                  type: "CHIPS",
                  items: chips,
                  mandatory: true,
                  radio: true,
              };

    // Build the first step fields array
    const firstStepFields: FormField[] = [serviceSelectionField];

    // Conditionally add message field based on showFirstPageMessage (defaults to true)
    if (props.showFirstPageMessage !== false) {
        firstStepFields.push({
            name: "message",
            label: props.messageDescription || "Please provide us with more details about your request",
            rows: 6,
            type: "TEXT",
            multiline: true,
            mandatory: requiredMessage,
        });
    }

    const PREFERRED_TIME_STEPS: FormStep[] = [
        {
            name: "service_request",
            nextAction: "next",
            fields: firstStepFields,
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
            fields: preferredTimeFields,
        },
        {
            final: true,
            name: "confirmation",
            nextLabel: "Submit",
            crmSubmit: true,
            nextAction: "submit",
            fields: confirmationFields,
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
                    variant: "h4",
                    text: "We are sorry, your address is outside of our service area.",
                    style: {
                        minHeight: "200px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    },
                },
            ],
        });

        // add the header too.
        PREFERRED_TIME_HEADER.splice(2, 0, {
            step: "out_of_service_area",
            label: "Out of Service Area",
        });
    }

    // Build contact-only form fields
    const contactOnlyFields: FormField[] = [
        // name
        { ...CONTACT_FIELDS[nameFieldIndex] },
    ];

    // Add both phone and email if they exist (they should have mandatoryGroup set)
    if (phoneFieldIndex >= 0) {
        contactOnlyFields.push({ ...CONTACT_FIELDS[phoneFieldIndex] });
    }
    if (emailFieldIndex >= 0) {
        contactOnlyFields.push({ ...CONTACT_FIELDS[emailFieldIndex] });
    }

    // message
    contactOnlyFields.push({
        name: "message",
        label: props.messageDescription || "Let us know what we can help you with.",
        rows: 3,
        type: "TEXT",
        multiline: true,
        mandatory: true,
    });

    // Add disclaimer fields to contact-only form if provided
    if (props.disclaimer) {
        contactOnlyFields.push({
            name: "confirmation_card3_disclaimer",
            text: "DISCLAIMER",
            align: "left",
            type: "CARD",
            style: {
                marginTop: "15px",
                fontStyle: "normal",
                fontWeight: "bold",
            },
        });

        contactOnlyFields.push({
            name: "confirmation_card3_disclaimer_text",
            text: props.disclaimer.text,
            type: "CARD",
            style: {
                display: "flex",
                margin: "auto",
                width: "60%",
                fontWeight: "bold",
                fontSize: "0.8rem",
            },
        });

        // Add consent checkbox if required
        if (props.disclaimer.requireAccepted) {
            contactOnlyFields.push({
                name: "consent_approval",
                type: "CHECK",
                items: [
                    {
                        id: "agreed",
                        label: "I agree",
                    },
                ],
                mandatory: true,
                mandatoryError: 'Please click "I agree" to submit your request.',
            });
        }
    }

    const CONTACT_ONLY_STEPS: FormStep[] = [
        {
            crmSubmit: true,
            final: true,
            name: "contact_info",
            nextLabel: "Submit",
            nextAction: "submit",
            fields: contactOnlyFields,
            title: "Contact Information",
        },
        {
            fields: [
                {
                    name: "thank_you_text",
                    header: {
                        title: "Thank You",
                    },
                    text: "Somebody from our team will contact you as soon as possible to follow up with your request.",
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
                        (serviceChip as SelectableItem).selected = true;
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
