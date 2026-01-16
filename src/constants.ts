/*! Copyright (c) 2022, XAPP AI */

import { Response } from "stentor-models";

export const CONTACT_CAPTURE_PREFIX = "ContactCapture";

// Misc
export const LEAD_LIST_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Contents Tags
export const CONTACT_CAPTURE_HELP_START_CONTENT = CONTACT_CAPTURE_PREFIX + "HelpStart";
export const CONTACT_CAPTURE_START_CONTENT = CONTACT_CAPTURE_PREFIX + "Start";
export const CONTACT_CAPTURE_NO_LEAD_CAPTURE_CONTENT = CONTACT_CAPTURE_PREFIX + "NoCaptureStart";

export const CONTACT_CAPTURE_END_CONTENT = CONTACT_CAPTURE_PREFIX + "End";
export const CONTACT_CAPTURE_SENT_CONTENT = CONTACT_CAPTURE_PREFIX + "Sent";

// Refusal content tags
export const CONTACT_CAPTURE_REFUSAL_CONTENT = CONTACT_CAPTURE_PREFIX + "Refusal";
export const CONTACT_CAPTURE_REFUSAL_PRIVACY_CONTENT = CONTACT_CAPTURE_PREFIX + "RefusalPrivacy";
export const CONTACT_CAPTURE_REFUSAL_NOT_INTERESTED_CONTENT = CONTACT_CAPTURE_PREFIX + "RefusalNotInterested";
export const CONTACT_CAPTURE_REFUSAL_WILL_CONTACT_CONTENT = CONTACT_CAPTURE_PREFIX + "RefusalWillContact";
export const CONTACT_CAPTURE_REFUSAL_OTHER_METHOD_CONTENT = CONTACT_CAPTURE_PREFIX + "RefusalOtherMethod";

// Session variables

/**
 * Contains the current lead data we are gathering
 */
export const CONTACT_CAPTURE_LIST = CONTACT_CAPTURE_PREFIX + "List";
/**
 * If the lead was sent or not
 */
export const CONTACT_CAPTURE_SENT = CONTACT_CAPTURE_PREFIX + "LeadSent";
/**
 * Existing booking id (to update gradually a booking with partials)
 */
export const CONTACT_CAPTURE_EXISTING_REF_ID = CONTACT_CAPTURE_PREFIX + "ExistingRefId";
/**
 * Data we are currently waiting back on
 */
export const CONTACT_CAPTURE_CURRENT_DATA = CONTACT_CAPTURE_PREFIX + "CurrentData";
/**
 * Slot information we are tracking related the contact fields
 */
export const CONTACT_CAPTURE_SLOTS = CONTACT_CAPTURE_PREFIX + "Slots";
/**
 * Stores the response from an aside, like if the user asked a question in the middle of capturing their information.
 */
export const CONTACT_CAPTURE_ASIDE = CONTACT_CAPTURE_PREFIX + "Aside";
/**
 * Was the session X-d (abandoned)
 */
export const CONTACT_CAPTURE_ABANDONED = CONTACT_CAPTURE_PREFIX + "Abandoned";
/**
 * Contains the availability info (from the CRM)
 */
export const CONTACT_CAPTURE_BUSY_DAYS = CONTACT_CAPTURE_PREFIX + "BusyDays";
/**
 * The job Id the CRM gave us for the description
 */
export const CONTACT_CAPTURE_JOB_TYPE = CONTACT_CAPTURE_PREFIX + "JobType";
/**
 * The description we used to get the job type
 */
export const CONTACT_CAPTURE_DESCRIPTION = CONTACT_CAPTURE_PREFIX + "Description";
/**
 * Tracks if the user refused to provide contact information
 */
export const CONTACT_CAPTURE_REFUSED = CONTACT_CAPTURE_PREFIX + "Refused";
/**
 * The type of refusal from the user
 */
export const CONTACT_CAPTURE_REFUSAL_TYPE = CONTACT_CAPTURE_PREFIX + "RefusalType";
/**
 * Partial lead data stored when user refuses to complete capture
 */
export const CONTACT_CAPTURE_PARTIAL_LEAD = CONTACT_CAPTURE_PREFIX + "PartialLead";

// Intents/Handlers
export const CONTACT_CAPTURE_HANDLER = CONTACT_CAPTURE_PREFIX + "Handler";
export const CONTACT_CAPTURE_INTENT = CONTACT_CAPTURE_PREFIX;

export const CONTACT_CAPTURE_HANDLER_TYPE = "ContactCaptureHandlerType";



