/*! Copyright (c) 2026, XAPP AI */

import { FormStep, FormStepExternalWidget, MultistepForm } from "stentor-models";

import { ExternalBookingData } from "../../data";

/**
 * Builds the per-visitor config payload handed to a third-party booking widget, from the
 * data the visitor just gave us. Pure and separately testable -- no CRM, no session, no I/O.
 *
 * The widget merges this over the handoff step's static config (response wins). We never
 * deliver the lead to the partner; this only mounts their widget with the visitor's details.
 */

/** Coerces a collected form attribute to a non-empty trimmed string, or undefined. */
function str(value: unknown): string | undefined {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }
    if (typeof value === "number") {
        return String(value);
    }
    return undefined;
}

/**
 * Resolves firstName / lastName from the collected data.
 *
 * Explicit `first_name` / `last_name` win. Otherwise `full_name` is split on the FIRST
 * whitespace: the remainder (including any further spaces) becomes lastName, and a
 * single-token name puts the token in firstName with an empty lastName.
 */
export function splitName(result: Record<string, unknown>): { firstName: string; lastName: string } {
    const explicitFirst = str(result.first_name);
    const explicitLast = str(result.last_name);
    if (explicitFirst || explicitLast) {
        return { firstName: explicitFirst ?? "", lastName: explicitLast ?? "" };
    }

    const full = str(result.full_name);
    if (!full) {
        return { firstName: "", lastName: "" };
    }

    const firstSpace = full.search(/\s/);
    if (firstSpace === -1) {
        return { firstName: full, lastName: "" };
    }
    return { firstName: full.slice(0, firstSpace), lastName: full.slice(firstSpace + 1).trim() };
}

/**
 * Resolves the zip: `zip` ?? `zip_code` ?? the LAST 5-digit run in `address`.
 */
export function extractZip(result: Record<string, unknown>): string | undefined {
    const explicit = str(result.zip) ?? str(result.zip_code);
    if (explicit) {
        return explicit;
    }
    const address = str(result.address)?.trim();
    if (!address) {
        return undefined;
    }

    // The LAST five-digit run, not the first. US addresses put the zip at the end and the house
    // number at the start, and a five-digit house number is common -- "15603 Jillians Forest Way,
    // Centreville, VA 20120, USA" sent CostGuide 15603, which is a real zip 250 miles away. They
    // match the contractor on zip and run with hideNoMatch, so their widget rendered nothing and
    // it read as our handoff failing.
    const pattern = /\b(\d{5})(?:-\d{4})?\b/g;
    let last: RegExpExecArray | undefined;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(address)) !== null) {
        last = match;
    }

    if (!last) {
        return undefined;
    }

    // A match at the very start that is followed by more address text is the house number of an
    // address carrying no zip at all. Sending it would look exactly like a correct booking in the
    // wrong county; sending nothing fails visibly instead.
    //
    // The "followed by more text" half matters: ADDRESS is free text -- `validators.ts` passes it
    // through untouched and nothing forces an autocomplete selection -- so a visitor may type only
    // their zip into it. That match is also at index 0, and dropping it would omit `zipCode` and
    // give CostGuide the same blank widget this whole function exists to avoid.
    if (last.index === 0 && last[0].length < address.length) {
        return undefined;
    }

    return last[1];
}

/**
 * Normalizes a 10-digit phone to `NNN-NNN-NNNN`; anything else (already-formatted,
 * international, partial) is passed through unchanged.
 */
export function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) {
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
}

/**
 * The one trade CostGuide wants every trade in a category sent as.
 *
 * Their form matches the posted trade against the contracts the advertiser holds, so a trade
 * they hold no contract for finds nothing and the form renders empty. A real Erie Home lead on
 * 2026-09-22 posted "Roofing - Repair"; Erie takes no roofing repair, so the handoff came up
 * blank and the lead was not distributable. CostGuide (Vito Sauro) asked for this mapping, and
 * gave these four categories -- anything else is passed through untouched rather than guessed at.
 */
const CATEGORY_TRADES: Record<string, string> = {
    roofing: "Roofing - Asphalt Install or Replace",
    windows: "Windows - Replace 6-9 Windows",
    siding: "Siding - Vinyl Install or Replace",
    bathroom: "Bathroom - Bathtub or Shower Updates",
};

