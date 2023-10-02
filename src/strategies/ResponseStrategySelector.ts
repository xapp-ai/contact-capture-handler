/*! Copyright (c) 2023, XAPP AI */
import { ProgrammaticResponseStrategy } from "./ProgrammaticResponseStrategy";
import { ResponseStrategy } from "./ResponseStrategy";


export interface ResponseStrategySelectorProps {
    strategy?: "GENERATIVE_AI" | "PROGRAMMATIC";
    captureLead?: boolean;
}

export class ResponseStrategySelector {

    private strategy: ResponseStrategy;

    public constructor(props: ResponseStrategySelectorProps) {

        console.log(props);

        this.strategy = new ProgrammaticResponseStrategy();
    }

    public getStrategy(): ResponseStrategy {
        return this.strategy;
    }
}