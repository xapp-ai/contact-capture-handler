/*! Copyright (c) 2023, XAPP AI */
import { FormResponseStrategy } from "./FormResponseStrategy";
import { ProgrammaticResponseStrategy } from "./ProgrammaticResponseStrategy";
import { ResponseStrategy, ResponseStrategyProps } from "./ResponseStrategy";
import { Request } from "stentor";

export interface ResponseStrategySelectorProps extends ResponseStrategyProps {
    strategy?: "GENERATIVE_AI" | "PROGRAMMATIC" | "FORM";
}

export class ResponseStrategySelector {
    private programmaticStrategy: ResponseStrategy;
    private formStrategy: ResponseStrategy;

    public constructor() {
        this.programmaticStrategy = new ProgrammaticResponseStrategy();
        this.formStrategy = new FormResponseStrategy();
    }

    // The strategy is driven by the things in the Request
    public getStrategy(request: Request): ResponseStrategy {
        if (request.channel === "form-widget") {
            return this.formStrategy;
        } 

        return this.programmaticStrategy;
    }
}