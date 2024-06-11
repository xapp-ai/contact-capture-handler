/*! Copyright (c) 2024, XAPP AI */


/**
 * What XNLU returns after a chat and can be found in request.attributes["CHAT_COMPLETION_RESULT"].
 * 
 * This is copy pasted here so we don't need to bring in XNLU as a dependency.
 */
export interface ChatResult {
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
    messageType?: "QUESTION" | "SPAM" | "COMPLAINT" | "CONTACT_REQUEST" | "COMPLIMENT" | "EMPLOYMENT_INQUIRY";
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
     * Response to the user's inquiry.  It contains both the answer and the follow up question
     */
    response: string;
    /**
     * The answer to the users request
     */
    answer?: string;
    /**
     * A follow up question to the user's request
     */
    followUpQuestion?: string;

    urgency?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";

    suggestions?: string[];
    /**
     * If the assistant asked for the follow-up information in the follow up question.
     */
    askedForContactInfo?: boolean;
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
    queryTime: number;
}