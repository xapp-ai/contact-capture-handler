/*! Copyright (c) 2026, XAPP AI */

import { log } from "stentor-logger";
import { CompletionPrompt, LLMService } from "stentor-models";

/**
 * Reads what KIND of enquiry this is, so the ones a booking partner cannot do anything with
 * never reach them.
 *
 * Separate from the trade classifier on purpose. That one answers "which trade", runs a ladder
 * that short-circuits without a model call for single-trade advertisers, and is about matching
 * work to a contract. This one answers "is this a job enquiry at all" -- a cancellation, or spam,
 * is not, however cleanly it would classify as roofing. A real case on 2026-09-23: a homeowner
 * submitted "Cancel appointment", which classified as a roofing SUPPORT request and was sent into
 * the partner's booking form, where nothing sensible could happen.
 */

/** What the enquiry turned out to be. */
export type EnquiryType = "booking" | "cancellation" | "support" | "spam" | "other";

const ENQUIRY_TYPES: readonly EnquiryType[] = ["booking", "cancellation", "support", "spam", "other"];

/**
 * Diverted unless an app says otherwise: the two that can never become an appointment.
 *
 * `support` and `other` are NOT here by default -- a vague or awkward enquiry is still a
 * homeowner who might book, and turning those away is a bigger loss than a partner form that
 * asks them what they need.
 */
export const DEFAULT_UNSUPPORTED_ENQUIRY_TYPES: readonly EnquiryType[] = ["cancellation", "spam"];

/** House Bedrock model for cheap classification work, as used by the trade classifier. */
export const ENQUIRY_CLASSIFIER_MODEL = "us.anthropic.claude-haiku-4-5-20251001-v1:0";

/** The visitor is waiting on the submit response, so this is on the critical path. */
export const ENQUIRY_CLASSIFIER_TIMEOUT_MS = 4000;

const SYSTEM_PROMPT =
    "You read a message a homeowner sent a contractor and say what kind of message it is. " +
    'Reply with JSON only: {"type": <one of "booking", "cancellation", "support", "spam", "other">, ' +
    '"reasoning": <one short sentence>}. ' +
    '"booking" is anyone who wants work done, quoted, estimated or inspected, however vaguely they put it. ' +
    '"cancellation" is someone cancelling, rescheduling or asking about an appointment they already have. ' +
    '"support" is an existing customer with a question about work already done, a bill, or a complaint. ' +
    '"spam" is marketing, recruitment, or an obvious bot -- not a homeowner. ' +
    '"other" is anything else. ' +
    'When it could be a homeowner wanting work, answer "booking": turning a real customer away is ' +
    "far worse than sending an odd message through.";

interface ClassifierAnswer {
    readonly type?: string;
    readonly reasoning?: string;
}

export interface EnquiryResolution {
    readonly type: EnquiryType;
    /** The model's stated reasoning, for after-the-fact review. Absent when no call was made. */
    readonly reasoning?: string;
}

/** What an app configures. Absent means the defaults above. */
export interface UnsupportedEnquiryConfig {
    readonly types?: string[];
}

/** Models like to wrap JSON in a fenced block however firmly they were asked not to. */
function parseAnswer(text: string): ClassifierAnswer | undefined {
    const unfenced = text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "");
    try {
        const parsed: unknown = JSON.parse(unfenced);
        if (parsed && typeof parsed === "object") {
            return parsed as ClassifierAnswer;
        }
    } catch (e) {
        log().warn(`Enquiry classifier returned unparseable output: ${(e as Error).message}`);
    }
    return undefined;
}

function buildPrompt(description: string, chips: string[]): CompletionPrompt {
    const enquiry = [`Message: ${description}`, chips.length > 0 ? `Selected: ${chips.join(", ")}` : undefined]
        .filter((line): line is string => !!line)
        .join("\n");

    return {
        type: "completions",
        model: ENQUIRY_CLASSIFIER_MODEL,
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: enquiry },
        ],
        response_format: { type: "json_object" },
        max_tokens: 200,
        temperature: 0,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
    };
}

export interface ClassifyEnquiryParams {
    readonly description?: string;
    readonly chips?: string[];
    readonly llmService?: LLMService;
    readonly timeoutMs?: number;
}

/**
 * Never throws, and fails OPEN: every unhappy path -- no message, no model, a timeout, an
 * unparseable or unknown answer -- resolves to `booking`, so the handoff behaves exactly as it
 * did before this existed. A homeowner with a real job is never turned away by an infrastructure
 * problem.
 */
export async function classifyEnquiry(params: ClassifyEnquiryParams): Promise<EnquiryResolution> {
    const description = (params.description || "").trim();
    if (!description || !params.llmService) {
        return { type: "booking" };
    }

    const timeoutMs = params.timeoutMs ?? ENQUIRY_CLASSIFIER_TIMEOUT_MS;
    try {
        const timeout = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), timeoutMs));
        const response = await Promise.race([
            params.llmService.generate(buildPrompt(description, params.chips || [])),
            timeout,
        ]);
        if (!response) {
            log().warn(`Enquiry classifier timed out after ${timeoutMs}ms; treating as a booking.`);
            return { type: "booking" };
        }
        const answer = parseAnswer(response.text || "");
        const type = ENQUIRY_TYPES.find((known) => known === (answer?.type || "").trim().toLowerCase());
        if (!type) {
            return { type: "booking" };
        }
        return { type, reasoning: answer?.reasoning };
    } catch (e) {
        log().warn(`Enquiry classifier failed: ${(e as Error).message}; treating as a booking.`);
        return { type: "booking" };
    }
}

/** Whether this enquiry should be kept away from the partner, per the app's configuration. */
export function isUnsupportedEnquiry(type: EnquiryType, config: UnsupportedEnquiryConfig | undefined): boolean {
    // A booking is never diverted, whatever an app configures -- that is the case the handoff exists for.
    if (type === "booking") {
        return false;
    }
    const configured = config?.types;
    const types = configured ? configured.map((value) => value.trim().toLowerCase()) : DEFAULT_UNSUPPORTED_ENQUIRY_TYPES;
    return types.indexOf(type) !== -1;
}
