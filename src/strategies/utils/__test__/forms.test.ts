/*! Copyright (c) 2024, XAPP AI */
import * as chai from "chai";
import * as sinonChai from "sinon-chai";

import { FormChipsInput, FormFieldTextAddressInput, SelectableItem } from "stentor-models";

import { isFormDateInput, isMultistepForm } from "../../../guards";
import { getFormResponse, getContactFormFallback } from "../forms";
import {
    CUSTOM_FORM,
    SIMPLE_BLUEPRINT,
    BLUEPRINT_WITHOUT_FULL_NAME,
    BLUEPRINT_WITH_SERVICE_AREA_ZIP_CODES,
    CUSTOM_FORM_WITH_DATE,
} from "./assets";

chai.use(sinonChai);
const expect = chai.expect;

describe(`#${getFormResponse.name}()`, () => {
    describe("when passed empty props", () => {
        it("returns a contact form", () => {
            const response = getFormResponse(
                {
                    capture: SIMPLE_BLUEPRINT,
                },
                {},
            );

            expect(response).to.exist;

            const form =
                response && Array.isArray(response.displays) && response?.displays?.length > 0
                    ? response.displays[0]
                    : undefined;
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
    describe("when passed enabledPreferredTime", () => {
        it("returns a preferred time form", () => {
            const response = getFormResponse(
                {
                    enablePreferredTime: true,
                    capture: { data: [] },
                },
                {},
            );

            expect(response).to.exist;

            const form =
                response && Array.isArray(response.displays) && response?.displays?.length > 0
                    ? response.displays[0]
                    : undefined;
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
                const response = getFormResponse(
                    {
                        enablePreferredTime: true,
                        capture: {
                            ...SIMPLE_BLUEPRINT,
                            serviceOptions: [
                                {
                                    id: "schedule_maintenance",
                                    label: "Schedule Maintenance",
                                },
                                {
                                    id: "emergency_service",
                                    label: "Emergency Service",
                                },
                            ],
                        },
                    },
                    {},
                );

                expect(response).to.exist;

                const form =
                    response && Array.isArray(response.displays) && response?.displays?.length > 0
                        ? response.displays[0]
                        : undefined;
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
                    expect(chips).to.have.length(2);

                    const chip1 = chips[0];
                    expect(chip1.id).to.equal("schedule_maintenance");
                    expect(chip1.label).to.equal("Schedule Maintenance");

                    const chip2 = chips[1];
                    expect(chip2.id).to.equal("emergency_service");
                    expect(chip2.label).to.equal("Emergency Service");

                    // Old behavior, we used to add a contact us chip if it wasn't there
                    //const chip3 = chips[2];
                    //expect(chip3.id).to.equal("contact_us");
                    //expect(chip3.label).to.equal("Contact Us");
                }
            });
        });
        describe("when passed blueprint data", () => {
            it("sets the appropriate fields", () => {
                const response = getFormResponse(
                    {
                        enablePreferredTime: true,
                        capture: SIMPLE_BLUEPRINT,
                    },
                    {},
                );

                expect(response).to.exist;
                const form =
                    response && Array.isArray(response.displays) && response?.displays?.length > 0
                        ? response.displays[0]
                        : undefined;
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
                const response = getFormResponse(
                    {
                        enablePreferredTime: true,
                        capture: {
                            data: [
                                ...SIMPLE_BLUEPRINT.data,
                                {
                                    questionContentKey: "address",
                                    slotName: "address",
                                    type: "ADDRESS",
                                    required: true,
                                },
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
                                    requiresDate: true,
                                },
                                {
                                    id: "emergency_service",
                                    label: "Emergency Service",
                                },
                                {
                                    id: "service_repair",
                                    label: "Service/Repair",
                                    requiresDate: true,
                                },
                            ],
                        },
                    },
                    {},
                );

                expect(response).to.exist;
                const form =
                    response && Array.isArray(response.displays) && response?.displays?.length > 0
                        ? response.displays[0]
                        : undefined;
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
                    expect(chips).to.have.length(4);

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

                    const addressField: FormFieldTextAddressInput = contactInfoStep
                        .fields[3] as FormFieldTextAddressInput;
                    expect(addressField.name).to.equal("address");
                    expect(addressField.mandatory).to.be.true;
                    expect(addressField.mapsUrlQueryParams).to.deep.equal({ components: "country:us" });

                    // check the preferredTime step and check the conditional
                    const preferredTimeStep = form.steps[2];
                    expect(preferredTimeStep).to.exist;
                    expect(preferredTimeStep.name).to.equal("preferred_time");
                    const condition = preferredTimeStep.condition;
                    expect(condition).to.equal(
                        "help_type.includes('schedule_maintenance') || help_type.includes('service_repair')",
                    );
                }
            });
        });
    });
    describe("when passed enableFormScheduling", () => {
        it("returns a fallback form when no custom form is provided", () => {
            const response = getFormResponse(
                {
                    enableFormScheduling: true,
                    capture: {
                        ...SIMPLE_BLUEPRINT,
                        serviceOptions: [
                            {
                                id: "schedule_maintenance",
                                label: "Schedule Maintenance",
                            },
                            {
                                id: "emergency_service",
                                label: "Emergency Service",
                            },
                        ],
                    },
                },
                {},
            );

            expect(response).to.exist;

            const form =
                response && Array.isArray(response.displays) && response?.displays?.length > 0
                    ? response.displays[0]
                    : undefined;
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
                expect(chips).to.have.length(2);
                //console.log(chips);
                const chip1 = chips[0];
                expect(chip1.id).to.equal("schedule_maintenance");
                expect(chip1.label).to.equal("Schedule Maintenance");

                const chip2 = chips[1];
                expect(chip2.id).to.equal("emergency_service");
                expect(chip2.label).to.equal("Emergency Service");

                // old behavior, we used to add a contact us chip if it wasn't there
                // const chip3 = chips[2];
                // expect(chip3.id).to.equal("contact_us");
                // expect(chip3.label).to.equal("Contact Us");
            }
        });
        it("returns a custom form", () => {
            const response = getFormResponse(
                {
                    enableFormScheduling: true,
                    capture: {
                        ...SIMPLE_BLUEPRINT,
                        serviceOptions: [
                            {
                                id: "schedule_maintenance",
                                label: "Schedule Maintenance",
                            },
                            {
                                id: "emergency_service",
                                label: "Emergency Service",
                            },
                        ],
                    },
                    forms: [CUSTOM_FORM],
                },
                {},
            );

            expect(response).to.exist;

            const form =
                response && Array.isArray(response.displays) && response?.displays?.length > 0
                    ? response.displays[0]
                    : undefined;
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
    describe("with a custom form and default busy days", () => {
        it("returns the custom form with default busy days", () => {
            const response = getFormResponse(
                {
                    capture: SIMPLE_BLUEPRINT,
                    forms: [CUSTOM_FORM_WITH_DATE],
                    enableFormScheduling: true,
                    availabilitySettings: {
                        defaultBusyDays: {
                            availableDays: ["monday", "tuesday", "wednesday"],
                        },
                    },
                },
                {},
            );

            expect(response).to.exist;

            const form =
                response && Array.isArray(response.displays) && response?.displays?.length > 0
                    ? response.displays[0]
                    : undefined;

            expect(form).to.exist;
            expect(isMultistepForm(form)).to.be.true;

            if (isMultistepForm(form)) {
                expect(form.steps).to.have.length(3);

                // 2nd step is calendar
                const calendarStep = form.steps[1];
                expect(calendarStep).to.exist;
                expect(calendarStep.fields).to.have.length(1);
                const calendarField = calendarStep.fields[0];

                expect(calendarField.type).to.equal("DATE");
                expect(isFormDateInput(calendarField)).to.be.true;
                if (isFormDateInput(calendarField)) {
                    expect(calendarField.name).to.equal("date");
                    expect(calendarField.mandatory).to.be.true;
                    expect(calendarField.defaultBusyDays).to.exist;
                    expect(calendarField.defaultBusyDays).to.deep.equal({
                        availableDays: ["monday", "tuesday", "wednesday"],
                    });
                }
            }
        });
    });
});

describe(`#${getContactFormFallback.name}()`, () => {
    describe("when passed empty props", () => {
        it("returns as expected", () => {
            const form = getContactFormFallback({ capture: SIMPLE_BLUEPRINT }, {});
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
            const form = getContactFormFallback(
                { capture: SIMPLE_BLUEPRINT },
                { enablePreferredTime: true, service: "schedule_maintenance" },
            );

            expect(form).to.exist;
            expect(form.steps).to.have.length(5);

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
                expect((schedule as SelectableItem).selected).to.be.true;
                expect(schedule.id).to.equal("schedule_maintenance");
                expect(schedule.label).to.equal("Schedule Maintenance");
            }
        });
        describe("with an existing service", () => {
            it("returns as expected", () => {
                const form = getContactFormFallback(
                    { capture: SIMPLE_BLUEPRINT },
                    { enablePreferredTime: true, service: "contact_us" },
                );

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
                    expect((schedule as SelectableItem).selected).to.be.true;
                    expect(schedule.id).to.equal("contact_us");
                    expect(schedule.label).to.equal("Contact Us");
                }
            });
        });
        describe("with header overrides", () => {
            it("returns as expected", () => {
                const form = getContactFormFallback(
                    { capture: SIMPLE_BLUEPRINT },
                    {
                        enablePreferredTime: true,
                        service: "schedule_maintenance",
                        headerOverrides: ["How can I help?", "", "Meeting Preference"],
                    },
                );

                expect(form).to.exist;
                expect(form.steps).to.have.length(5);

                expect(form.header).to.have.length(5);
                expect(form.header[0].label).to.equal("How can I help?");
                // we use the existing
                expect(form.header[1].label).to.equal("Contact Info");
                expect(form.header[2].label).to.equal("Meeting Preference");
            });
        });
    });
    describe("when passed existing props without full_name active", () => {
        it("adds the name field", () => {
            const form = getContactFormFallback(
                { capture: BLUEPRINT_WITHOUT_FULL_NAME },
                { enablePreferredTime: true, service: "schedule_maintenance" },
            );

            expect(form).to.exist;
            expect(form.steps).to.have.length(5);

            const step = form.steps[1];
            expect(step).to.exist;

            // name & phone
            expect(step.fields).to.have.length(2);

            const name = step.fields[0];
            expect(name.name).to.equal("full_name");

            const phone = step.fields[1];
            expect(phone.name).to.equal("phone");
        });
    });
    describe("when passed props with serviceOptions without any that need a date", () => {
        it("returns as expected", () => {
            const form = getContactFormFallback(
                {
                    capture: {
                        data: [...SIMPLE_BLUEPRINT.data],
                        serviceOptions: [
                            {
                                id: "schedule_maintenance",
                                label: "Schedule Maintenance",
                                requiresDate: false,
                            },
                            {
                                id: "contact_us",
                                label: "Contact Us",
                                requiresDate: false,
                            },
                        ],
                    },
                },
                { enablePreferredTime: true, service: "schedule_maintenance" },
            );

            expect(form).to.exist;

            //  console.log(JSON.stringify(form, null, 2));

            // get third step
            const step = form.steps[2];
            expect(step).to.exist;
            // service field and message field
            // make sure it has a condition
            expect(step.condition).to.equal("false");
        });
    });
    describe("when passed props that have serviceArea", () => {
        it("adds the out_of_service_area step", () => {
            const form = getContactFormFallback(
                { capture: BLUEPRINT_WITH_SERVICE_AREA_ZIP_CODES, enablePreferredTime: true },
                {},
            );
            expect(form).to.exist;

            //  console.log(JSON.stringify(form, null, 2));

            expect(form.steps).to.have.length(6);

            // make sure we added the header
            expect(form.header).to.have.length(6);
            expect(form.header[2].label).to.equal("Out of Service Area");
            expect(form.header[2].step).to.equal("out_of_service_area");

            // get the third step
            const step = form.steps[2];

            //  console.log(JSON.stringify(step, null, 2));
            expect(step).to.exist;
            expect(step.name).to.equal("out_of_service_area");
            // check the condition
            expect(step.condition).to.equal("!isInServiceArea(zip, ['22***', '20***'])");
        });
    });
});
