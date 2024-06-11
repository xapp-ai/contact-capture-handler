/*! Copyright (c) 2024, XAPP AI */

import {
    // Context,
    Request,
    Response,
    ResponseOutput
} from "stentor";

// import { ContactCaptureData } from "../data";
import { ContactCaptureHandler } from "../handler";

import { ChatResult } from "./models/xnlu";
import { ResponseStrategy } from "./ResponseStrategy";

export class GenerativeResponseStrategy implements ResponseStrategy {

    public async getResponse(handler: ContactCaptureHandler, request: Request): Promise<Response> {

        const attributes = request.attributes;

        // lets get the 
        const chatResult = attributes?.["CHAT_COMPLETION_RESULT"] as ChatResult;

        // TODO: what do we do when we don't have a chat result?

        // eslint-disable-next-line no-console
        console.log(chatResult);

        const displayText = chatResult?.response;

        const response: Response<ResponseOutput> = {
            outputSpeech: {
                displayText,
            },
            reprompt: {
                displayText
            },
            tag: "ContactCaptureGenerated"
        }

        // TODO: what tag?  do we generate it based on what we have so far and what is left?

        return response;
    }
}