/**
 * Maps a trade to its category's canonical trade, or returns it unchanged.
 *
 * Categorised on the LEADING WORD, not the part before the dash: "Windows Repair - Service Call"
 * is a windows trade, and splitting on the dash gives "Windows Repair", which matches nothing.
 */
export function toCategoryTrade(trade: string | undefined): string | undefined {
    if (!trade) {
        return trade;
    }
    const category = trade.trim().toLowerCase().split(/[\s-]+/)[0];
    return CATEGORY_TRADES[category] ?? trade;
}

export interface BuildExternalBookingConfigParams {
    /** The collected form attributes (`FormActionResponseData.result`). */
    result: Record<string, unknown>;
    /**
     * The already-resolved partner trade. Resolution happens at capture time, before the lead is
     * sent, so its provenance can be recorded on the lead -- see `resolveBookingTrade`. Undefined
     * means it did not resolve, in which case the `trade` key is left off the config and the
     * partner asks the visitor what kind of work it is. The handoff is still offered, and still
     * carries everything else we collected.
     */
    trade?: string;
    externalBooking: ExternalBookingData;
}

/**
 * Builds the config the widget merges over the handoff step's static config.
 *
 * Always returns a config. It used to return undefined when the trade had not resolved, which
 * omitted the handoff entirely and sent the visitor back to the partner's own first step to
 * re-enter the zip, name, address, email and phone they had just given us. Do not put that
 * guard back: an unresolved trade withholds the trade, not the visitor.
 */
export function buildExternalBookingConfig(
    params: BuildExternalBookingConfigParams,
): Record<string, string | number> {
    const { result, trade, externalBooking } = params;

    const { firstName, lastName } = splitName(result);

    const config: Record<string, string | number> = {
        firstName,
        lastName,
        advertiserId: externalBooking.advertiserId,
        campaignId: externalBooking.campaignId,
        campaignKey: externalBooking.campaignKey,
    };

    // An unresolved trade withholds the TRADE, not the visitor. This used to `return undefined`,
    // which dropped the whole config -- so the partner's widget mounted with nothing and asked
    // the homeowner for their zip, name, address, email and phone all over again, every one of
    // which they had just typed into our form. The partner keeps its own "what kind of work"
    // step whenever `trade` is absent, so leaving the key off asks them the single question we
    // genuinely cannot answer and nothing else.
    //
    // Deliberately NOT `externalBooking.defaultTrade`: posting "my furnace stopped working" to a
    // roofer as roofing is worse than naming no trade. That fallback belongs to the timeout and
    // low-confidence paths in tradeClassifier, which are a model that failed, not a model that
    // read the message and said none of these fit.
    if (trade) {
        // The category's canonical trade, not the one we resolved: CostGuide matches the posted
        // trade against the contracts this advertiser holds. The lead itself keeps the real
        // trade -- only what we hand the partner is widened.
        config.trade = toCategoryTrade(trade);
    }

    const address = str(result.address);
    if (address) {
        config.address = address;
    }
    const zipCode = extractZip(result);
    if (zipCode) {
        config.zipCode = zipCode;
    }
    const email = str(result.email);
    if (email) {
        config.email = email;
    }
    const phone = str(result.phone);
    if (phone) {
        config.phone = normalizePhone(phone);
    }

    return config;
}

/**
 * Default name of the generated handoff step.
 */
export const DEFAULT_EXTERNAL_BOOKING_STEP_NAME = "book_appointment";

/**
 * CostGuide / Contractor Appointments embed constants. `provider: "costguide"` is the only
 * supported provider, so these are fixed here rather than authored in Studio -- the widget
 * treats `externalWidget.config` as an opaque bag and holds no CostGuide-specific keys.
 */
const COSTGUIDE_EMBED = {
    anchorId: "airo-anchor",
    scriptSrc: "https://form.contractorappointments.com/js/embed-form.js",
    configGlobal: "airoBookingForm",
    successCallbackKey: "apptScheduledCallback",
    // spike-validated floor -- do NOT lower; render measured 111ms-18.7s (chat-widget#1514).
    renderTimeoutMs: 8000,
};

