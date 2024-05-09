/*! Copyright (c) 2023, XAPP AI */

import { Response, Request, Context } from "stentor-models";
import { ContactCaptureHandler } from "../handler";
import { PlacesService } from "../services/PlacesService/models";

export interface ResponseStrategyProps {
    /**
     * It will not capture the lead and instead provide contact information.
     * 
     * Defaults to false.
     */
    captureLead?: boolean;
    /**
     * Form Widget channel only, it will enable scheduling within the form.  Otherwise the form widget will simply act as a contact us form. 
     * 
     * @note - This does nothing at the moment, we are reserving for future use.
     */
    enableFormScheduling?: boolean;
    /**
     * Optional place IDs to look up information about the business
     */
    places?: { placeId?: string }[];
    /**
     * Optional PlaceService, used for testing, defaults to GooglePlaceService.  
     */
    placeService?: PlacesService;
}

export interface ResponseStrategy {
    /**
     * Get a response 
     * 
     * @param handler 
     * @param request 
     * @param context 
     */
    getResponse(handler: ContactCaptureHandler, request: Request, context: Context): Promise<Response>;
}