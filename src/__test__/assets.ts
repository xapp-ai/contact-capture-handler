/*! Copyright (c) 2024, XAPP AI */
import { Handler, Content, FormFieldTextAddressInput } from "stentor-models";

import { ContactCaptureData } from "../data";

export const props: Handler<Content, ContactCaptureData> = {
    intentId: "intentId",
    type: "ContactCaptureHandler",
    appId: "appId",
    organizationId: "organizationId",
    content: {
        ["intentId"]: [
            {
                name: "First Name",
                tag: "FirstNameQuestionContent",
                outputSpeech: {
                    ssml: "<speak>What is your name?</speak>",
                    displayText: "What is your name?",
                },
                reprompt: {
                    ssml: "<speak>May I have your name?</speak>",
                    displayText: "May I have your name?"
                }
            },
            {
                name: "Start",
                tag: "ContactCaptureStart",
                outputSpeech: {
                    ssml: "<speak>Why hello!</speak>",
                    displayText: "Why hello!",
                }
            }
        ],
        ["OCSearch"]: [
            {
                name: "FAQ",
                tag: "KB_TOP_FAQ",
                outputSpeech: {
                    ssml: "<speak>${TOP_FAQ.text}</speak>",
                    displayText: "${TOP_FAQ.text}",
                },
                conditions: "!!session('TOP_FAQ')"
            }
        ],
        ["Thanks"]: [
            {
                name: "No Problem",
                outputSpeech: {
                    ssml: "<speak>No Problem</speak>",
                    displayText: "No problem",
                }
            }
        ]
    },
    data: {
        "inputUnknownStrategy": "REPROMPT",
        "captureLead": true,
        "capture": {
            "data": [
                {
                    "slotName": "first_name",
                    "active": true,
                    "type": "FIRST_NAME",
                    "questionContentKey": "FirstNameQuestionContent"
                },
                {
                    "slotName": "last_name",
                    "active": true,
                    "type": "LAST_NAME",
                    "questionContentKey": "LastNameQuestionContent"
                },
                {
                    "slotName": "phone",
                    "active": true,
                    "type": "PHONE",
                    "questionContentKey": "PhoneQuestionContent"
                },
                {
                    "slotName": "full_name",
                    "active": false,
                    "type": "FULL_NAME",
                    "questionContentKey": "FullNameQuestionContent"
                },
                {
                    "slotName": "zip",
                    "active": false,
                    "type": "ZIP",
                    "questionContentKey": "ZipQuestionContent"
                },
                {
                    "slotName": "address",
                    "active": true,
                    "type": "ADDRESS",
                    "questionContentKey": "AddressQuestionContent"
                },
                {
                    "slotName": "email",
                    "active": false,
                    "type": "EMAIL",
                    "questionContentKey": "EmailQuestionContent"
                },
                {
                    "slotName": "dateTime",
                    "active": false,
                    "type": "DATE_TIME",
                    "questionContentKey": "DateTimeQuestionContent"
                },
                {
                    "slotName": "organization",
                    "active": true,
                    "acceptAnyInput": true,
                    "type": "ORGANIZATION",
                    "questionContentKey": "OrganizationQuestionContent"
                },
                {
                    "slotName": "selection",
                    "enums": [
                        "Solar",
                        "Roofing"
                    ],
                    "active": false,
                    "type": "SELECTION",
                    "questionContentKey": "SelectionQuestionContent"
                },
                {
                    "slotName": "message",
                    "acceptAnyInput": true,
                    "active": false,
                    "type": "MESSAGE",
                    "questionContentKey": "MessageQuestionContent"
                }
            ]
        },
        "chat": {
            "followUp": ""
        },
        CAPTURE_MAIN_FORM: "",
        FUZZY_MATCH_FAQS: true
    }
}

