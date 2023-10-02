/*! Copyright (c) 2023, XAPP AI */
import { ResponseOutput } from "stentor-models";

export interface GenerativeAIService {

    getResponse(): Promise<ResponseOutput>;
}