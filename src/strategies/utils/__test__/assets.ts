/*! Copyright (c) 2024, XAPP AI */
import { MultistepForm, FormFieldTextAddressInput } from "stentor-models";

import { ContactCaptureBlueprint } from "../../../data";

export const SIMPLE_BLUEPRINT: ContactCaptureBlueprint = {
    data: [
        {
            questionContentKey: "name",
            type: "FULL_NAME",
            required: true,
            active: true
        },
        {
            questionContentKey: "email",
            type: "EMAIL",
            required: true,
            active: true
        },
        {
            questionContentKey: "phone",
            type: "PHONE",
            required: true,
            active: true
        }
    ]
};

export const CUSTOM_FORM: MultistepForm = {
    name: "main",
    type: "FORM",
    labelHeader: false,
    header: [
        {
            "step": "contact_info",
            "label": "Contact"
        },
        {
            "step": "confirmation",
            "label": "Confirmation"
        }
    ],
    steps: [
        {
            "name": "contact_info",
            "nextAction": "submit",
            "fields": [
                {
                    "name": "full_name",
                    "label": "Name",
                    "type": "TEXT",
                    "mandatory": true
                },
                {
                    "format": "PHONE",
                    "name": "phone",
                    "label": "Phone",
                    "placeholder": "Your 10 digit phone number",
                    "type": "TEXT",
                    "mandatory": true
                },
                {
                    "format": "ADDRESS",
                    "name": "address",
                    "label": "Address",
                    "type": "TEXT",
                    "mandatory": false
                } as FormFieldTextAddressInput,
                {
                    "name": "help_type",
                    "title": "How can we help?",
                    "type": "CHIPS",
                    "items": [
                        {
                            "id": "get_quote",
                            "label": "Get Quote"
                        },
                        {
                            "id": "schedule_maintenance",
                            "label": "Schedule Maintenance"
                        },
                        {
                            "id": "service_repair",
                            "label": "Service/Repair"
                        }
                    ],
                    "mandatory": true,
                    "radio": true
                }
            ],
            "title": "Contact Information"
        },
        {
            "name": "thank_you",
            "previousAction": "omit",
            "nextAction": "omit",
            "fields": [
                {
                    "name": "thank_you_image",
                    "type": "CARD",
                    "media": {
                        "alt": "Logo",
                        "imageUrl": "https://xapp-widget-test-asset.s3.amazonaws.com/images/foo.png"
                    }
                },
                {
                    "name": "thank_you_text",
                    "header": {
                        "title": "Thank You"
                    },
                    "text": "Thank you for your request.  A representative will call you as soon as possible.",
                    "type": "CARD"
                }
            ]
        }
    ]
};
