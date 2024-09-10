/*! Copyright (c) 2024, XAPP AI */
import * as chai from "chai";
import * as sinonChai from "sinon-chai";

import { FormChipsInput, FormFieldTextAddressInput } from "stentor-models";

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
                capture: { data: [] }
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
                // console.log(chips);
                const chip1 = chips[0];
                expect(chip1.id).to.equal("schedule_visit");
                expect(chip1.label).to.equal("Schedule Visit");

                const chip3 = chips[2];
                expect(chip3.id).to.equal("contact_us");
                expect(chip3.label).to.equal("Contact Us");

                // Get step 2, make sure we have the default fields
                const step2 = form.steps[1];
                expect(step2).to.exist;
                expect(step2.fields).to.have.length(3);
                // we need to have name, phone, address
                const nameField = step2.fields[0];
                expect(nameField.name).to.equal("full_name");

                const phoneField = step2.fields[1];
                expect(phoneField.name).to.equal("phone");

                const addressField = step2.fields[2];
                expect(addressField.name).to.equal("address");
            }
        });
        describe("when passes serviceOptions", () => {
            it("returns a preferred time form with the service options", () => {
                const response = getFormResponse({
                    enablePreferredTime: true,
                    capture: {
                        ...SIMPLE_BLUEPRINT,
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
                    }
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
        describe("when passed bluepint data", () => {
            it("sets the appropriate fields", () => {
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

                    const contactInfoStep = form.steps[1];
                    expect(contactInfoStep).to.exist;

                    expect(contactInfoStep.fields).to.have.length(3);

                    // first is name, second is email, third is phone
                    const nameField = contactInfoStep.fields[0];
                    expect(nameField.name).to.equal("full_name");
                    expect(nameField.mandatory).to.be.true;

                    const emailField = contactInfoStep.fields[1];
                    expect(emailField.name).to.equal("email");
                    expect(emailField.mandatory).to.be.false;

                    const phoneField = contactInfoStep.fields[2];
                    expect(phoneField.name).to.equal("phone");
                    expect(phoneField.mandatory).to.be.true;
                }
            });
        });
        describe("when passed serviceOptions & blueprint data", () => {
            it("sets the appropriate fields", () => {
                const response = getFormResponse({
                    enablePreferredTime: true,
                    capture: {
                        data: [
                            ...SIMPLE_BLUEPRINT.data,
                            {
                                questionContentKey: "address",
                                slotName: "address",
                                type: "ADDRESS",
                                required: true,
                            }
                        ],
                        addressAutocompleteParams: {
                            components: "country:us",
                        },
                        serviceOptions: [
                            {
                                id: "free_quote",
                                label: "Free Quote",
                                requiresDate: false,
                            },
                            {
                                id: "schedule_maintenance",
                                label: "Schedule Maintenance",
                                requiresDate: true
                            },
                            {
                                id: "emergency_service",
                                label: "Emergency Service"
                            },
                            {
                                id: "service_repair",
                                label: "Service/Repair",
                                requiresDate: true
                            }
                        ]
                    }
                }, {

                });

                expect(response).to.exist;
                const form = response && Array.isArray(response.displays) && response?.displays?.length > 0 ? response.displays[0] : undefined;
                expect(form).to.exist;

                /// Helpful for copy pasting and testing
                //console.log(JSON.stringify(form, null, 2));

                expect(isMultistepForm(form)).to.be.true;

                if (isMultistepForm(form)) {
                    //console.log(form);
                    expect(form.name).to.equal("booking_preferred_time");
                    expect(form.header).to.have.length(5);
                    expect(form.steps).to.have.length(5);

                    // check services on first step
                    const step = form.steps[0];
                    expect(step).to.exist;

                    const chips = (step.fields[0] as FormChipsInput).items;
                    expect(chips).to.have.length(5);


                    const contactInfoStep = form.steps[1];
                    expect(contactInfoStep).to.exist;

                    expect(contactInfoStep.fields).to.have.length(4);

                    // first is name, second is email, third is phone
                    const nameField = contactInfoStep.fields[0];
                    expect(nameField.name).to.equal("full_name");
                    expect(nameField.mandatory).to.be.true;

                    const emailField = contactInfoStep.fields[1];
                    expect(emailField.name).to.equal("email");
                    expect(emailField.mandatory).to.be.false;

                    const phoneField = contactInfoStep.fields[2];
                    expect(phoneField.name).to.equal("phone");
                    expect(phoneField.mandatory).to.be.true;

                    const addressField: FormFieldTextAddressInput = contactInfoStep.fields[3] as FormFieldTextAddressInput;
                    expect(addressField.name).to.equal("address");
                    expect(addressField.mandatory).to.be.true;
                    expect(addressField.mapsUrlQueryParams).to.deep.equal({ components: "country:us" });

                    // check the preferredTime step and check the conditional
                    const preferredTimeStep = form.steps[2];
                    expect(preferredTimeStep).to.exist;
                    expect(preferredTimeStep.name).to.equal("preferred_time");
                    const condition = preferredTimeStep.condition;
                    expect(condition).to.equal("help_type.includes('schedule_maintenance') || help_type.includes('service_repair')");
                }
            });
        });
    });
    describe("when passed enableFormScheduling", () => {
        it("returns a fallback form when no custom form is provided", () => {
            const response = getFormResponse({
                enableFormScheduling: true,
                capture: {
                    ...SIMPLE_BLUEPRINT,
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
                }
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
                capture: {
                    ...SIMPLE_BLUEPRINT,
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
                },
                forms: [CUSTOM_FORM],
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