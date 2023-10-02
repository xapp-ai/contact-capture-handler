/*! Copyright (c) 2023, XAPP AI */

import { Response, Request, Context } from "stentor-models";
import { ContactCaptureHandler } from "../handler";

export interface ResponseStrategy {

    getResponse(handler: ContactCaptureHandler, request: Request, context: Context): Promise<Response>;

}