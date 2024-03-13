/*! Copyright (c) 2022, XAPP AI */
import { expect } from "chai";

import { IntentRequestBuilder, RequestSlotMap } from "stentor";
import { cleanCode, generateAlternativeSlots, lookingForHelp } from "../utils";

describe(`#${generateAlternativeSlots.name}()`, () => {
    describe('when asking for the LAST_NAME', () => {
        describe("and receive a last name with first name already on slots", () => {
            it('returns the right alternative', () => {
                const first_and_last: RequestSlotMap = {
                    first_name: {
                        name: "first_name",
                        value: "Michael"
                    },
                    last_name: {
                        name: "last_name",
                        value: ""
                    }
                };
                const last: RequestSlotMap = {
                    last_name: {
                        name: "last_name",
                        value: "Myers"
                    }
                };
                const request = new IntentRequestBuilder().withSlots(last).build();
                const alternatives = generateAlternativeSlots({ ...first_and_last }, request, "LAST_NAME");
                expect(alternatives).to.deep.equal({});
            });
        });
        describe("when first name exists and last name comes in on the first name", () => {
            it("sets the correct first and last name", () => {
                const first_and_last: RequestSlotMap = {
                    first_name: {
                        name: "first_name",
                        value: "Michael"
                    },
                    full_name: {
                        name: "full_name",
                        value: "Michael"
                    }
                };
                const first: RequestSlotMap = {
                    first_name: {
                        name: "first_name",
                        value: "Myers"
                    }
                };
                const request = new IntentRequestBuilder().withSlots(first).build();
                const alternatives = generateAlternativeSlots({ ...first_and_last }, request, "LAST_NAME");

                expect(alternatives).to.deep.equal({
                    first_name: {
                        name: "first_name",
                        value: "Michael"
                    },
                    last_name: {
                        name: "last_name",
                        value: "Myers"
                    }
                });
            });
        });
        describe("when knowledge answer comes in", () => {
            describe("when it is a long query", () => {
                it("does nothing", () => {
                    const first_only: RequestSlotMap = {
                        first_name: {
                            name: "first_name",
                            value: "Michael"
                        }
                    };

                    const request = new IntentRequestBuilder().withIntentId("KnowledgeAnswer").withRawQuery("what is knowledge").build();
                    const alternatives = generateAlternativeSlots({ ...first_only }, request, "LAST_NAME");

                    expect(alternatives).to.deep.equal({});
                });
            });
            it("uses the query as last name", () => {
                const first_only: RequestSlotMap = {
                    first_name: {
                        name: "first_name",
                        value: "Michael"
                    }
                };

                const request = new IntentRequestBuilder().withIntentId("KnowledgeAnswer").withRawQuery("myers").build();
                const alternatives = generateAlternativeSlots({ ...first_only }, request, "LAST_NAME");

                expect(alternatives).to.deep.equal({
                    last_name: {
                        name: "last_name",
                        value: "Myers"
                    }
                });
            });
        })
    });
    describe('when asking for the FULL_NAME', () => {
        describe("and you receive a title and last name", () => {
            it('returns the right alternative', () => {
                const slots: RequestSlotMap = {
                    last_name: {
                        name: "last_name",
                        value: "Myers"
                    },
                    title: {
                        name: "title",
                        value: "dr"
                    }
                };
                const request = new IntentRequestBuilder().withSlots(slots).build();
                const alternatives = generateAlternativeSlots({ ...slots }, request, "FULL_NAME");
                expect(alternatives.first_name).to.be.undefined;
                expect(alternatives.last_name).to.be.undefined;
                // this is modification for this one
            });
        });
    });
    describe('when asking for the FIRST_NAME', () => {
        describe('but receive a last name', () => {
            it('returns the right alternative', () => {
                const last: RequestSlotMap = {
                    last_name: {
                        name: "last_name",
                        value: "Michael"
                    }
                };
                const request = new IntentRequestBuilder().withSlots(last).build();
                const alternatives = generateAlternativeSlots({ ...last }, request, "FIRST_NAME");
                expect(alternatives.first_name).to.deep.equal({
                    name: "first_name",
                    value: "Michael"
                });
            });
        });
        describe('but receive both first and last', () => {
            it('returns the right alternative', () => {
                const first_last: RequestSlotMap = {
                    first_name: {
                        name: "first_name",
                        value: "Michael"
                    },
                    last_name: {
                        name: "last_name",
                        value: "Michael"
                    }
                }
                const request = new IntentRequestBuilder().withSlots(first_last).build();
                const alternatives = generateAlternativeSlots({ ...first_last }, request, "FIRST_NAME");
                expect(alternatives).to.deep.equal({});
            });
        });
        describe("when knowledge answer comes in", () => {
            describe("when it is a long query", () => {
                it("does nothing", () => {

                    const request = new IntentRequestBuilder().withIntentId("KnowledgeAnswer").withRawQuery("what is knowledge").build();
                    const alternatives = generateAlternativeSlots({}, request, "FIRST_NAME");

                    expect(alternatives).to.deep.equal({});
                });
            });
            it("uses the query as last name", () => {

                const request = new IntentRequestBuilder().withIntentId("KnowledgeAnswer").withRawQuery("michael").build();
                const alternatives = generateAlternativeSlots({}, request, "FIRST_NAME");

                expect(alternatives).to.deep.equal({
                    first_name: {
                        name: "first_name",
                        value: "Michael"
                    }
                });
            });
        })
    });
});

describe(`#${cleanCode.name}()`, () => {
    it("cleans the code", () => {
        expect(cleanCode("\"C221276E-D3CF-4904-AE21-9B0289B7FA4A  \"")).to.equal("C221276E-D3CF-4904-AE21-9B0289B7FA4A");
        expect(cleanCode("C221276E-D3CF-4904-AE21-9B0289B7FA4A")).to.equal("C221276E-D3CF-4904-AE21-9B0289B7FA4A");
    });
});

describe(`#${lookingForHelp.name}()`, () => {
    it("returns true when the request is a HelpIntent", () => {
        const request = new IntentRequestBuilder().withIntentId("HelpIntent").build();
        const result = lookingForHelp(request);
        expect(result).to.be.true;
    });

    it("returns true when the request is from a HelpIntent", () => {
        const request = new IntentRequestBuilder().build();
        request.overrideKey = "HelpIntent";
        const result = lookingForHelp(request);
        expect(result).to.be.true;
    });

    it("returns true when the request has CHAT_COMPLETION_RESULT attribute with needsAssistance set to true", () => {
        const request = new IntentRequestBuilder().withAttributes({ CHAT_COMPLETION_RESULT: { needsAssistance: true } }).build();
        const result = lookingForHelp(request);
        expect(result).to.be.true;
    });

    it("returns true when the request has CHAT_COMPLETION_RESULT attribute with needsAssistance set to false", () => {
        const request = new IntentRequestBuilder().withAttributes({ CHAT_COMPLETION_RESULT: { needsAssistance: false } }).build();
        const result = lookingForHelp(request);
        expect(result).to.be.false;
    });

    it("returns false when the request is not a HelpIntent and does not have CHAT_COMPLETION_RESULT attribute", () => {
        const request = new IntentRequestBuilder().build();
        const result = lookingForHelp(request);
        expect(result).to.be.false;
    });
});