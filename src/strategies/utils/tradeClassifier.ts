/*! Copyright (c) 2026, XAPP AI */

import { log } from "stentor-logger";
import { CompletionPrompt, LLMService } from "stentor-models";

import { COSTGUIDE_TRADES, canonicalTrade } from "../../costguideTrades";
import { ExternalBookingData } from "../../data";

/**
 * Resolves the CostGuide trade for a booking handoff from what the visitor actually told us.
 *
 * This is the same idea as the CRM job-type classifier used for availability, pointed at a
 * different taxonomy: there we classify so we can compute availability ourselves, here we classify
 * so CostGuide can. It runs at capture time, once the message and chips exist, so the outcome can
 * be recorded on the lead alongside everything else we know.
 */

/** How a trade was arrived at. Recorded on the lead -- see {@link TradeResolution}. */
export type TradeResolutionMethod =
    /** The contractor accepts exactly one trade, so there was nothing to decide. */
    | "single-trade"
    /** The model picked it, above the confidence threshold, from the accepted list. */
    | "classified"
    /** Configured fallback: classification did not land, or was never attempted. */
    | "default"
    /** Nothing resolved. The caller omits the handoff rather than send a bad trade. */
    | "omitted";

export interface TradeResolution {
    /** The trade to send, or undefined when the handoff should be omitted. */
    readonly trade?: string;
    readonly method: TradeResolutionMethod;
    /** Only set for `classified` -- an unclassified outcome has no confidence to report. */
    readonly confidence?: number;
    /** Only set for `classified` -- the model's stated reasoning, for after-the-fact review. */
    readonly reasoning?: string;
}

/**
 * Below this, the classification is discarded and the ladder falls through to `defaultTrade`.
 * A wrong trade books the homeowner with the wrong kind of contractor *after* we have taken their
 * details, so the bar is deliberately not generous.
 */
export const TRADE_CONFIDENCE_THRESHOLD = 0.6;

/** House Bedrock model for cheap classification work. */
export const TRADE_CLASSIFIER_MODEL = "us.anthropic.claude-haiku-4-5-20251001-v1:0";

/**
 * The visitor is waiting on the submit response, so this call is on the critical path. Bounded
 * well under the widget's own render budget; a timeout degrades to `defaultTrade`.
 */
export const TRADE_CLASSIFIER_TIMEOUT_MS = 4000;

const SYSTEM_PROMPT =
    "You match a home-services enquiry to one trade from a fixed list. " +
    "Reply with JSON only: {\"trade\": <exact string from the list, or null>, " +
    "\"confidence\": <0 to 1>, \"reasoning\": <one short sentence>}. " +
    "The trade MUST be copied character-for-character from the list. " +
    "If no listed trade genuinely fits the enquiry, return null for trade -- " +
    "a wrong match is much worse than no match.";

interface ClassifierAnswer {
    readonly trade?: string;
    readonly confidence?: number;
    readonly reasoning?: string;
}

/** Case-insensitive membership test against the trades this contractor actually accepts. */
function matchWithin(value: string | undefined, candidates: readonly string[]): string | undefined {
    if (!value) {
        return undefined;
    }
    const needle = value.trim().toLowerCase();
    return candidates.find((candidate) => candidate.toLowerCase() === needle);
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
        log().warn(`Trade classifier returned unparseable output: ${(e as Error).message}`);
    }
    return undefined;
}

function buildPrompt(description: string | undefined, chips: string[], candidates: readonly string[]): CompletionPrompt {
    const enquiry = [
        description ? `Message: ${description}` : undefined,
        chips.length > 0 ? `Selected: ${chips.join(", ")}` : undefined,
    ]
        .filter((line): line is string => !!line)
        .join("\n");

    return {
        type: "completions",
        model: TRADE_CLASSIFIER_MODEL,
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `${enquiry}\n\nList:\n${candidates.join("\n")}` },
        ],
        response_format: { type: "json_object" },
        max_tokens: 300,
        temperature: 0,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
    };
}

