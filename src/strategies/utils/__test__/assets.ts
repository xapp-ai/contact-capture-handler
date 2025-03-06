/*! Copyright (c) 2024, XAPP AI */
import { MultistepForm, FormFieldTextAddressInput } from "stentor-models";

import { ContactCaptureBlueprint } from "../../../data";

export const SIMPLE_BLUEPRINT: ContactCaptureBlueprint = {
    data: [
        {
            slotName: "full_name",
            questionContentKey: "name",
            type: "FULL_NAME",
            required: true,
            active: true,
        },
        {
            slotName: "email",
            questionContentKey: "email",
            type: "EMAIL",
            required: false,
            active: true,
        },
        {
            slotName: "phone",
            questionContentKey: "phone",
            type: "PHONE",
            required: true,
            active: true,
        },
        {
            slotName: "address",
            questionContentKey: "address",
            type: "ADDRESS",
            required: true,
            active: false,
        },
        {
            slotName: "address",
            questionContentKey: "address",
            type: "ADDRESS",
            required: true,
            active: true,
            channel: "CHAT",
        },
    ],
};

export const CUSTOM_FORM: MultistepForm = {
    name: "main",
    type: "FORM",
    labelHeader: false,
    header: [
        {
            step: "contact_info",
            label: "Contact",
        },
        {
            step: "confirmation",
            label: "Confirmation",
        },
    ],
    steps: [
        {
            name: "contact_info",
            nextAction: "submit",
            fields: [
                {
                    name: "full_name",
                    label: "Name",
                    type: "TEXT",
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
                } as FormFieldTextAddressInput,
                {
                    name: "help_type",
                    title: "How can we help?",
                    type: "CHIPS",
                    items: [
                        {
                            id: "get_quote",
                            label: "Get Quote",
                        },
                        {
                            id: "schedule_maintenance",
                            label: "Schedule Maintenance",
                        },
                        {
                            id: "service_repair",
                            label: "Service/Repair",
                        },
                    ],
                    mandatory: true,
                    radio: true,
                },
            ],
            title: "Contact Information",
        },
        {
            name: "thank_you",
            previousAction: "omit",
            nextAction: "omit",
            fields: [
                {
                    name: "thank_you_image",
                    type: "CARD",
                    media: {
                        alt: "Logo",
                        imageUrl: "https://xapp-widget-test-asset.s3.amazonaws.com/images/foo.png",
                    },
                },
                {
                    name: "thank_you_text",
                    header: {
                        title: "Thank You",
                    },
                    text: "Thank you for your request.  A representative will call you as soon as possible.",
                    type: "CARD",
                },
            ],
        },
    ],
};

export const CUSTOM_FORM_WITH_DATE: MultistepForm = {
    name: "main",
    type: "FORM",
    labelHeader: false,
    header: [
        {
            step: "contact_info",
            label: "Contact",
        },
        {
            step: "calendar",
            label: "Calendar",
        },
        {
            step: "confirmation",
            label: "Confirmation",
        },
    ],
    steps: [
        {
            name: "contact_info",
            nextAction: "submit",
            fields: [
                {
                    name: "full_name",
                    label: "Name",
                    type: "TEXT",
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
                } as FormFieldTextAddressInput,
                {
                    name: "help_type",
                    title: "How can we help?",
                    type: "CHIPS",
                    items: [
                        {
                            id: "get_quote",
                            label: "Get Quote",
                        },
                        {
                            id: "schedule_maintenance",
                            label: "Schedule Maintenance",
                        },
                        {
                            id: "service_repair",
                            label: "Service/Repair",
                        },
                    ],
                    mandatory: true,
                    radio: true,
                },
            ],
            title: "Contact Information",
        },
        {
            name: "calendar",
            nextAction: "submit",
            fields: [
                {
                    name: "date",
                    label: "Date",
                    type: "DATE",
                    mandatory: true,
                },
            ],
        },
        {
            name: "thank_you",
            previousAction: "omit",
            nextAction: "omit",
            fields: [
                {
                    name: "thank_you_image",
                    type: "CARD",
                    media: {
                        alt: "Logo",
                        imageUrl: "https://xapp-widget-test-asset.s3.amazonaws.com/images/foo.png",
                    },
                },
                {
                    name: "thank_you_text",
                    header: {
                        title: "Thank You",
                    },
                    text: "Thank you for your request.  A representative will call you as soon as possible.",
                    type: "CARD",
                },
            ],
        },
    ],
};

export const BLUEPRINT_WITHOUT_FULL_NAME: ContactCaptureBlueprint = {
    data: [
        {
            slotName: "first_name",
            active: true,
            type: "FIRST_NAME",
            questionContentKey: "FirstNameQuestionContent",
        },
        {
            slotName: "last_name",
            active: true,
            type: "LAST_NAME",
            questionContentKey: "LastNameQuestionContent",
        },
        {
            slotName: "phone",
            active: true,
            type: "PHONE",
            questionContentKey: "PhoneQuestionContent",
        },
        {
            slotName: "full_name",
            active: false,
            type: "FULL_NAME",
            questionContentKey: "FullNameQuestionContent",
        },
        {
            slotName: "zip",
            active: false,
            type: "ZIP",
            questionContentKey: "ZipQuestionContent",
        },
        {
            slotName: "address",
            active: false,
            type: "ADDRESS",
            questionContentKey: "AddressQuestionContent",
        },
        {
            slotName: "email",
            active: false,
            type: "EMAIL",
            questionContentKey: "EmailQuestionContent",
        },
        {
            slotName: "selection",
            active: false,
            enums: ["Solar", "Roofing"],
            type: "SELECTION",
            questionContentKey: "SelectionQuestionContent",
        },
        {
            slotName: "message",
            active: false,
            type: "MESSAGE",
            questionContentKey: "MessageQuestionContent",
        },
    ],
};
