/*! Copyright (c) 2023, XAPP AI */
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();
import * as chai from "chai";
// import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";

chai.use(sinonChai);
const expect = chai.expect;

import { PlacesService } from "../service";

describe(`${PlacesService.name}`, () => {
    const apiKey: string = process.env.PLACES_API_KEY;
    describe(`#${PlacesService.prototype.search.name}()`, () => {
        it("returns as expected", async () => {
            const srv = new PlacesService(apiKey);

            const results = await srv.search({ query: "303 Roofing" });
            console.log(results);
            expect(results).to.exist;
        });
    });
    describe(`#${PlacesService.prototype.getDetails.name}()`, () => {
        it("returns as expected", async () => {
            const srv = new PlacesService(apiKey);

            const results = await srv.getDetails({ place_id: "ChIJMcF-qCTHt4kRku3nUycnN-M" });
            expect(results).to.exist;

            console.log(results);
        });
    });
});