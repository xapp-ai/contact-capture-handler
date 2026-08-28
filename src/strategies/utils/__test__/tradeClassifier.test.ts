/*! Copyright (c) 2026, XAPP AI */
import * as chai from "chai";

import { LLMService, LLMServiceResponse, Prompt } from "stentor-models";

import { ExternalBookingData } from "../../../data";
import { COSTGUIDE_TRADES } from "../../../costguideTrades";
import { resolveBookingTrade, TRADE_CONFIDENCE_THRESHOLD } from "../tradeClassifier";

const expect = chai.expect;

const ROOFING = "Roofing - Asphalt Install or Replace";
const ROOF_REPAIR = "Roofing - Repair";
const BATHROOM = "Bathroom - Bathtub or Shower Updates";
const TERMITE = "Pest Control - Termite";

const BASE: ExternalBookingData = {
    enabled: true,
    provider: "costguide",
    advertiserId: 4944,
    campaignId: "6a283d45eddcf",
    campaignKey: "6YGTmNKxtjMDVkWPLwgC",
};

/** Records every prompt it is handed, and replies with whatever the test supplied. */
function stubLLM(reply: string | Error): LLMService & { prompts: Prompt[] } {
    const prompts: Prompt[] = [];
    return {
        prompts,
        generate: (prompt: Prompt): Promise<LLMServiceResponse> => {
            prompts.push(prompt);
            if (reply instanceof Error) {
                return Promise.reject(reply);
            }
            return Promise.resolve({ text: reply });
        },
    };
}

function answer(trade: string | null, confidence: number, reasoning = "because"): string {
    return JSON.stringify({ trade, confidence, reasoning });
}

/** The candidate list the classifier was actually constrained to, read off the sent prompt. */
function candidatesSentTo(llm: { prompts: Prompt[] }): string[] {
    const prompt = llm.prompts[0] as Prompt & { messages: { content: string }[] };
    const text = prompt.messages.map((m) => m.content).join("\n");
    return COSTGUIDE_TRADES.filter((trade) => text.includes(trade));
}

