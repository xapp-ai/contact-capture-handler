/*! Copyright (c) 2025, XAPP AI */
import * as chai from "chai";
import * as sinonChai from "sinon-chai";

chai.use(sinonChai);
const expect = chai.expect;

import { normalizeEmailAddress } from "../validators";

describe("normalizeEmailAddress", () => {
    it("should return the email address if it contains '@'", () => {
        const email = "test@example.com";
        const result = normalizeEmailAddress(email);
        expect(result).to.equal(email);
    });

    it("should return undefined if the email address does not contain '@'", () => {
        const email = "invalid-email";
        const result = normalizeEmailAddress(email);
        expect(result).to.be.undefined;
    });

    it("should return undefined if the email address is an empty string", () => {
        const email = "";
        const result = normalizeEmailAddress(email);
        expect(result).to.be.undefined;
    });

    it("should return undefined if the email address is null", () => {
        const email: string = null;
        const result = normalizeEmailAddress(email);
        expect(result).to.be.undefined;
    });

    it("should return undefined if the email address is undefined", () => {
        const email: string = undefined;
        const result = normalizeEmailAddress(email);
        expect(result).to.be.undefined;
    });

    it("should trim whitespace and return the email address if valid", () => {
        const email = "   test@example.com   ";
        const result = normalizeEmailAddress(email);
        expect(result).to.equal(email.trim());
    });

    it("passes recognizable emails", () => {
        const email = "jcatalani25@gmail";
        const result = normalizeEmailAddress(email);
        expect(result).to.equal(email);
    });
});