/**
 * Builds the static `externalWidget` block. Per-visitor values are NOT included here -- they
 * arrive on the FORM_SUBMIT response via {@link buildExternalBookingConfig} and are merged
 * over this by the widget.
 */
export function buildStaticExternalWidget(
    externalBooking: ExternalBookingData,
): FormStepExternalWidget["externalWidget"] {
    return {
        anchorId: COSTGUIDE_EMBED.anchorId,
        scriptSrc: COSTGUIDE_EMBED.scriptSrc,
        configGlobal: COSTGUIDE_EMBED.configGlobal,
        successCallbackKey: COSTGUIDE_EMBED.successCallbackKey,
        cacheBust: true,
        renderTimeoutMs: COSTGUIDE_EMBED.renderTimeoutMs,
        config: {
            advertiserId: externalBooking.advertiserId,
            campaignId: externalBooking.campaignId,
            campaignKey: externalBooking.campaignKey,
            hideNoMatch: "yes",
            limit: 1,
            // Forces CostGuide to render the lead-buyer consent box, which carries the
            // "request estimate" control. A real lead on 2026-09-22 came back
            // non-distributable: the TrustedForm recording showed the homeowner never saw it,
            // so no consent was captured and the lead could not be passed on. CostGuide
            // (Vito Sauro) said advertiserId alone should have shown it and this forces it,
            // and that it does not change how many contractors are displayed.
            showLeadBuyers: "yes",
            // Fixed attribution value CostGuide asked us to always send (identifies the
            // thank-you-page handoff on their side); saves per-advertiser config for them.
            source: "thankyoupage",
        },
    };
}

/**
 * Builds the terminal handoff step that hosts the partner widget.
 */
export function buildHandoffStep(externalBooking: ExternalBookingData): FormStepExternalWidget {
    return {
        name: externalBooking.stepName || DEFAULT_EXTERNAL_BOOKING_STEP_NAME,
        title: "Choose your appointment",
        fields: [],
        fullBleed: true,
        previousAction: "omit",
        nextAction: "omit",
        warnBeforeUnload: true,
        externalWidget: buildStaticExternalWidget(externalBooking),
    };
}

/** Index of the step to submit the lead from: last crmSubmit step, else last step with fields. */
function lastSubmitIndex(steps: FormStep[]): number {
    for (let i = steps.length - 1; i >= 0; i--) {
        if (steps[i].crmSubmit) {
            return i;
        }
    }
    for (let i = steps.length - 1; i >= 0; i--) {
        const fields = steps[i].fields;
        if (Array.isArray(fields) && fields.length > 0) {
            return i;
        }
    }
    return -1;
}

/**
 * Adds the booking handoff to a generated or custom form. When `externalBooking` is disabled
 * the form is returned unchanged (byte-identical to today).
 *
 * - Custom form already declaring a step named `stepName`: its `externalWidget` is filled in
 *   (and `fullBleed` set); no duplicate step is appended.
 * - Otherwise: the last data-collecting step becomes a crm-submitting final step, any trailing
 *   terminal acknowledgement is dropped, and the handoff is appended as the new terminal step.
 */
export function applyExternalBookingHandoff(
    form: MultistepForm,
    externalBooking?: ExternalBookingData,
): MultistepForm {
    if (!externalBooking?.enabled) {
        return form;
    }

    const stepName = externalBooking.stepName || DEFAULT_EXTERNAL_BOOKING_STEP_NAME;
    const steps: FormStep[] = form.steps || [];

    const existing = steps.find((step) => step.name === stepName);
    if (existing) {
        (existing as FormStepExternalWidget).externalWidget = buildStaticExternalWidget(externalBooking);
        existing.fullBleed = true;
        return form;
    }

    const submitIndex = lastSubmitIndex(steps);
    if (submitIndex === -1) {
        return { ...form, steps: [...steps, buildHandoffStep(externalBooking)] };
    }

    const submitStep = steps[submitIndex];
    submitStep.crmSubmit = true;
    submitStep.final = true;
    submitStep.nextAction = "submit";

    return { ...form, steps: [...steps.slice(0, submitIndex + 1), buildHandoffStep(externalBooking)] };
}
