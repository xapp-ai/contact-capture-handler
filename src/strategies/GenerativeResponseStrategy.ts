/*! Copyright (c) 2024, XAPP AI */

import {
    // Context,
    Request,
    Response,
    ResponseOutput
} from "stentor";

// import { ContactCaptureData } from "../data";
import { ContactCaptureHandler } from "../handler";

import { ResponseStrategy } from "./ResponseStrategy";

export class GenerativeResponseStrategy implements ResponseStrategy {

    //  public constructor(private data: ContactCaptureData) { }

    public async getResponse(handler: ContactCaptureHandler, request: Request): Promise<Response> {

        const attributes = request.attributes;

        // This is a version of the ChatResult from XNLU
        interface ChatResult {
            /**
             * The model used
             */
            model?: string;
            /**
             * Does the person need help, most likely from a human representative
             */
            needsAssistance?: "NO" | "MAYBE" | "YES";
            /**
             * Is the user potentially a lead
             */
            potentialLead?: boolean;
            /**
             * If the bot answered a question
             * 
             * Note: I think we can delete this, it isn't returned anymore.
             */
            answeredQuestion?: boolean;
            /**
             * If a message is to be passed along to the business
             */
            messageForBusiness?: string;
            /**
             * A categorization for the type of message
             */
            messageType?: "QUESTION" | "SPAM" | "COMPLAINT" | "COMPLAINT" | "COMPLIMENT" | "EMPLOYMENT_INQUIRY";
            /**
             * Optional IDs of documents that are relevant to the user's query
             */
            documentIds?: string[];
            /**
             * Name of the person submitting the query
             */
            firstPerson?: string;
            /**
             * Email of the person
             */
            email?: string;
            /**
             * Phone of the person
             */
            phone?: string;
            /**
             * A message from the person
             */
            message?: string;
            /**
             * The address of the person
             */
            address?: string;
            /**
             * Contact preference of the person
             */
            contactPreference?: "phone" | "email" | "text";
            /**
             * If true, the LLM is asking the necessary follow up questions.
             */
            conversationMode?: boolean;
            /**
             * Response to the user's inquiry
             */
            response: string;
            /**
             * The system prompt used for the query
             */
            prompt?: string;
            /**
             * The queries sent to the KB 
             */
            queries?: string[];
            /**
             * The time it took to query the model
             */
            queryTime: number
        }

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
