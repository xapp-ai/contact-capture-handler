/*! Copyright (c) 2023, XAPP AI */
import { ContactCaptureData } from "../data";
import { FormResponseStrategy } from "./FormResponseStrategy";
import { ProgrammaticResponseStrategy } from "./ProgrammaticResponseStrategy";
import { ResponseStrategy, ResponseStrategyProps } from "./ResponseStrategy";
import { Request } from "stentor";

export interface ResponseStrategySelectorProps extends ResponseStrategyProps {
    strategy?: "GENERATIVE_AI" | "PROGRAMMATIC" | "FORM";
}

export class ResponseStrategySelector {
    // The strategy is driven by the things in the Request
    public getStrategy(request: Request, data: ContactCaptureData): ResponseStrategy {
        if (request.channel === "form-widget") {
            return new FormResponseStrategy();
        }

        return new ProgrammaticResponseStrategy(data);
    }
}