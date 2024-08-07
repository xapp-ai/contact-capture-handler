/*! Copyright (c) 2024, XAPP AI */
import { log } from "stentor";
import { FormStep, FormFieldTextAddressInput, MultistepForm, Response, SelectableItem } from "stentor-models";
import { capitalize } from "stentor-utils";

import { ContactCaptureData } from "../../data";

interface FormResponseProps {
    /**
     * Fallback settings
     */
    fallback?: {
        /**
         * Do we enable preferred time in the booking, this is typically used for Reserve with Google.
         */
        enablePreferredTime?: boolean;
        /**
         * Is there a preselected service
         */
        service?: string;
    }
    /**
     * Name of the form to return
     */
    formName?: string;
}

/**
 * Get a simple contact us form.
 * 
 * @returns 
 */
export function getContactFormFallback(props: FormResponseProps): MultistepForm {

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

    if (props.fallback?.service) {

        // see if it is already in the items, match by id
        const found = SERVICE_CHIP_ITEMS.findIndex((item) => item.id === props.fallback.service);

        if (found >= 0) {
            // if found, set it to selected
            SERVICE_CHIP_ITEMS[found].selected = true;
        } else {
            // add it to the items
            // we need to replace _ with space
            // and capitalize first letter of each word
            const serviceRaw = props.fallback.service.replace("_", " ");
            // split by words and capitalize and recombine
            const service = serviceRaw.split(" ").map((word) => capitalize(word)).join(" ");

            SERVICE_CHIP_ITEMS.unshift({
                id: props.fallback.service,
                label: service,
                selected: true
            });
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
                    items: SERVICE_CHIP_ITEMS,
                    mandatory: true,
                    radio: true
                },
                {
                    name: "message",
                    label: "Please provide us with more details about your request",
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
            condition: "!help_type.includes('contact_us')",
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
                    text: "Somebody will call you as soon as possible to finalize the time and collect final details.",
                    align: "left",
                    type: "CARD"
                }
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

    const enableBooking = props.fallback?.enablePreferredTime;

    if (enableBooking) {
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
        return getContactFormFallback(props);
    }

    const { formName } = props;

    // no form name, use the default form
    if (!formName) {
        log().warn(`No form name provided.  Using default form.`);
        return getContactFormFallback(props);
    }

    // forms can be empty
    const formDeclaration = (data?.forms || []).find((form) => {
        return (form.name === formName);
    });

    // if we don't have a form, use the default form
    if (!formDeclaration) {
        log().warn(`No form found with name: ${formName}.  Using default form.`);
        return getContactFormFallback(props);
    } else {
        return formDeclaration;
    }
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