export const DEFAULT_RESPONSES: Response[] = [
    {
        "displays": null,
        "outputSpeech": {
            "ssml": "<speak>What is your name?</speak>",
            "displayText": "What is your name?",
        },
        "reprompt": {
            "ssml": "<speak>May I have your name?</speak>",
            "displayText": "May I have your name?"
        },
        "context": {
            "active": [
                {
                    "name": "expecting_name",
                    "parameters": null,
                    "timeToLive": {
                        "timeToLiveInSeconds": 400,
                        "turnsToLive": 2
                    }
                }
            ]
        },
        "name": "First Name",
        "tag": "FirstNameQuestionContent"
    },
    {
        "outputSpeech": {
            "ssml": "<speak>What is your last name?</speak>",
            "displayText": "What is your last name?",
        },
        "reprompt": {
            "ssml": "<speak>May I have your last name?</speak>",
            "displayText": "May I have your last name?",
        },
        "context": {
            "active": [
                {
                    "name": "expecting_name",
                    "parameters": null,
                    "timeToLive": {
                        "timeToLiveInSeconds": 400,
                        "turnsToLive": 2
                    }
                }
            ]
        },
        "name": "Last Name",
        "tag": "LastNameQuestionContent",
    },
    {
        "outputSpeech": {
            "ssml": "<speak>What is your full name?</speak>",
            "displayText": "What is your full name?",
        },
        "reprompt": {
            "ssml": "<speak>May I have your full name?</speak>",
            "displayText": "May I have your full name?",
        },
        "context": {
            "active": [
                {
                    "name": "expecting_name",
                    "parameters": null,
                    "timeToLive": {
                        "timeToLiveInSeconds": 400,
                        "turnsToLive": 2
                    }
                }
            ]
        },
        "name": "Full Name",
        "tag": "FullNameQuestionContent",
    },
    {
        "outputSpeech": {
            "ssml": "<speak>Thanks, and what’s your phone number?</speak>",
            "displayText": "Thanks, and what’s your phone number?",
        },
        "reprompt": {
            "ssml": "<speak>May I have your phone number?</speak>",
            "displayText": "May I have your phone number?",
        },
        "context": {
            "active": [
                {
                    "name": "expecting_phone",
                    "parameters": null,
                    "timeToLive": {
                        "timeToLiveInSeconds": 400,
                        "turnsToLive": 2
                    }
                }
            ]
        },
        "name": "Phone Question",
        "tag": "PhoneQuestionContent"
    },
    {
        "outputSpeech": {
            "ssml": "<speak>Please describe any additional details you'd like to share.</speak>",
            "textToSpeech": null,
            "displayText": "Please describe any additional details you'd like to share.",
            "suggestions": [
                {
                    "title": "No additional details"
                }
            ]
        },
        "reprompt": {
            "ssml": "<speak>You can type a message next, if you wish</speak>",
            "textToSpeech": null,
            "displayText": "You can type a message next, if you wish",
            "suggestions": null
        },
        "context": {
            "active": []
        },
        "name": "Message Question",
        "tag": "MessageQuestionContent",
    },
    {
        "outputSpeech": {
            "ssml": "<speak>Please tell me the zip code where you need our services</speak>",
            "displayText": "Please tell me the zip code where you need our services",
        },
        "reprompt": {
            "ssml": "<speak>May I have your zip code?</speak>",
            "displayText": "May I have your zip code?",
        },
        "context": {
            "active": [
                {
                    "name": "expecting_number",
                    "timeToLive": {
                        "timeToLiveInSeconds": 400,
                        "turnsToLive": 2
                    }
                },
                {
                    "name": "expecting_address",
                    "timeToLive": {
                        "timeToLiveInSeconds": 400,
                        "turnsToLive": 2
                    }
                }
            ]
        },
        "name": "Zip Question",
        "tag": "ZipQuestionContent"
    },
    {
        "outputSpeech": {
            "ssml": "<speak>Thanks. Lastly, can you provide your street address in case we need to look up information about your house?</speak>",
            "displayText": "Thanks. Lastly, can you provide your street address in case we need to look up information about your house?",
        },
        "reprompt": {
            "ssml": "<speak>May I have the street address of where you need the service?</speak>",
            "displayText": "May I have the street address of where you need the service?",
        },
        "context": {
            "active": [
                {
                    "name": "expecting_address",
                    "parameters": null,
                    "timeToLive": {
                        "timeToLiveInSeconds": 400,
                        "turnsToLive": 2
                    }
                },
                {
                    "name": "expecting_number",
                    "parameters": null,
                    "timeToLive": {
                        "timeToLiveInSeconds": 400,
                        "turnsToLive": 2
                    }
                }
            ]
        },
        "name": "Address Question",
        "tag": "AddressQuestionContent",
    },
    {
        "outputSpeech": {
            "ssml": "<speak>What is your email address?</speak>",
            "displayText": "What is your email address?",
        },
        "reprompt": {
            "ssml": "<speak>May I have your email?</speak>",
            "displayText": "May I have your email?",
        },
        "context": {
            "active": [
                {
                    "name": "expecting_email",
                    "parameters": null,
                    "timeToLive": {
                        "timeToLiveInSeconds": 400,
                        "turnsToLive": 2
                    }
                }
            ]
        },
        "name": "Email Question",
        "tag": "EmailQuestionContent"
    },
    {
        "outputSpeech": {
            "ssml": "<speak>Please select the service you are you interested in</speak>",
            "displayText": "Please select the service you are you interested in",
        },
        "reprompt": {
            "ssml": "<speak>Please select one of the options</speak>",
            "displayText": "Please select one of the options",
        },
        "name": "Select Option",
        "tag": "SelectionQuestionContent"
    },
    {
        "outputSpeech": {
            "ssml": "<speak>Please describe any additional details you'd like to share.</speak>",
            "displayText": "Please describe any additional details you'd like to share.",
            "suggestions": [
                {
                    "title": "No Additional Details"
                }
            ]
        },
        "reprompt": {
            "ssml": "<speak>You can type a message next, if you wish</speak>",
            "displayText": "You can type a message next, if you wish",
        },
        "name": "Message Question",
        "tag": "MessageQuestionContent",
    },
    {
        "outputSpeech": {
            "ssml": "<speak>Wonderful. That’s all the info we need. Someone will follow up with you shortly.</speak>",
            "displayText": "Wonderful. That’s all the info we need. Someone will follow up with you shortly.",
        },
        "reprompt": {
            "ssml": "<speak>We have everything we need, thanks again.</speak>",
            "displayText": "We have everything we need, thanks again.",
        },
        "name": "Capture End",
        "tag": "ContactCaptureEnd",
    },
    {
        "outputSpeech": {
            "ssml": "<speak>Sure, happy to help with that.  We just need to ask you a few questions to set it up.</speak>",
            "displayText": "Sure, happy to help with that.  We just need to ask you a few questions to set it up.",
        },
        "reprompt": {
            "ssml": "<speak>Sure happy to help with your that.  We just need to ask you a few questions to set it up.</speak>",
            "displayText": "Sure happy to help with your that.  We just need to ask you a few questions to set it up.",
        },
        "name": "Capture Start",
        "tag": "ContactCaptureStart",
    },
    {
        "outputSpeech": {
            "ssml": "<speak>Already sent in your information, somebody will contact you as soon as possible.</speak>",
            "displayText": "Already sent in your information, somebody will contact you as soon as possible.",
        },
        "name": "Capture Sent",
        "tag": "ContactCaptureSent",
    },
    {
        "outputSpeech": {
            "ssml": "<speak>Ok, let me grab your info so we can get somebody in touch with you.</speak>",
            "displayText": "Ok, let me grab your info so we can get somebody in touch with you.",
        },
        "name": "Capture Help Start",
        "tag": "ContactCaptureHelpStart",
    },
    {
        "outputSpeech": {
            "ssml": "<speak>I understand. If you change your mind, we're here to help.</speak>",
            "displayText": "I understand. If you change your mind, we're here to help.",
        },
        "name": "Refusal - General",
        "tag": "ContactCaptureRefusal",
    },
    {
        "outputSpeech": {
            "ssml": "<speak>I completely understand your privacy concerns. If you'd prefer, you can reach us directly at your convenience.</speak>",
            "displayText": "I completely understand your privacy concerns. If you'd prefer, you can reach us directly at your convenience.",
        },
        "name": "Refusal - Privacy",
        "tag": "ContactCaptureRefusalPrivacy",
    },
    {
        "outputSpeech": {
            "ssml": "<speak>No problem at all. Thanks for letting us know. If you change your mind, we're here to help.</speak>",
            "displayText": "No problem at all. Thanks for letting us know. If you change your mind, we're here to help.",
        },
        "name": "Refusal - Not Interested",
        "tag": "ContactCaptureRefusalNotInterested",
    },
    {
        "outputSpeech": {
            "ssml": "<speak>Sounds good! We look forward to hearing from you.</speak>",
            "displayText": "Sounds good! We look forward to hearing from you.",
        },
        "name": "Refusal - Will Contact",
        "tag": "ContactCaptureRefusalWillContact",
    },
    {
        "outputSpeech": {
            "ssml": "<speak>Of course. You can reach us by phone or visit our website whenever it's convenient for you.</speak>",
            "displayText": "Of course. You can reach us by phone or visit our website whenever it's convenient for you.",
        },
        "name": "Refusal - Other Method",
        "tag": "ContactCaptureRefusalOtherMethod",
    }
]