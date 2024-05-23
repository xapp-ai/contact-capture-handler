/*! Copyright (c) 2023, XAPP AI */
import { Request } from "stentor";

import { ContactCaptureData } from "../data";

import { FormResponseStrategy } from "./FormResponseStrategy";
import { GenerativeResponseStrategy } from "./GenerativeResponseStrategy";
import { ProgrammaticResponseStrategy } from "./ProgrammaticResponseStrategy";
import { ResponseStrategy } from "./ResponseStrategy";

export class ResponseStrategySelector {
    /**
     * Get a strategy based on the request and data.
     * 
     * For form-widget channel, we use FormResponseStrategy.  
     * When lead capture is false, we use ProgrammaticResponseStrategy. 
     * Otherwise, we use GenerativeResponseStrategy.
     */
    public getStrategy(request: Request, data: ContactCaptureData): ResponseStrategy {
        // form-widget always goes to the FormResponse
        if (request.channel === "form-widget") {
            return new FormResponseStrategy();
        } else if (data.responses === "GENERATIVE_AI" && data.captureLead) {

            // do we also make sure we have CHAT_RESULT here?  

            // do we make sure we also have the appropriate request attributes
            return new GenerativeResponseStrategy();
        }

        return new ProgrammaticResponseStrategy(data);
    }
}