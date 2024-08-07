/*! Copyright (c) 2024, XAPP AI */
import * as chai from "chai";
import * as sinonChai from "sinon-chai";

import { FormChipsInput } from "stentor-models";

import { getContactFormFallback } from "../forms";

chai.use(sinonChai);
const expect = chai.expect;

describe(`#${getContactFormFallback.name}()`, () => {
    describe("when passed empty props", () => {
        it("returns as expected", () => {
            const form = getContactFormFallback({});
            expect(form).to.exist;

            expect(form.steps).to.have.length(2);

            const step = form.steps[0];
            expect(step).to.exist;
            // name, phone, message
            expect(step.fields).to.have.length(3);

        });
    });
    describe("when passed fallback props", () => {
        it("returns as expected", () => {
            const form = getContactFormFallback({ fallback: { enablePreferredTime: true, service: "schedule_maintenance" } });

            expect(form).to.exist;
            expect(form.steps).to.have.length(5);

            // console.log(JSON.stringify(form.steps, null, 2));
            const step = form.steps[0];
            expect(step).to.exist;
            // service field and message field
            expect(step.fields).to.have.length(2);

            // items, should be 3
            const chipItem = step.fields[0];
            expect(chipItem.type).to.equal("CHIPS");
            if (chipItem.type === "CHIPS") {
                const items = (chipItem as FormChipsInput).items;
                expect(items).to.have.length(4);
                const schedule = items[0];
                expect(schedule.selected).to.be.true;
                expect(schedule.id).to.equal("schedule_maintenance");
                expect(schedule.label).to.equal("Schedule Maintenance");
            }

        });
        describe("with an existing service", () => {
            it("returns as expected", () => {
                const form = getContactFormFallback({ fallback: { enablePreferredTime: true, service: "contact_us" } });


                expect(form).to.exist;
                expect(form.steps).to.have.length(5);

                // console.log(JSON.stringify(form.steps, null, 2));

                const step = form.steps[0];
                expect(step).to.exist;
                // service field and message field
                expect(step.fields).to.have.length(2);

                const chipItem = step.fields[0];
                expect(chipItem.type).to.equal("CHIPS");
                if (chipItem.type === "CHIPS") {
                    const items = (chipItem as FormChipsInput).items;
                    expect(items).to.have.length(3);
                    const schedule = items[2];
                    expect(schedule.selected).to.be.true;
                    expect(schedule.id).to.equal("contact_us");
                    expect(schedule.label).to.equal("Contact Us");
                }
            });
        });
    });
});