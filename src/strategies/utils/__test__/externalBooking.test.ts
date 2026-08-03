/*! Copyright (c) 2024, XAPP AI */
import { expect } from "chai";

import {
    splitName,
    extractZipFromAddress,
    normalizePhone,
    resolveTrade,
    buildCostGuideConfig,
} from "../externalBooking";

describe("externalBooking utilities", () => {
    describe("splitName", () => {
        it("splits 'Jane Doe' into Jane/Doe", () => {
            const result = splitName("Jane Doe");
            expect(result).to.deep.equal({ firstName: "Jane", lastName: "Doe" });
        });

        it("splits 'Mary Anne Van Der Berg' into Mary/Anne Van Der Berg", () => {
            const result = splitName("Mary Anne Van Der Berg");
            expect(result).to.deep.equal({ firstName: "Mary", lastName: "Anne Van Der Berg" });
        });

        it("handles single-token name 'Cher'", () => {
            const result = splitName("Cher");
            expect(result).to.deep.equal({ firstName: "Cher", lastName: "" });
        });

        it("handles empty string", () => {
            const result = splitName("");
            expect(result).to.deep.equal({ firstName: "", lastName: "" });
        });

        it("handles whitespace-only string", () => {
            const result = splitName("   ");
            expect(result).to.deep.equal({ firstName: "", lastName: "" });
        });

        it("trims leading/trailing whitespace", () => {
            const result = splitName("  Jane Doe  ");
            expect(result).to.deep.equal({ firstName: "Jane", lastName: "Doe" });
        });
    });

    describe("extractZipFromAddress", () => {
        it("extracts 5-digit zip from address", () => {
            expect(extractZipFromAddress("123 Main St, Springfield, IL 62701")).to.equal("62701");
        });

        it("extracts zip with +4 extension", () => {
            expect(extractZipFromAddress("123 Main St, Springfield, IL 62701-1234")).to.equal("62701");
        });

        it("returns undefined when no zip found", () => {
            expect(extractZipFromAddress("123 Main St, Springfield, IL")).to.be.undefined;
        });

        it("returns undefined for empty string", () => {
            expect(extractZipFromAddress("")).to.be.undefined;
        });

        it("handles zip at end of address", () => {
            expect(extractZipFromAddress("123 Any St. 17002")).to.equal("17002");
        });
    });

    describe("normalizePhone", () => {
        it("formats 10-digit phone as NNN-NNN-NNNN", () => {
            expect(normalizePhone("5550001234")).to.equal("555-000-1234");
        });

        it("formats phone with existing formatting", () => {
            expect(normalizePhone("(555) 000-1234")).to.equal("555-000-1234");
        });

        it("passes through already-formatted phone", () => {
            expect(normalizePhone("555-000-1234")).to.equal("555-000-1234");
        });

        it("passes through international phone unchanged", () => {
            expect(normalizePhone("+1-555-000-1234")).to.equal("+1-555-000-1234");
        });

        it("passes through short phone unchanged", () => {
            expect(normalizePhone("5551234")).to.equal("5551234");
        });

        it("returns empty string for empty input", () => {
            expect(normalizePhone("")).to.equal("");
        });
    });

    describe("resolveTrade", () => {
        const tradeMap = {
            roofing: "Roofing - Asphalt Install or Replace",
            windows: "Windows - Replace 6-9 Windows",
        };

        it("resolves from tradeMap when service matches", () => {
            expect(resolveTrade("roofing", tradeMap, "Default Trade")).to.equal("Roofing - Asphalt Install or Replace");
        });

        it("falls back to defaultTrade when service not in map", () => {
            expect(resolveTrade("plumbing", tradeMap, "Default Trade")).to.equal("Default Trade");
        });

        it("returns undefined when neither resolves", () => {
            expect(resolveTrade("plumbing", tradeMap, undefined)).to.be.undefined;
        });

        it("returns undefined when service is undefined", () => {
            expect(resolveTrade(undefined, tradeMap, undefined)).to.be.undefined;
        });

        it("uses defaultTrade when tradeMap is undefined", () => {
            expect(resolveTrade("anything", undefined, "Default Trade")).to.equal("Default Trade");
        });
    });

    describe("buildCostGuideConfig", () => {
        const baseExternalBooking = {
            enabled: true,
            provider: "costguide" as const,
            advertiserId: 4944,
            campaignId: "6a283d45eddcf",
            campaignKey: "6YGTmNKxtjMDVkWPLwgC",
            tradeMap: {
                roofing: "Roofing - Asphalt Install or Replace",
            },
            defaultTrade: "General",
        };

        it("builds config with explicit first_name/last_name", () => {
            const result = buildCostGuideConfig(
                {
                    first_name: "Jane",
                    last_name: "Doe",
                    email: "jane@example.com",
                    phone: "5550001234",
                    address: "123 Any St.",
                    zip: "17002",
                    service: "roofing",
                },
                baseExternalBooking
            );

            expect(result).to.deep.equal({
                firstName: "Jane",
                lastName: "Doe",
                address: "123 Any St.",
                zipCode: "17002",
                email: "jane@example.com",
                phone: "555-000-1234",
                trade: "Roofing - Asphalt Install or Replace",
                advertiserId: 4944,
                campaignId: "6a283d45eddcf",
                campaignKey: "6YGTmNKxtjMDVkWPLwgC",
                hideNoMatch: "yes",
                limit: 1,
            });
        });

        it("splits full_name when first_name/last_name not provided", () => {
            const result = buildCostGuideConfig(
                {
                    full_name: "Jane Doe",
                    email: "jane@example.com",
                    service: "roofing",
                },
                baseExternalBooking
            );

            expect(result?.firstName).to.equal("Jane");
            expect(result?.lastName).to.equal("Doe");
        });

        it("prefers first_name/last_name over full_name", () => {
            const result = buildCostGuideConfig(
                {
                    full_name: "Wrong Name",
                    first_name: "Jane",
                    last_name: "Doe",
                    service: "roofing",
                },
                baseExternalBooking
            );

            expect(result?.firstName).to.equal("Jane");
            expect(result?.lastName).to.equal("Doe");
        });

        it("extracts zip from address when zip/zip_code not provided", () => {
            const result = buildCostGuideConfig(
                {
                    full_name: "Jane Doe",
                    address: "123 Main St, City, ST 17002",
                    service: "roofing",
                },
                baseExternalBooking
            );

            expect(result?.zipCode).to.equal("17002");
        });

        it("prefers zip over zip_code over extracted", () => {
            const result = buildCostGuideConfig(
                {
                    full_name: "Jane Doe",
                    zip: "11111",
                    zip_code: "22222",
                    address: "123 Main St 33333",
                    service: "roofing",
                },
                baseExternalBooking
            );

            expect(result?.zipCode).to.equal("11111");
        });

        it("uses defaultTrade when service not in tradeMap", () => {
            const result = buildCostGuideConfig(
                {
                    full_name: "Jane Doe",
                    service: "plumbing",
                },
                baseExternalBooking
            );

            expect(result?.trade).to.equal("General");
        });

        it("returns undefined when trade cannot be resolved", () => {
            const result = buildCostGuideConfig(
                {
                    full_name: "Jane Doe",
                    service: "plumbing",
                },
                {
                    ...baseExternalBooking,
                    defaultTrade: undefined,
                }
            );

            expect(result).to.be.undefined;
        });

        it("normalizes 10-digit phone", () => {
            const result = buildCostGuideConfig(
                {
                    full_name: "Jane Doe",
                    phone: "(555) 000-1234",
                    service: "roofing",
                },
                baseExternalBooking
            );

            expect(result?.phone).to.equal("555-000-1234");
        });
    });
});
