/*! Copyright (c) 2024, XAPP AI */
import * as chai from "chai";
import * as sinonChai from "sinon-chai";

import { FormChipsInput } from "stentor-models";

import { isMultistepForm } from "../../../guards";
import { getFormResponse, getContactFormFallback } from "../forms";
import { CUSTOM_FORM, SIMPLE_BLUEPRINT } from "./assets";

chai.use(sinonChai);
const expect = chai.expect;

describe(`#${getFormResponse.name}()`, () => {
    describe('when passed empty props', () => {
        it('returns a contact form', () => {
            const response = getFormResponse({
                capture: SIMPLE_BLUEPRINT
            }, {});

            expect(response).to.exist;

            const form = response && Array.isArray(response.displays) && response?.displays?.length > 0 ? response.displays[0] : undefined;
            expect(form).to.exist;

            expect(isMultistepForm(form)).to.be.true;

            if (isMultistepForm(form)) {

                expect(form.name).to.equal("contact_us_only");
                expect(form.header).to.have.length(2);
                expect(form.steps).to.have.length(2);

                const step = form.steps[0];
                expect(step).to.exist;
                // name, phone, message
                expect(step.fields).to.have.length(3);
            }
        });
    });
    describe('when passed enabledPreferredTime', () => {
        it("returns a preferred time form", () => {
            const response = getFormResponse({
                enablePreferredTime: true,
                capture: SIMPLE_BLUEPRINT
            }, {

            });

            expect(response).to.exist;

            const form = response && Array.isArray(response.displays) && response?.displays?.length > 0 ? response.displays[0] : undefined;
            expect(form).to.exist;

            expect(isMultistepForm(form)).to.be.true;

            if (isMultistepForm(form)) {
                //console.log(form);
                expect(form.name).to.equal("booking_preferred_time");
                expect(form.header).to.have.length(5);
                expect(form.steps).to.have.length(5);

                const step = form.steps[0];
                expect(step).to.exist;
                //console.log(step);
                // name, phone, message
                expect(step.fields).to.have.length(2);

                const chips = (step.fields[0] as FormChipsInput).items;
                expect(chips).to.have.length(3);
                // console.log(chips);
                const chip1 = chips[0];
                expect(chip1.id).to.equal("schedule_visit");
                expect(chip1.label).to.equal("Schedule Visit");

                const chip3 = chips[2];
                expect(chip3.id).to.equal("contact_us");
                expect(chip3.label).to.equal("Contact Us");
            }
        });
        describe("when passes serviceOptions", () => {
            it("returns a preferred time form with the service options", () => {
                const response = getFormResponse({
                    enablePreferredTime: true,
                    capture: SIMPLE_BLUEPRINT,
                    serviceOptions: [
                        {
                            id: "schedule_maintenance",
                            label: "Schedule Maintenance"
                        },
                        {
                            id: "emergency_service",
                            label: "Emergency Service"
                        }
                    ]
                }, {});

                expect(response).to.exist;

                const form = response && Array.isArray(response.displays) && response?.displays?.length > 0 ? response.displays[0] : undefined;
                expect(form).to.exist;

                expect(isMultistepForm(form)).to.be.true;

                if (isMultistepForm(form)) {
                    //console.log(form);
                    expect(form.name).to.equal("booking_preferred_time");
                    expect(form.header).to.have.length(5);
                    expect(form.steps).to.have.length(5);

                    const step = form.steps[0];
                    expect(step).to.exist;
                    //console.log(step);
                    // name, phone, message
                    expect(step.fields).to.have.length(2);

                    const chips = (step.fields[0] as FormChipsInput).items;
                    expect(chips).to.have.length(3);
                    //console.log(chips);
                    const chip1 = chips[0];
                    expect(chip1.id).to.equal("schedule_maintenance");
                    expect(chip1.label).to.equal("Schedule Maintenance");

                    const chip3 = chips[2];
                    expect(chip3.id).to.equal("contact_us");
                    expect(chip3.label).to.equal("Contact Us");
                }
            });
        });
    });
    describe("when passed enableFormScheduling", () => {
        it("returns a fallback form when no custom form is provided", () => {
            const response = getFormResponse({
                enableFormScheduling: true,
                capture: SIMPLE_BLUEPRINT,
                serviceOptions: [
                    {
                        id: "schedule_maintenance",
                        label: "Schedule Maintenance"
                    },
                    {
                        id: "emergency_service",
                        label: "Emergency Service"
                    }
                ]
            }, {});

            expect(response).to.exist;

            const form = response && Array.isArray(response.displays) && response?.displays?.length > 0 ? response.displays[0] : undefined;
            expect(form).to.exist;

            expect(isMultistepForm(form)).to.be.true;

            if (isMultistepForm(form)) {
                //console.log(form);
                expect(form.name).to.equal("booking_preferred_time");
                expect(form.header).to.have.length(5);
                expect(form.steps).to.have.length(5);

                const step = form.steps[0];
                expect(step).to.exist;
                //console.log(step);
                // name, phone, message
                expect(step.fields).to.have.length(2);

                const chips = (step.fields[0] as FormChipsInput).items;
                expect(chips).to.have.length(3);
                //console.log(chips);
                const chip1 = chips[0];
                expect(chip1.id).to.equal("schedule_maintenance");
                expect(chip1.label).to.equal("Schedule Maintenance");

                const chip3 = chips[2];
                expect(chip3.id).to.equal("contact_us");
                expect(chip3.label).to.equal("Contact Us");
            }
        });
        it("returns a custom form", () => {
            const response = getFormResponse({
                enableFormScheduling: true,
                capture: SIMPLE_BLUEPRINT,
                forms: [CUSTOM_FORM],
                serviceOptions: [
                    {
                        id: "schedule_maintenance",
                        label: "Schedule Maintenance"
                    },
                    {
                        id: "emergency_service",
                        label: "Emergency Service"
                    }
                ]
            }, {});

            expect(response).to.exist;

            const form = response && Array.isArray(response.displays) && response?.displays?.length > 0 ? response.displays[0] : undefined;
            expect(form).to.exist;

            expect(isMultistepForm(form)).to.be.true;

            if (isMultistepForm(form)) {
                //console.log(form);
                expect(form.name).to.equal("main");
                expect(form.header).to.have.length(2);
                expect(form.steps).to.have.length(2);

                const step = form.steps[0];
                expect(step).to.exist;
                //console.log(step);
                // name, phone, message
                expect(step.fields).to.have.length(4);
            }
        });
    });
});

describe(`#${getContactFormFallback.name}()`, () => {
    describe("when passed empty props", () => {
        it("returns as expected", () => {
            const form = getContactFormFallback({ capture: SIMPLE_BLUEPRINT, }, {});
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
            const form = getContactFormFallback({ capture: SIMPLE_BLUEPRINT, }, { enablePreferredTime: true, service: "schedule_maintenance" });

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
                const form = getContactFormFallback({ capture: SIMPLE_BLUEPRINT, }, { enablePreferredTime: true, service: "contact_us" });

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