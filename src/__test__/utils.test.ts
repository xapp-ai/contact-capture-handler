/*! Copyright (c) 2022, XAPP AI */
import { expect } from "chai";

import { RequestSlotMap } from "stentor-models";
import { IntentRequestBuilder } from "stentor-request";

import { ContactCaptureData } from "../data";

import { DEFAULT_CAPTURE_DATA, cleanCode, generateAlternativeSlots, lookingForHelp, newLeadGenerationData } from "../utils";

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
        const request = new IntentRequestBuilder().withAttributes({ CHAT_COMPLETION_RESULT: { needsAssistance: "YES" } }).build();
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

describe(`#${newLeadGenerationData.name}()`, () => {

    const data: ContactCaptureData = {
        capture: {
            data: [
                // all
                { active: true, type: "EMAIL", enums: [], questionContentKey: "emailQuestion", slotName: "email", acceptAnyInput: true, channel: "ALL" },
                // just chat
                { active: false, type: "PHONE", enums: [], questionContentKey: "phoneQuestion", slotName: "phone", acceptAnyInput: true, channel: "CHAT" },
                // just form
                { active: true, type: "FULL_NAME", enums: [], questionContentKey: "nameQuestion", slotName: "name", acceptAnyInput: true, channel: "FORM" },
                // all
                { active: true, type: "ZIP", enums: [], questionContentKey: "zipQuestion", slotName: "zip", acceptAnyInput: false, }
            ]
        }
    };
    it("returns all active data fields when no channel is passed", () => {
        const result = newLeadGenerationData(data);
        expect(result.data).to.deep.equal([
            { type: "EMAIL", enums: [], questionContentKey: "emailQuestion", slotName: "email", acceptAnyInput: true },
            { type: "FULL_NAME", enums: [], questionContentKey: "nameQuestion", slotName: "name", acceptAnyInput: true },
            { type: "ZIP", enums: [], questionContentKey: "zipQuestion", slotName: "zip", acceptAnyInput: false }
        ]);
        expect(result.lastModifiedMs).to.be.a("number");
    });
    it("returns active data fields for the specified channel", () => {
        const result = newLeadGenerationData(data, "FORM");
        expect(result.data).to.deep.equal([
            { type: "EMAIL", enums: [], questionContentKey: "emailQuestion", slotName: "email", acceptAnyInput: true },
            { type: "FULL_NAME", enums: [], questionContentKey: "nameQuestion", slotName: "name", acceptAnyInput: true },
            { type: "ZIP", enums: [], questionContentKey: "zipQuestion", slotName: "zip", acceptAnyInput: false }
        ]);
        expect(result.lastModifiedMs).to.be.a("number");
    });
    it("returns an empty array when no active data fields match the specified channel", () => {
        const result = newLeadGenerationData(data, "CHAT");
        expect(result.data).to.deep.equal([
            { type: "EMAIL", enums: [], questionContentKey: "emailQuestion", slotName: "email", acceptAnyInput: true },
            { type: "ZIP", enums: [], questionContentKey: "zipQuestion", slotName: "zip", acceptAnyInput: false }
        ]);
        expect(result.lastModifiedMs).to.be.a("number");
    });

    describe("when capture.data is missing or invalid", () => {
        it("asks for the job description last, accepting free text", () => {
            const result = newLeadGenerationData({} as unknown as ContactCaptureData, "CHAT");
            const message = result.data[result.data.length - 1];
            expect(message).to.deep.equal({
                type: "MESSAGE",
                enums: undefined,
                questionContentKey: "MessageQuestionContent",
                slotName: "message",
                acceptAnyInput: true,
            });
        });

        it("declares MESSAGE as required, matching agent-server's default required fields", () => {
            const message = DEFAULT_CAPTURE_DATA.find((d) => d.type === "MESSAGE");
            expect(message).to.include({
                slotName: "message",
                questionContentKey: "MessageQuestionContent",
                active: true,
                required: true,
                acceptAnyInput: true,
            });
        });

        it("does not add MESSAGE to a configured blueprint", () => {
            const configured = {
                capture: {
                    data: [
                        { type: "FULL_NAME", questionContentKey: "FullNameQuestionContent", slotName: "full_name", active: true },
                        { type: "PHONE", questionContentKey: "PhoneQuestionContent", slotName: "phone", active: true },
                    ],
                },
            } as unknown as ContactCaptureData;

            const result = newLeadGenerationData(configured);
            expect(result.data.map((d) => d.type)).to.deep.equal(["FULL_NAME", "PHONE"]);
        });

        it("returns default capture fields when capture.data is undefined", () => {
            const invalidData = {
                capture: {
                    serviceOptions: [
                        { id: "schedule_visit", label: "Schedule Visit", requiresDate: false }
                    ]
                }
            } as unknown as ContactCaptureData;

            const result = newLeadGenerationData(invalidData);
            expect(result.data).to.have.length(5);
            expect(result.data.map((d) => d.type)).to.deep.equal(["FULL_NAME", "PHONE", "EMAIL", "ZIP", "MESSAGE"]);
            expect(result.lastModifiedMs).to.be.a("number");
        });

        it("returns default capture fields when capture is undefined", () => {
            const invalidData = {} as unknown as ContactCaptureData;

            const result = newLeadGenerationData(invalidData);
            expect(result.data).to.have.length(5);
            expect(result.data.map((d) => d.type)).to.deep.equal(["FULL_NAME", "PHONE", "EMAIL", "ZIP", "MESSAGE"]);
            expect(result.lastModifiedMs).to.be.a("number");
        });

        it("returns default capture fields when data is null", () => {
            const invalidData = null as unknown as ContactCaptureData;

            const result = newLeadGenerationData(invalidData);
            expect(result.data).to.have.length(5);
            expect(result.data.map((d) => d.type)).to.deep.equal(["FULL_NAME", "PHONE", "EMAIL", "ZIP", "MESSAGE"]);
            expect(result.lastModifiedMs).to.be.a("number");
        });

        it("returns default capture fields when data is undefined", () => {
            const invalidData = undefined as unknown as ContactCaptureData;

            const result = newLeadGenerationData(invalidData);
            expect(result.data).to.have.length(5);
            expect(result.data.map((d) => d.type)).to.deep.equal(["FULL_NAME", "PHONE", "EMAIL", "ZIP", "MESSAGE"]);
            expect(result.lastModifiedMs).to.be.a("number");
        });

        it("returns default capture fields with FORM channel when capture.data is missing", () => {
            const invalidData = {
                capture: {
                    serviceOptions: []
                }
            } as unknown as ContactCaptureData;

            const result = newLeadGenerationData(invalidData, "FORM");
            expect(result.data).to.have.length(5);
            expect(result.data.map((d) => d.type)).to.deep.equal(["FULL_NAME", "PHONE", "EMAIL", "ZIP", "MESSAGE"]);
            expect(result.lastModifiedMs).to.be.a("number");
        });

        it("returns default capture fields with CHAT channel when capture.data is missing", () => {
            const invalidData = {
                capture: {}
            } as unknown as ContactCaptureData;

            const result = newLeadGenerationData(invalidData, "CHAT");
            expect(result.data).to.have.length(5);
            expect(result.data.map((d) => d.type)).to.deep.equal(["FULL_NAME", "PHONE", "EMAIL", "ZIP", "MESSAGE"]);
            expect(result.lastModifiedMs).to.be.a("number");
        });
    });
});