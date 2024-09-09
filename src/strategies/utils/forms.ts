/*! Copyright (c) 2024, XAPP AI */
import { log } from "stentor";
import { FormStep, FormFieldTextAddressInput, MultistepForm, Response, SelectableItem } from "stentor-models";
import { capitalize, existsAndNotEmpty } from "stentor-utils";

import { ContactCaptureData, ContactCaptureService, DataDescriptorBase } from "../../data";

// THE DEFAULT CHIPS
const SERVICE_CHIP_ITEMS: SelectableItem[] = [
    {
        id: "schedule_visit",
        label: "Schedule Visit"
    },
    {
        id: "get_quote",
        label: "Get Quote"
    },
    {
        id: "contact_us",
        label: "Contact Us"
    }
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

    const CONTACT_ONLY_STEPS: FormStep[] = [
        {
            crmSubmit: true,
            final: true,
            name: "contact_info",
            nextLabel: "Submit",
            nextAction: "submit",
            fields: [
                {
                    name: "full_name",
                    label: "Name",
                    type: "TEXT",
                    mandatory: true
                },
                {
                    format: "PHONE",
                    name: "phone",
                    label: "Phone",
                    placeholder: "Your 10 digit phone number",
                    type: "TEXT",
                    mandatory: true
                },
                {
                    name: "message",
                    label: "Tell us what you need help with",
                    rows: 3,
                    type: "TEXT",
                    multiline: true
                }
            ],
            title: "Contact Information"
        },
        {
            fields: [
                {
                    name: "thank_you_text",
                    header: {
                        title: "Thank You"
                    },
                    text: "Somebody will call you as soon as possible.",
                    type: "CARD"
                }
            ],
            previousAction: "omit",
            nextAction: "omit",
            name: "Thanks"
        }
    ];

    const PREFERRED_TIME_HEADER = [
        {
            step: "service_request",
            label: "Service Request"
        },
        {
            step: "contact_info",
            label: "Contact Info"
        },
        {
            step: "preferred_time",
            label: "Preferred Time"
        },
        {
            step: "confirmation",
            label: "Confirmation"
        },
        {
            step: "thank_you",
            label: "Request Submitted"
        }
    ];

    let chips: SelectableItem[] = [...SERVICE_CHIP_ITEMS];
    // this is the default one
    let contactUsChip = "contact_us";

    if (existsAndNotEmpty(props.serviceOptions)) {
        chips = props.serviceOptions;

        // make sure it has a contact_us chip by determining if the label has "Contact" or "Get in Touch"
        const found = chips.find((item) => {
            return (item.label.toLowerCase().includes("contact") || item.label.toLowerCase().includes("touch"));
        });

        if (found) {
            contactUsChip = found.id;
        } else {
            chips.push({
                id: contactUsChip,
                label: "Contact Us"
            })
        }
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
            const service = serviceRaw.split(" ").map((word) => capitalize(word)).join(" ");

            chips.unshift({
                id: props.service,
                label: service,
                selected: true
            });
        }
    }

    // make sure there is some kind of "contact" chip

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
                    radio: true
                },
                {
                    name: "message",
                    label: props.messageDescription || "Please provide us with more details about your request",
                    rows: 6,
                    type: "TEXT",
                    multiline: true,
                    mandatory: true
                }
            ]
        },
        {
            name: "contact_info",
            nextAction: "next",
            title: "Contact Information",
            fields: [
                {
                    name: "full_name",
                    label: "Name",
                    type: "TEXT",
                    mandatory: true
                },
                {
                    format: "PHONE",
                    name: "phone",
                    label: "Phone",
                    placeholder: "Your 10 digit phone number",
                    type: "TEXT",
                    mandatory: true
                },
                {
                    format: "ADDRESS",
                    name: "address",
                    label: "Address",
                    type: "TEXT",
                    mandatory: false,
                    mapsBaseUrl: "https://places.xapp.ai"
                } as FormFieldTextAddressInput
            ]
        },
        {
            name: "preferred_time",
            nextAction: "submit",
            condition: `!help_type.includes('${contactUsChip}')`,
            fields: [
                {
                    name: "dateTime",
                    title: "Preferred date",
                    type: "DATE",
                    mandatory: false
                },
                {
                    name: "preferred_time",
                    type: "CHIPS",
                    label: "Preferred Time",
                    items: [
                        {
                            id: "first_available",
                            label: "First Available"
                        },
                        {
                            id: "morning",
                            label: "Morning"
                        },
                        {
                            id: "afternoon",
                            label: "Afternoon"
                        }
                    ],
                    mandatory: true,
                    radio: true
                },
                {
                    name: "time_request_note_card",
                    text: "This is a preferred time for a possible visit for the service.  Someone will call to confirm a time and we may have something sooner than what is shown above.",
                    title: "Card",
                    type: "CARD"
                }
            ]
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
                    text: "#{help_type}",
                    type: "CARD"
                },
                {
                    name: "confirmation_card1",
                    variant: "body1",
                    condition: "!!dateTime && preferred_time.length > 0",
                    style: {
                        fontStyle: "italic"
                    },
                    text: "Time Preference",
                    type: "CARD"
                },
                {
                    name: "confirmation_card12",
                    variant: "body1",
                    condition: "!!dateTime && preferred_time.length > 0",
                    text: "#{dateTime}, #{preferred_time}",
                    type: "CARD"
                },
                {
                    name: "confirmation_card15",
                    variant: "body1",
                    text: "#{address}\n#{phone}",
                    type: "CARD"
                },
                {
                    name: "confirmation_card2",
                    condition: "!!dateTime && preferred_time.length > 0",
                    text: "Somebody will call you as soon as possible to finalize the time and collect final details.",
                    align: "left",
                    type: "CARD"
                },
                /*
                {
                    name: "confirmation_card_no_date",
                    condition: "!dateTime || preferred_time.length === 0",
                    text: "Thank you so much for getting in touch.  Somebody will reach out to you as soon as possible.",
                    align: "left",
                    type: "CARD"
                } */
            ]
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
                        title: "Thank You"
                    },
                    text: "Thank you for your request. We will get back to you as soon as possible.",
                    type: "CARD"
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
            ]
        }
    ];

    const contactUsForm: MultistepForm = {
        name: "contact_us_only",
        type: "FORM",
        header: [
            {
                "step": "contact_info",
                "label": "Contact Info"
            },
            {
                "step": "Thanks",
                "label": "Thanks"
            }
        ],
        labelHeader: true,
        steps: []
    };

    if (props.enablePreferredTime) {
        contactUsForm.name = "booking_preferred_time";
        contactUsForm.header = PREFERRED_TIME_HEADER;
        contactUsForm.steps = PREFERRED_TIME_STEPS;
    } else {
        contactUsForm.steps = CONTACT_ONLY_STEPS;
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
        log().warn(`NEW FEATURE! You must enable scheduling if you are running this standalone.  Set enableFormScheduling to true in handler data.`);

        return getContactFormFallback(data, props);
    }

    const { formName } = props;
    const hasCustomForm = existsAndNotEmpty(data.forms);

    if (!hasCustomForm) {
        log().warn(`No custom forms found.  Using default form.`);
        return getContactFormFallback({
            ...data,
            enablePreferredTime: true
        }, props);
    }

    // forms can be empty
    let formDeclaration = (data?.forms || []).find((form) => {
        return (form.name === formName);
    });

    if (!formDeclaration) {
        log().warn(`No form found with name: ${formName}.  Using first custom form.`);
        formDeclaration = data.forms[0];
    }

    // look through each step, see if there are any chips we need to preselect based on service passed in 
    if (props?.service) {
        formDeclaration.steps.forEach((step) => {
            if (existsAndNotEmpty(step.fields)) {

            }

        });
    }


    return formDeclaration;

}

export function getFormResponse(data: ContactCaptureData, props: FormResponseProps): Response {

    const form = getForm(data, props);

    // The form is a DISPLAY of type "FORM"
    const response: Response = {
        tag: "FORM",
        displays: [{ type: "FORM", ...form }],
    };

    // TODO: look through the form, at each step, see if we have chips and we need to preselect based on service
    // chips field name could be help_type or service_type

    return response;
}

/**
 * Gets the next step
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
        return (step.name == stepName);
    });

    if (!formStep) {
        throw new Error(`FormResponseStrategy: Unknown step: "${stepName}". Form: "${props.formName}"`);
    }

    return formStep;
}