describe("#resolveBookingTrade()", () => {
    describe("without a model call", () => {
        it("uses the only allowed trade for a single-trade contractor", async () => {
            const llm = stubLLM(answer(TERMITE, 1));

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING] },
                description: "my roof is leaking",
                llmService: llm,
            });

            expect(result.trade).to.equal(ROOFING);
            expect(result.method).to.equal("single-trade");
            expect(llm.prompts).to.have.length(0);
        });

        it("uses defaultTrade when that is the only thing configured", async () => {
            const llm = stubLLM(answer(TERMITE, 1));

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, defaultTrade: BATHROOM },
                description: "my roof is leaking",
                llmService: llm,
            });

            expect(result.trade).to.equal(BATHROOM);
            expect(result.method).to.equal("default");
            expect(llm.prompts).to.have.length(0);
        });

        it("omits the handoff when nothing at all is configured and there is no model", async () => {
            const result = await resolveBookingTrade({ externalBooking: BASE, description: "help" });

            expect(result.trade).to.equal(undefined);
            expect(result.method).to.equal("omitted");
        });
    });

    describe("classification", () => {
        it("returns the classified trade with its confidence and reasoning", async () => {
            const llm = stubLLM(answer(ROOF_REPAIR, 0.9, "leak implies repair"));

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, ROOF_REPAIR] },
                description: "my roof is leaking",
                llmService: llm,
            });

            expect(result.trade).to.equal(ROOF_REPAIR);
            expect(result.method).to.equal("classified");
            expect(result.confidence).to.equal(0.9);
            expect(result.reasoning).to.equal("leak implies repair");
        });

        it("classifies from the chips when there is no free-text message", async () => {
            const llm = stubLLM(answer(ROOF_REPAIR, 0.8));

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, ROOF_REPAIR] },
                chips: ["Roof repair"],
                llmService: llm,
            });

            expect(result.method).to.equal("classified");
            expect(llm.prompts).to.have.length(1);
        });

        it("tolerates a fenced code block around the JSON", async () => {
            const llm = stubLLM("```json\n" + answer(ROOF_REPAIR, 0.9) + "\n```");

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, ROOF_REPAIR] },
                description: "leak",
                llmService: llm,
            });

            expect(result.trade).to.equal(ROOF_REPAIR);
        });

        it("matches the canonical trade regardless of the casing the model returns", async () => {
            const llm = stubLLM(answer(ROOF_REPAIR.toLowerCase(), 0.9));

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, ROOF_REPAIR] },
                description: "leak",
                llmService: llm,
            });

            expect(result.trade).to.equal(ROOF_REPAIR);
        });

        it("falls back to the full taxonomy when there is no allow list and no default", async () => {
            const llm = stubLLM(answer(TERMITE, 0.9));

            const result = await resolveBookingTrade({
                externalBooking: BASE,
                description: "termites in the deck",
                llmService: llm,
            });

            expect(result.trade).to.equal(TERMITE);
            expect(result.method).to.equal("classified");
        });
    });

    describe("guarding against a model that makes things up", () => {
        it("discards a trade that is not in the taxonomy at all", async () => {
            const llm = stubLLM(answer("Roofing - Thatch Install", 0.99));

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, ROOF_REPAIR], defaultTrade: ROOFING },
                description: "thatch please",
                llmService: llm,
            });

            expect(result.trade).to.equal(ROOFING);
            expect(result.method).to.equal("default");
        });

        it("discards a real trade the contractor does not accept", async () => {
            // The whole point of allowedTrades: a roofer must never be handed a pest-control lead.
            const llm = stubLLM(answer(TERMITE, 0.99));

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, ROOF_REPAIR], defaultTrade: ROOFING },
                description: "I have termites",
                llmService: llm,
            });

            expect(result.trade).to.equal(ROOFING);
            expect(result.method).to.equal("default");
        });

        it("never offers a disallowed trade as a candidate in the first place", async () => {
            const llm = stubLLM(answer(ROOFING, 0.9));

            await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, ROOF_REPAIR] },
                description: "roof",
                llmService: llm,
            });

            expect(candidatesSentTo(llm)).to.have.members([ROOFING, ROOF_REPAIR]);
        });

        it("omits rather than passing a bogus trade on when there is no default to fall back to", async () => {
            const llm = stubLLM(answer("Underwater Basket Weaving", 0.99));

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, ROOF_REPAIR] },
                description: "weaving",
                llmService: llm,
            });

            expect(result.trade).to.equal(undefined);
            expect(result.method).to.equal("omitted");
        });

        it("ignores an allowedTrades entry that is not a real trade", async () => {
            const llm = stubLLM(answer(ROOFING, 0.9));

            await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, ROOF_REPAIR, "Rooofing - Typo"] },
                description: "roof",
                llmService: llm,
            });

            expect(candidatesSentTo(llm)).to.have.members([ROOFING, ROOF_REPAIR]);
        });

        it("treats an allow list whose only usable entry survives as a single-trade contractor", async () => {
            const llm = stubLLM(answer(ROOF_REPAIR, 0.9));

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, "Rooofing - Typo"] },
                description: "roof",
                llmService: llm,
            });

            expect(result.trade).to.equal(ROOFING);
            expect(result.method).to.equal("single-trade");
            expect(llm.prompts).to.have.length(0);
        });

        it("never widens to the full taxonomy when an allow list was configured but none of it validated", async () => {
            // The failure this guards: an operator who tried to RESTRICT the contractor to roofing,
            // and fumbled the string, would otherwise get the opposite of what they asked for --
            // all 117 trades on the table, indistinguishable from having configured nothing.
            const llm = stubLLM(answer(TERMITE, 0.99));

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: ["Roofing - Asphalt  Install or Replace"] },
                description: "I have termites in my attic",
                llmService: llm,
            });

            expect(llm.prompts).to.have.length(0);
            expect(result.trade).to.equal(undefined);
            expect(result.method).to.equal("omitted");
        });

        it("falls back to the default when an allow list was configured but none of it validated", async () => {
            const llm = stubLLM(answer(TERMITE, 0.99));

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: ["Rooofing - Typo"], defaultTrade: ROOFING },
                description: "I have termites in my attic",
                llmService: llm,
            });

            expect(llm.prompts).to.have.length(0);
            expect(result.trade).to.equal(ROOFING);
            expect(result.method).to.equal("default");
        });

        it("does not send a defaultTrade that is not a real trade", async () => {
            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, defaultTrade: "Roofing - Thatch" },
                description: "roof",
            });

            expect(result.trade).to.equal(undefined);
            expect(result.method).to.equal("omitted");
        });
    });

    describe("confidence", () => {
        it("falls back to defaultTrade below the threshold", async () => {
            const llm = stubLLM(answer(ROOF_REPAIR, TRADE_CONFIDENCE_THRESHOLD - 0.01));

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, ROOF_REPAIR], defaultTrade: ROOFING },
                description: "something vague",
                llmService: llm,
            });

            expect(result.trade).to.equal(ROOFING);
            expect(result.method).to.equal("default");
        });

        it("accepts a result exactly at the threshold", async () => {
            const llm = stubLLM(answer(ROOF_REPAIR, TRADE_CONFIDENCE_THRESHOLD));

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, ROOF_REPAIR], defaultTrade: ROOFING },
                description: "leak",
                llmService: llm,
            });

            expect(result.trade).to.equal(ROOF_REPAIR);
            expect(result.method).to.equal("classified");
        });


        it("tells the model the list is category representatives, not literal job descriptions", async () => {
            // CostGuide's own guidance (Vito, 2026-08-14): "for a contractor who takes roofing leads
            // and windows leads, mapping every roofing related lead to 'Roofing - Asphalt Install or
            // Replace' and every windows lead to 'Windows - Replace 6-9 Windows' should be just
            // fine; no need to get more granular."
            //
            // Without saying so, the model reads the entries literally and refuses the match: on
            // 2026-08-28 "I want a standing seam metal roof installed" came back as a no-match
            // against a list whose only roofing entry was the asphalt one -- dropping a roofing
            // lead a roofer wants. Reserve null for work no listed trade covers at all.
            const llm = stubLLM(answer(ROOFING, 0.9));

            await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, BATHROOM] },
                description: "standing seam metal roof",
                llmService: llm,
            });

            const system = (llm.prompts[0] as Prompt & { messages: { role: string; content: string }[] })
                .messages.filter((m) => m.role === "system").map((m) => m.content).join(" ").toLowerCase();

            expect(system).to.contain("categor");
            expect(system).to.match(/material|quantity|granular/);
        });

        it("treats an explicit no-match as a no-match, not as a zero-confidence answer", async () => {
            // guessJobTypes returned { confidence: 0, id: default } and callers read the id without
            // reading the confidence, silently marking real leads dead. Keep the outcomes distinct.
            const llm = stubLLM(answer(null, 0));

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, ROOF_REPAIR], defaultTrade: ROOFING },
                description: "who knows",
                llmService: llm,
            });

            expect(result.method).to.equal("no-match");
            expect(result.confidence).to.equal(undefined);
        });

        it("omits rather than defaulting when no listed trade fits the enquiry", async () => {
            // Measured against the real model 2026-08-28: "My furnace stopped working and the house
            // is freezing" against a roofing/windows/siding/bath contractor came back as a no-match
            // and the ladder posted it as "Roofing - Asphalt Install or Replace". A furnace enquiry
            // handed to a roofer as a roofing lead is worse for them than no lead at all, so the
            // model saying "none of these" has to beat the operator's default.
            const llm = stubLLM(answer(null, 0.95, "the enquiry is about heating, not any listed trade"));

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, BATHROOM], defaultTrade: ROOFING },
                description: "my furnace stopped working and the house is freezing",
                llmService: llm,
            });

            expect(result.method).to.equal("no-match");
            expect(result.trade).to.equal(undefined);
        });

        it("keeps the model's reasoning on a no-match, so a dropped handoff is diagnosable", async () => {
            const llm = stubLLM(answer(null, 0.9, "heating work, none of the listed trades cover it"));

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, BATHROOM], defaultTrade: ROOFING },
                description: "my furnace stopped working",
                llmService: llm,
            });

            expect(result.reasoning).to.equal("heating work, none of the listed trades cover it");
        });

        it("still defaults when the model names a trade outside the list, which is not the same signal", async () => {
            // A value that is not on the list is the model paraphrasing or inventing, not the model
            // reporting that nothing fits. The enquiry may well be in scope, so the default stands.
            const llm = stubLLM(answer("Roofing - Asphalt", 0.95));

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, BATHROOM], defaultTrade: ROOFING },
                description: "my roof is leaking",
                llmService: llm,
            });

            expect(result.method).to.equal("default");
            expect(result.trade).to.equal(ROOFING);
        });

        it("still defaults on a low-confidence match, since the enquiry did fit something", async () => {
            const llm = stubLLM(answer(BATHROOM, TRADE_CONFIDENCE_THRESHOLD - 0.01));

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, BATHROOM], defaultTrade: ROOFING },
                description: "something about the bathroom maybe",
                llmService: llm,
            });

            expect(result.method).to.equal("default");
            expect(result.trade).to.equal(ROOFING);
        });
    });

    describe("degrading safely", () => {
        it("falls back to defaultTrade when the model call throws", async () => {
            const llm = stubLLM(new Error("bedrock exploded"));

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, ROOF_REPAIR], defaultTrade: ROOFING },
                description: "leak",
                llmService: llm,
            });

            expect(result.trade).to.equal(ROOFING);
            expect(result.method).to.equal("default");
        });

        it("falls back when the model returns something that is not JSON", async () => {
            const llm = stubLLM("I'm afraid I can't do that");

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, ROOF_REPAIR], defaultTrade: ROOFING },
                description: "leak",
                llmService: llm,
            });

            expect(result.trade).to.equal(ROOFING);
            expect(result.method).to.equal("default");
        });

        it("falls back when no llmService is wired at all", async () => {
            // ContextServices.llmService is optional, so absent is a normal runtime state.
            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, ROOF_REPAIR], defaultTrade: ROOFING },
                description: "leak",
            });

            expect(result.trade).to.equal(ROOFING);
            expect(result.method).to.equal("default");
        });

        it("does not call the model when there is nothing to classify", async () => {
            const llm = stubLLM(answer(ROOF_REPAIR, 0.9));

            const result = await resolveBookingTrade({
                externalBooking: { ...BASE, allowedTrades: [ROOFING, ROOF_REPAIR], defaultTrade: ROOFING },
                description: "   ",
                chips: [],
                llmService: llm,
            });

            expect(llm.prompts).to.have.length(0);
            expect(result.method).to.equal("default");
        });
    });
});