export const propsWithAnyInputQuestion: Handler<Content, ContactCaptureData> = {
    intentId: "intentId",
    type: "ContactCaptureHandler",
    appId: "appId",
    organizationId: "organizationId",
    content: {
        ["intentId"]: [
            {
                name: "First Name",
                tag: "FirstNameQuestionContent",
                outputSpeech: {
                    ssml: "<speak>What is your name?</speak>",
                    displayText: "What is your name?",
                }
            },
            {
                name: "Organization",
                tag: "OrganizationQuestionContent",
                outputSpeech: {
                    ssml: "<speak>What is your organization?</speak>",
                    displayText: "What is your organization?",
                }
            },
            {
                name: "Start",
                tag: "ContactCaptureStart",
                outputSpeech: {
                    ssml: "<speak>Why hello!</speak>",
                    displayText: "Why hello!",
                }
            }
        ]
    },
    data: {
        "inputUnknownStrategy": "REPROMPT",
        "capture": {
            "data": [
                {
                    "slotName": "first_name",
                    "active": true,
                    "type": "FIRST_NAME",
                    "questionContentKey": "FirstNameQuestionContent"
                },
                {
                    "slotName": "last_name",
                    "active": false,
                    "type": "LAST_NAME",
                    "questionContentKey": "LastNameQuestionContent"
                },
                {
                    "slotName": "phone",
                    "active": false,
                    "type": "PHONE",
                    "questionContentKey": "PhoneQuestionContent"
                },
                {
                    "slotName": "full_name",
                    "active": false,
                    "type": "FULL_NAME",
                    "questionContentKey": "FullNameQuestionContent"
                },
                {
                    "slotName": "zip",
                    "active": false,
                    "type": "ZIP",
                    "questionContentKey": "ZipQuestionContent"
                },
                {
                    "slotName": "address",
                    "active": false,
                    "type": "ADDRESS",
                    "questionContentKey": "AddressQuestionContent"
                },
                {
                    "slotName": "email",
                    "active": false,
                    "type": "EMAIL",
                    "questionContentKey": "EmailQuestionContent"
                },
                {
                    "slotName": "dateTime",
                    "active": false,
                    "type": "DATE_TIME",
                    "questionContentKey": "DateTimeQuestionContent"
                },
                {
                    "slotName": "organization",
                    "active": true,
                    "acceptAnyInput": true,
                    "type": "ORGANIZATION",
                    "questionContentKey": "OrganizationQuestionContent"
                },
                {
                    "slotName": "selection",
                    "enums": [
                        "Solar",
                        "Roofing"
                    ],
                    "active": false,
                    "type": "SELECTION",
                    "questionContentKey": "SelectionQuestionContent"
                },
                {
                    "slotName": "message",
                    "acceptAnyInput": true,
                    "active": false,
                    "type": "MESSAGE",
                    "questionContentKey": "MessageQuestionContent"
                }
            ]
        },
        "captureLead": true,
        CAPTURE_MAIN_FORM: ""
    }
}

export const propsWithNoCapture: Handler<Content, ContactCaptureData> = {
    intentId: "intentId",
    type: "ContactCaptureHandler",
    appId: "appId",
    organizationId: "organizationId",
    content: {
        ["intentId"]: [
            {
                name: "First Name",
                tag: "FirstNameQuestionContent",
                outputSpeech: {
                    ssml: "<speak>What is your name?</speak>",
                    displayText: "What is your name?",
                },
                reprompt: {
                    ssml: "<speak>May I have your name?</speak>",
                    displayText: "May I have your name?"
                }
            },
            {
                name: "Start",
                tag: "ContactCaptureStart",
                outputSpeech: {
                    ssml: "<speak>Why hello!</speak>",
                    displayText: "Why hello!",
                }
            }
        ],
        ["OCSearch"]: [
            {
                name: "FAQ",
                tag: "KB_TOP_FAQ",
                outputSpeech: {
                    ssml: "<speak>${TOP_FAQ.text}</speak>",
                    displayText: "${TOP_FAQ.text}",
                },
                conditions: "!!session('TOP_FAQ')"
            }
        ],
        ["Thanks"]: [
            {
                name: "No Problem",
                outputSpeech: {
                    ssml: "<speak>No Problem</speak>",
                    displayText: "No problem",
                }
            }
        ]
    },
    data: {
        "inputUnknownStrategy": "REPROMPT",
        "capture": {
            "data": []
        },
        "chat": {
            "followUp": ""
        },
        CAPTURE_MAIN_FORM: ""
    }
}

export const propsWithNoCaptureAndContent: Handler<Content, ContactCaptureData> = {
    intentId: "intentId",
    type: "ContactCaptureHandler",
    appId: "appId",
    organizationId: "organizationId",
    content: {
        ["intentId"]: [
            {
                name: "First Name",
                tag: "FirstNameQuestionContent",
                outputSpeech: {
                    ssml: "<speak>What is your name?</speak>",
                    displayText: "What is your name?",
                },
                reprompt: {
                    ssml: "<speak>May I have your name?</speak>",
                    displayText: "May I have your name?"
                }
            },
            {
                name: "Start",
                tag: "ContactCaptureStart",
                outputSpeech: {
                    ssml: "<speak>Why hello!</speak>",
                    displayText: "Why hello!",
                }
            },
            {
                name: "No Capture",
                tag: "ContactCaptureNoCaptureStart",
                outputSpeech: {
                    displayText: "Please call us ASAP!"
                }
            }
        ],
        ["OCSearch"]: [
            {
                name: "FAQ",
                tag: "KB_TOP_FAQ",
                outputSpeech: {
                    ssml: "<speak>${TOP_FAQ.text}</speak>",
                    displayText: "${TOP_FAQ.text}",
                },
                conditions: "!!session('TOP_FAQ')"
            }
        ],
        ["Thanks"]: [
            {
                name: "No Problem",
                outputSpeech: {
                    ssml: "<speak>No Problem</speak>",
                    displayText: "No problem",
                }
            }
        ]
    },
    data: {
        "inputUnknownStrategy": "REPROMPT",
        "capture": {
            "data": []
        },
        "chat": {
            "followUp": ""
        },
        CAPTURE_MAIN_FORM: "",
        FUZZY_MATCH_FAQS: true
    }
}

export const propsWithCustomForm: Handler<Content, ContactCaptureData> = {
    ...propsWithNoCaptureAndContent,
    data: {
        capture: {
            data: []
        },
        // captureLead: true,
        enableFormScheduling: true,
        CAPTURE_MAIN_FORM: "main",
        forms: [
            {
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
            }
        ]
    }
}