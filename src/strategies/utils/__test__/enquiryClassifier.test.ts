/*! Copyright (c) 2026, XAPP AI */
import * as chai from "chai";

import { LLMService, LLMServiceResponse, Prompt } from "stentor-models";

import {
    canDivertEnquiry,
    classifyEnquiry,
    DEFAULT_UNSUPPORTED_ENQUIRY_TYPES,
    isUnsupportedEnquiry,
} from "../enquiryClassifier";

const expect = chai.expect;

function stubLLM(reply: string | Error, delayMs = 0): LLMService & { prompts: Prompt[] } {
    const prompts: Prompt[] = [];
    return {
        prompts,
        generate: (prompt: Prompt): Promise<LLMServiceResponse> => {
            prompts.push(prompt);
            if (reply instanceof Error) {
                return Promise.reject(reply);
            }
            return new Promise((resolve) => setTimeout(() => resolve({ text: reply }), delayMs));
        },
    };
}

const answer = (type: string, reasoning = "because"): string => JSON.stringify({ type, reasoning });

describe("#classifyEnquiry()", () => {
    it("reads a cancellation for what it is", async () => {
        const result = await classifyEnquiry({ description: "Cancel appointment", llmService: stubLLM(answer("cancellation")) });

        expect(result.type).to.equal("cancellation");
    });

    it("reads spam for what it is", async () => {
        const result = await classifyEnquiry({ description: "SEO services for your site", llmService: stubLLM(answer("spam")) });

        expect(result.type).to.equal("spam");
    });

    it("calls a real enquiry a booking", async () => {
        const result = await classifyEnquiry({ description: "need a new roof", llmService: stubLLM(answer("booking")) });

        expect(result.type).to.equal("booking");
    });

    // Fail OPEN. A homeowner with a real job must not be turned away because a model call
    // failed, so every unhappy path resolves to "booking" and the handoff proceeds as before.
    it("treats an unparseable answer as a booking", async () => {
        const result = await classifyEnquiry({ description: "hello", llmService: stubLLM("not json at all") });

        expect(result.type).to.equal("booking");
    });

    it("treats a model error as a booking", async () => {
        const result = await classifyEnquiry({ description: "hello", llmService: stubLLM(new Error("bedrock down")) });

        expect(result.type).to.equal("booking");
    });

    it("treats an unknown type as a booking rather than guessing", async () => {
        const result = await classifyEnquiry({ description: "hello", llmService: stubLLM(answer("nonsense")) });

        expect(result.type).to.equal("booking");
    });

    // A homeowner can submit with a chip and no message at all: the message field can be
    // hidden or optional, and the chips are operator-configurable -- an operator can offer
    // "Cancel my appointment" as a chip. Skipping classification there sends exactly the
    // submission this exists to divert straight into the partner's booking form.
    it("classifies a chips-only submission", async () => {
        const llm = stubLLM(answer("cancellation"));

        const result = await classifyEnquiry({ chips: ["Cancel my appointment"], llmService: llm });

        expect(result.type).to.equal("cancellation");
        expect(llm.prompts).to.have.length(1);
    });

    it("sends the chips to the model when there is no message", async () => {
        const llm = stubLLM(answer("cancellation"));

        await classifyEnquiry({ chips: ["Cancel my appointment"], llmService: llm });

        const prompt = llm.prompts[0] as Prompt & { messages: { content: string }[] };
        expect(prompt.messages.map((m) => m.content).join("\n")).to.contain("Cancel my appointment");
    });

    it("does not call the model when there is neither a message nor a chip", async () => {
        const llm = stubLLM(answer("spam"));

        const result = await classifyEnquiry({ description: "   ", chips: [], llmService: llm });

        expect(result.type).to.equal("booking");
        expect(llm.prompts).to.have.length(0);
    });

    it("does not call the model when there is no llm service", async () => {
        const result = await classifyEnquiry({ description: "Cancel appointment" });

        expect(result.type).to.equal("booking");
    });

    it("gives up rather than holding the visitor on a slow model", async () => {
        const result = await classifyEnquiry({
            description: "Cancel appointment",
            llmService: stubLLM(answer("cancellation"), 80),
            timeoutMs: 10,
        });

        expect(result.type).to.equal("booking");
    });
});

describe("#isUnsupportedEnquiry()", () => {
    it("diverts the types configured for the app", () => {
        expect(isUnsupportedEnquiry("cancellation", { types: ["cancellation"] })).to.equal(true);
        expect(isUnsupportedEnquiry("spam", { types: ["cancellation"] })).to.equal(false);
    });

    it("falls back to the default set when the app configures none", () => {
        for (const type of DEFAULT_UNSUPPORTED_ENQUIRY_TYPES) {
            expect(isUnsupportedEnquiry(type, undefined)).to.equal(true);
        }
        expect(isUnsupportedEnquiry("booking", undefined)).to.equal(false);
    });

    // Configuring an empty list is a deliberate "send everything through", not an oversight.
    it("sends everything through when the list is explicitly empty", () => {
        expect(isUnsupportedEnquiry("spam", { types: [] })).to.equal(false);
    });

    it("ignores case and spacing in configured types", () => {
        expect(isUnsupportedEnquiry("cancellation", { types: [" Cancellation "] })).to.equal(true);
    });

    it("never diverts a booking, whatever is configured", () => {
        expect(isUnsupportedEnquiry("booking", { types: ["booking", "spam"] })).to.equal(false);
    });
});

describe("#canDivertEnquiry()", () => {
    // The classifier is a model call on the critical path. An app that has opted out of
    // diverting can never use the answer, so it should not wait for one -- and for a
    // single-trade advertiser the trade classifier makes no call either, so that submit goes
    // back to zero model calls.
    it("is false when an app has explicitly opted out", () => {
        expect(canDivertEnquiry({ types: [] })).to.equal(false);
    });

    it("is true by default, and for a configured list", () => {
        expect(canDivertEnquiry(undefined)).to.equal(true);
        expect(canDivertEnquiry({})).to.equal(true);
        expect(canDivertEnquiry({ types: ["spam"] })).to.equal(true);
    });
});
