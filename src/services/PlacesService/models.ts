/*! Copyright (c) 2023, XAPP AI */
export interface Location {
    lat: number;
    lng: number;
}

export interface Geometry {
    location: Location;
    viewport: {
        northeast: Location;
        southwest: Location;
    };
}

export interface Photo {
    height: number;
    html_attributions: string[];
    photo_reference: string;
    width: number;
}

export interface Place {
    business_status?: string;
    formatted_address?: string;
    formatted_phone_number?: string;
    opening_hours?: {
        open_now: boolean;
    },
    geometry?: Geometry;
    icon?: string;
    name?: string;
    photos?: Photo[];
    place_id: string;
    rating?: number;
    user_ratings_total?: number;
    types?: string[];
}

export interface SearchResponse {
    results: Place[];
    status: string;
    next_page_token?: string;
}

export interface SearchParams {
    query: string;
    type?: string;
    region?: string;
    location?: string;
    radius?: number;
    minprice?: number;
    maxprice?: number;
    opennow?: boolean;
    pagetoken?: string;
}

export interface DetailParams {
    place_id: string;
    fields?: string[];
}

export interface PlacesService {
    /**
     * Search for places based on the provided query and parameters.
     * @param params - The search parameters including the query string.
     * @returns A promise that resolves to an array of Place objects.
     */
    search(params: SearchParams): Promise<Place[]>;

    /**
     * Get details for a place based on the provided place ID.
     * @param params - The detail parameters including the place ID.
     * @returns A promise that resolves to a Place object.
     */
    getDetails(params: DetailParams): Promise<Place>;
}
