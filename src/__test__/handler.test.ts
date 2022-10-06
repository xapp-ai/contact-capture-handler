/*! Copyright (c) 2022, XAPP AI */
import { expect } from "chai";

import { Content, Handler } from "stentor";
import { ContactCaptureData } from "../data";
import { ContactCaptureHandler } from "../handler";

const props: Handler<Content, ContactCaptureData> = {
    intentId: "intentId",
    type: "ContactCaptureHandler",
    appId: "appId",
    organizationId: "organizationId",
    content: {},
    data: {
        capture: {
            data: []
        }
    }
}

describe(`${ContactCaptureHandler.name}`, () => {
    it(`returns an instance of itself`, () => {
        expect(new ContactCaptureHandler(props)).to.be.instanceOf(ContactCaptureHandler);
    });
});