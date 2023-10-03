/*! Copyright (c) 2023, XAPP AI */
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();
import * as chai from "chai";
import * as sinonChai from "sinon-chai";

chai.use(sinonChai);
const expect = chai.expect;

import { GooglePlacesService } from "../GooglePlacesService";

describe(`${GooglePlacesService.name}`, () => {
    const apiKey: string = process.env.PLACES_API_KEY || "";
    describe(`#${GooglePlacesService.prototype.search.name}()`, () => {
        it("returns as expected", async () => {
            const srv = new GooglePlacesService(apiKey);

            const results = await srv.search({ query: "303 Roofing" });
            // eslint-disable-next-line no-console
            console.log(results);
            expect(results).to.exist;
        });
    });
    describe(`#${GooglePlacesService.prototype.getDetails.name}()`, () => {
        it("returns as expected", async () => {
            const srv = new GooglePlacesService(apiKey);

            const results = await srv.getDetails({ place_id: "ChIJMcF-qCTHt4kRku3nUycnN-M" });
            expect(results).to.exist;

            // eslint-disable-next-line no-console
            console.log(results);
        });
    });
});