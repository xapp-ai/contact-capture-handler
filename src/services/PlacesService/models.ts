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
    formatted_address: string;
    geometry: Geometry;
    icon: string;
    name: string;
    photos?: Photo[];
    place_id: string;
    rating?: number;
    user_ratings_total?: number;
    types: string[];
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
