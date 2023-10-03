/*! Copyright (c) 2023, XAPP AI */

import { Response, ResponseOutput, Request, Context, FetchService } from "stentor";
import { ContactCaptureHandler } from "../handler";
import { ResponseStrategy } from "./ResponseStrategy";


export class GenerativeAIService extends FetchService implements ResponseStrategy {
    private apiKey: string;

    public constructor(apiKey: string) {
        super();
        this.apiKey = apiKey;
    }

    /**
     * Get a response 
     * 
     * @param handler - An instance of ContactCaptureHandler.
     * @param request - The request object containing user input and other request data.
     * @param context - The context object containing session, user, and other context data.
     * @returns A promise that resolves to a Response object.
     */
    public async getResponse(handler: ContactCaptureHandler, request: Request, context: Context): Promise<Response> {
        try {
            // Extract the transcript from the context
            const transcript = context.session.transcript();

            // Call OpenAI API to get a generative response
            const openAIResponse = await fetch(
                'https://api.openai.com/v1/engines/davinci-codex/completions',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        prompt: transcript,  // Use the transcript as the prompt
                        max_tokens: 150,  // Limit the response length
                    }),
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                }
            );

            // Check if the request was successful
            if (!openAIResponse.ok) {
                throw new Error(`OpenAI API error: ${openAIResponse.status} ${openAIResponse.statusText}`);
            }

            // Parse the response JSON
            const responseData = await openAIResponse.json();

            // Extract and format the OpenAI API response
            const aiText = responseData.choices[0]?.text.trim();

            // Construct and return the Response object
            return {
                outputSpeech: {
                    displayText: aiText,
                    ssml: `<speak>${aiText}</speak>`
                }
            };
        } catch (error) {
            console.error('Error during API call to OpenAI: ', error.message);
            throw error;
        }
    }
}