export interface ResolveBookingTradeParams {
    readonly externalBooking: ExternalBookingData;
    /** The visitor's free-text message, when they left one. */
    readonly description?: string;
    /** Service options the visitor selected, e.g. the `help_type` chip. */
    readonly chips?: string[];
    /** From `ContextServices`. Optional there, so absent is a normal state rather than an error. */
    readonly llmService?: LLMService;
}

/**
 * Runs the resolution ladder:
 *
 * 1. exactly one allowed trade -> use it, no model call
 * 2. no allow list but a default -> use the default, no model call
 * 3. classify, constrained to the accepted list, at or above the confidence threshold
 * 4. `defaultTrade`
 * 5. nothing -> omit the handoff
 *
 * Never throws: a classifier failure degrades down the ladder rather than failing the submit.
 */
export async function resolveBookingTrade(params: ResolveBookingTradeParams): Promise<TradeResolution> {
    const { externalBooking, description, chips = [], llmService } = params;

    // Operator-authored, so validate rather than trust: an entry that is not a real CostGuide
    // trade can never be matched by classification and must not reach the payload.
    const allowed: string[] = [];
    for (const entry of externalBooking.allowedTrades ?? []) {
        const canonical = canonicalTrade(entry);
        if (canonical) {
            allowed.push(canonical);
        } else {
            log().warn(`Ignoring allowedTrades entry that is not a CostGuide trade: "${entry}"`);
        }
    }

    // Also operator-authored, and the last rung of the ladder -- an unvalidated one would be
    // exactly the "unmatched value falls through and is sent anyway" bug this pattern already has.
    const fallbackTrade = canonicalTrade(externalBooking.defaultTrade);
    if (externalBooking.defaultTrade && !fallbackTrade) {
        log().warn(`Ignoring defaultTrade that is not a CostGuide trade: "${externalBooking.defaultTrade}"`);
    }

    const useFallback = (): TradeResolution =>
        fallbackTrade ? { trade: fallbackTrade, method: "default" } : { method: "omitted" };

    if (allowed.length === 1) {
        return { trade: allowed[0], method: "single-trade" };
    }

    // Nothing narrows the taxonomy, but the contractor told us what they do. Classifying against
    // all 117 trades here could hand a roofer a pest-control booking; their default is safer.
    if (allowed.length === 0 && fallbackTrade) {
        return useFallback();
    }

    const trimmed = description?.trim();
    if (!trimmed && chips.length === 0) {
        return useFallback();
    }

    if (!llmService) {
        log().warn("No llmService on context; falling back for the CostGuide trade");
        return useFallback();
    }

    const candidates = allowed.length > 0 ? allowed : COSTGUIDE_TRADES;

    let answer: ClassifierAnswer | undefined;
    try {
        const response = await llmService.generate(buildPrompt(trimmed, chips, candidates), {
            timeout: TRADE_CLASSIFIER_TIMEOUT_MS,
        });
        answer = parseAnswer(response?.text ?? "");
    } catch (e) {
        log().warn(`Trade classification failed, falling back: ${(e as Error).message}`);
        return useFallback();
    }

    if (!answer) {
        return useFallback();
    }

    // The model can return a string that was never in the list -- its own confidence is no
    // evidence that it was. Match first, believe second.
    const matched = matchWithin(answer.trade, candidates);
    if (!matched) {
        if (answer.trade) {
            log().warn(`Trade classifier returned a value outside the accepted list: "${answer.trade}"`);
        }
        return useFallback();
    }

    const confidence = typeof answer.confidence === "number" ? answer.confidence : 0;
    if (confidence < TRADE_CONFIDENCE_THRESHOLD) {
        log().info(`Trade "${matched}" below the confidence threshold (${confidence}), falling back`);
        return useFallback();
    }

    return {
        trade: matched,
        method: "classified",
        confidence,
        reasoning: typeof answer.reasoning === "string" ? answer.reasoning : undefined,
    };
}
