/*! Copyright (c) 2022, XAPP AI */

export const CONTACT_CAPTURE_PREFIX = "ContactCapture";

// Misc
export const LEAD_LIST_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Contents Tags
export const CONTACT_CAPTURE_HELP_START_CONTENT = CONTACT_CAPTURE_PREFIX + "HelpStart";
export const CONTACT_CAPTURE_START_CONTENT = CONTACT_CAPTURE_PREFIX + "Start";
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
 * Data we are currently waiting back on
 */
export const CONTACT_CAPTURE_CURRENT_DATA = CONTACT_CAPTURE_PREFIX + "CurrentData";
/**
 * Slot information we are tracking related the contact fields
 */
export const CONTACT_CAPTURE_SLOTS = CONTACT_CAPTURE_PREFIX + "Slots";

// Intents/Handlers
export const CONTACT_CAPTURE_HANDLER = CONTACT_CAPTURE_PREFIX + "Handler";
export const CONTACT_CAPTURE_INTENT = CONTACT_CAPTURE_PREFIX;

export const CONTACT_CAPTURE_HANDLER_TYPE = "ContactCaptureHandler";