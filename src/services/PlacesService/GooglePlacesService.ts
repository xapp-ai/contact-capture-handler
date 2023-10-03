/*! Copyright (c) 2023, XAPP AI */

import { FetchService } from "stentor-service-fetch";
import { SearchParams, SearchResponse, Place, DetailParams, PlacesService } from "./models";

export class GooglePlacesService extends FetchService implements PlacesService {
    private apiKey: string;
    private baseUrl = 'https://maps.googleapis.com/maps/api/place';

    public constructor(apiKey: string) {
        super();
        this.apiKey = apiKey;
    }

    /**
     * Search for places based on the provided query and parameters.
     * @param params - The search parameters including the query string.
     * @returns A promise that resolves to an array of Place objects.
     * 
     * Usage example:
     * ```typescript
     * const placesService = new PlacesService('YOUR_API_KEY');
     * placesService.search({ query: 'restaurants in New York' })
     *   .then(results => console.log(results))
     *   .catch(error => console.error(error));
     * ```
     */
    public async search(params: SearchParams): Promise<Place[]> {
        try {
            const url = new URL(`${this.baseUrl}/textsearch/json`);
            url.searchParams.append('query', params.query);
            url.searchParams.append('key', this.apiKey);
            // Append other parameters if provided...
            // ...

            const response = await this.fetch(url.toString());

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data: SearchResponse = await response.json();
            return data.results;
        } catch (error) {
            console.error('Error during fetch operation: ', error.message);
            throw error;
        }
    }

    /**
     * Get details for a place based on the provided place ID.
     * @param params - The detail parameters including the place ID.
     * @returns A promise that resolves to a Place object.
     * 
     * Usage example:
     * ```typescript
     * const placesService = new PlacesService('YOUR_API_KEY');
     * placesService.getDetails({ place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4' })
     *   .then(place => console.log(place))
     *   .catch(error => console.error(error));
     * ```
     */
    public async getDetails(params: DetailParams): Promise<Place> {
        try {
            const url = new URL(`${this.baseUrl}/details/json`);
            url.searchParams.append('place_id', params.place_id);
            url.searchParams.append('key', this.apiKey);
            if (params.fields) url.searchParams.append('fields', params.fields.join(','));

            const response = await this.fetch(url.toString());

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            return data.result;
        } catch (error) {
            console.error('Error during fetch operation: ', error.message);
            throw error;
        }
    }
}


