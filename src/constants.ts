/*! Copyright (c) 2022, XAPP AI */

export const CONTACT_CAPTURE_PREFIX = "ContactCapture";

// Misc
export const LEAD_LIST_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Contents Tags
export const CONTACT_CAPTURE_HELP_START_CONTENT = CONTACT_CAPTURE_PREFIX + "HelpStart";
export const CONTACT_CAPTURE_START_CONTENT = CONTACT_CAPTURE_PREFIX + "Start";
export const CONTACT_CAPTURE_NO_LEAD_CAPTURE_CONTENT = CONTACT_CAPTURE_PREFIX + "NoCaptureStart";

export const CONTACT_CAPTURE_END_CONTENT = CONTACT_CAPTURE_PREFIX + "End";
export const CONTACT_CAPTURE_SENT_CONTENT = CONTACT_CAPTURE_PREFIX + "Sent";

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

// Intents/Handlers
export const CONTACT_CAPTURE_HANDLER = CONTACT_CAPTURE_PREFIX + "Handler";
export const CONTACT_CAPTURE_INTENT = CONTACT_CAPTURE_PREFIX;

export const CONTACT_CAPTURE_HANDLER_TYPE = "ContactCaptureHandlerType";