/*! Copyright (c) 2023, XAPP AI */
import { ProgrammaticResponseStrategy } from "./ProgrammaticResponseStrategy";
import { ResponseStrategy, ResponseStrategyProps } from "./ResponseStrategy";

export interface ResponseStrategySelectorProps extends ResponseStrategyProps {
    strategy?: "GENERATIVE_AI" | "PROGRAMMATIC";
}

export class ResponseStrategySelector {

    private strategy: ResponseStrategy;

    public constructor() {
        this.strategy = new ProgrammaticResponseStrategy();
    }

    public getStrategy(): ResponseStrategy {
        return this.strategy;
    }
}