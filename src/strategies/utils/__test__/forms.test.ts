/*! Copyright (c) 2024, XAPP AI */
import * as chai from "chai";
import * as sinonChai from "sinon-chai";

import {
    FormCardInput,
    FormChipsInput,
    FormDropdownInput,
    FormFieldTextAddressInput,
    FormTextInput,
    SelectableItem,
} from "stentor-models";

import { isFormDateInput, isMultistepForm } from "../../../guards";
import { getFormResponse, getContactFormFallback, FormResponseProps } from "../forms";
import { ContactCaptureBlueprint } from "../../../data";

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
                // name, phone, email, message
                expect(step.fields).to.have.length(4);
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
                expect(step2.fields).to.have.length(4);
                // we need to have name, phone, email, zip
                const nameField = step2.fields[0];
                expect(nameField.name).to.equal("full_name");

                const phoneField = step2.fields[1];
                expect(phoneField.name).to.equal("phone");

                const emailField = step2.fields[2];
                expect(emailField.name).to.equal("email");

                const zipField = step2.fields[3];
                expect(zipField.name).to.equal("zip");
                if (zipField.type === "TEXT") {
                    expect((zipField as FormTextInput).format).to.equal("ZIP_CODE");
                }
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
                                    active: true,
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
        describe("when address field has mapsUrlQueryParams at field level", () => {
            it("uses field-level mapsUrlQueryParams instead of capture-level", () => {
                const captureData: ContactCaptureBlueprint = {
                    ...SIMPLE_BLUEPRINT,
                    data: [
                        ...SIMPLE_BLUEPRINT.data.filter((d) => d.slotName !== "address"),
                        {
                            questionContentKey: "address",
                            slotName: "address",
                            type: "ADDRESS" as const,
                            required: true,
                            active: true,
                            mapsUrlQueryParams: {
                                components: "country:au",
                            },
                        },
                    ],
                    // This should be overridden by field-level setting
                    addressAutocompleteParams: {
                        components: "country:us",
                    },
                };

                const response = getFormResponse(
                    {
                        enablePreferredTime: true,
                        capture: captureData,
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
                    const contactInfoStep = form.steps[1];
                    expect(contactInfoStep).to.exist;

                    const addressField: FormFieldTextAddressInput = contactInfoStep.fields.find(
                        (field) => field.name === "address",
                    ) as FormFieldTextAddressInput;
                    expect(addressField).to.exist;
                    expect(addressField.name).to.equal("address");
                    expect(addressField.mandatory).to.be.true;
                    // Should use field-level params (country:au), not capture-level (country:us)
                    expect(addressField.mapsUrlQueryParams).to.deep.equal({ components: "country:au" });
                }
            });

            it("uses field-level mapsUrlQueryParams when no capture-level setting exists", () => {
                const captureData: ContactCaptureBlueprint = {
                    ...SIMPLE_BLUEPRINT,
                    data: [
                        ...SIMPLE_BLUEPRINT.data.filter((d) => d.slotName !== "address"),
                        {
                            questionContentKey: "address",
                            slotName: "address",
                            type: "ADDRESS" as const,
                            required: true,
                            active: true,
                            mapsUrlQueryParams: {
                                components: "country:ca",
                            },
                        },
                    ],
                    // No addressAutocompleteParams at capture level
                };

                const response = getFormResponse(
                    {
                        enablePreferredTime: true,
                        capture: captureData,
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
                    const contactInfoStep = form.steps[1];
                    expect(contactInfoStep).to.exist;

                    const addressField: FormFieldTextAddressInput = contactInfoStep.fields.find(
                        (field) => field.name === "address",
                    ) as FormFieldTextAddressInput;
                    expect(addressField).to.exist;
                    expect(addressField.mapsUrlQueryParams).to.deep.equal({ components: "country:ca" });
                }
            });

            it("falls back to capture-level when field-level mapsUrlQueryParams is not set", () => {
                const captureData: ContactCaptureBlueprint = {
                    ...SIMPLE_BLUEPRINT,
                    data: [
                        ...SIMPLE_BLUEPRINT.data.filter((d) => d.slotName !== "address"),
                        {
                            questionContentKey: "address",
                            slotName: "address",
                            type: "ADDRESS" as const,
                            required: true,
                            active: true,
                            // No mapsUrlQueryParams at field level
                        },
                    ],
                    addressAutocompleteParams: {
                        components: "country:gb",
                    },
                };

                const response = getFormResponse(
                    {
                        enablePreferredTime: true,
                        capture: captureData,
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
                    const contactInfoStep = form.steps[1];
                    expect(contactInfoStep).to.exist;

                    const addressField: FormFieldTextAddressInput = contactInfoStep.fields.find(
                        (field) => field.name === "address",
                    ) as FormFieldTextAddressInput;
                    expect(addressField).to.exist;
                    // Should use capture-level params (country:gb)
                    expect(addressField.mapsUrlQueryParams).to.deep.equal({ components: "country:gb" });
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
            // name, phone, email, message
            expect(step.fields).to.have.length(4);
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
        it("adds ZIP_CODE format to zip field when present in blueprint data", () => {
            const form = getContactFormFallback(
                { capture: BLUEPRINT_WITH_SERVICE_AREA_ZIP_CODES, enablePreferredTime: true },
                {},
            );
            expect(form).to.exist;

            // Get the contact_info step (step 1)
            const contactInfoStep = form.steps[1];
            expect(contactInfoStep).to.exist;
            expect(contactInfoStep.name).to.equal("contact_info");

            // Find the zip field
            const zipField = contactInfoStep.fields.find((field) => field.name === "zip");
            expect(zipField).to.exist;
            expect(zipField?.name).to.equal("zip");
            if (zipField?.type === "TEXT") {
                expect((zipField as FormTextInput).format).to.equal("ZIP_CODE");
            }
        });
    });
    describe("when passed props with selection dataField", () => {
        it("creates a chips field with enum options", () => {
            const form = getContactFormFallback(
                {
                    capture: {
                        data: [
                            {
                                slotName: "full_name",
                                questionContentKey: "name",
                                type: "FULL_NAME",
                                required: true,
                                active: true,
                            },
                            {
                                slotName: "phone",
                                questionContentKey: "phone",
                                type: "PHONE",
                                required: true,
                                active: true,
                            },
                            {
                                slotName: "selection",
                                questionContentKey: "service_type",
                                type: "SELECTION",
                                required: true,
                                active: true,
                                title: "Select a Service",
                                enums: ["Solar Installation", "Roof Repair", "Gutter Cleaning"],
                                radio: true,
                            },
                        ],
                    },
                },
                { enablePreferredTime: true },
            );

            expect(form).to.exist;
            expect(form.steps).to.have.length(5);

            const step = form.steps[1]; // contact_info step in preferred time form
            expect(step).to.exist;
            // name, phone, selection (message is in step 0)
            expect(step.fields).to.have.length(3);

            // Find the selection field
            const selectionField = step.fields.find((field) => field.name === "selection");
            expect(selectionField).to.exist;
            expect(selectionField?.type).to.equal("CHIPS");

            if (selectionField?.type === "CHIPS") {
                const chipsField = selectionField as FormChipsInput;
                expect(chipsField.title).to.equal("Select a Service");
                expect(chipsField.mandatory).to.be.true;
                expect(chipsField.radio).to.be.true;
                expect(chipsField.items).to.have.length(3);

                expect(chipsField.items[0].label).to.equal("Solar Installation");
                expect(chipsField.items[0].id).to.equal("SOLAR INSTALLATION");
                expect(chipsField.items[1].label).to.equal("Roof Repair");
                expect(chipsField.items[1].id).to.equal("ROOF REPAIR");
                expect(chipsField.items[2].label).to.equal("Gutter Cleaning");
                expect(chipsField.items[2].id).to.equal("GUTTER CLEANING");
            }
        });
    });
    describe("when passed props with selection dataField without radio", () => {
        it("creates a chips field allowing multiple selection", () => {
            const form = getContactFormFallback(
                {
                    capture: {
                        data: [
                            {
                                slotName: "full_name",
                                questionContentKey: "name",
                                type: "FULL_NAME",
                                required: true,
                                active: true,
                            },
                            {
                                slotName: "phone",
                                questionContentKey: "phone",
                                type: "PHONE",
                                required: true,
                                active: true,
                            },
                            {
                                slotName: "selection",
                                questionContentKey: "interests",
                                type: "SELECTION",
                                required: false,
                                active: true,
                                enums: ["Solar", "Roofing", "Windows"],
                            },
                        ],
                    },
                },
                { enablePreferredTime: true },
            );

            expect(form).to.exist;

            const step = form.steps[1]; // contact_info step in preferred time form
            const selectionField = step.fields.find((field) => field.name === "selection");
            expect(selectionField).to.exist;

            if (selectionField?.type === "CHIPS") {
                const chipsField = selectionField as FormChipsInput;
                expect(chipsField.title).to.equal("Select an option"); // default title
                expect(chipsField.mandatory).to.be.false;
                expect(chipsField.radio).to.be.false; // default radio value
                expect(chipsField.items).to.have.length(3);
            }
        });
    });
    describe("when checking confirmation fields", () => {
        it("includes zip confirmation card when zip field is present", () => {
            const form = getContactFormFallback(
                { capture: SIMPLE_BLUEPRINT },
                { enablePreferredTime: true },
            );

            expect(form).to.exist;
            expect(form.steps).to.have.length(5);

            const confirmationStep = form.steps[3]; // confirmation step
            expect(confirmationStep).to.exist;
            expect(confirmationStep.name).to.equal("confirmation");

            // Find the contact information condition card
            const contactInfoCard = confirmationStep.fields.find((field) => field.name === "confirmation_card_details");
            expect(contactInfoCard).to.exist;
            expect(contactInfoCard?.condition).to.include("!!zip");

            // Find the zip confirmation card
            const zipCard = confirmationStep.fields.find((field) => field.name === "confirmation_card_zip");
            expect(zipCard).to.exist;
            expect(zipCard?.type).to.equal("CARD");
            expect((zipCard as FormCardInput)?.text).to.equal("#{zip}");
            expect(zipCard?.condition).to.equal("!!zip");
        });
    });
    describe("when passed props with disclaimer", () => {
        it("adds disclaimer card to confirmation step", () => {
            const form = getContactFormFallback(
                { capture: SIMPLE_BLUEPRINT },
                {
                    enablePreferredTime: true,
                    disclaimer: {
                        text: "Estimates to replace heating and cooling systems are free of charge. Repair jobs include a diagnostic fee of $99*. Service agreement customers pay $0 diagnostic fee.",
                    },
                },
            );

            expect(form).to.exist;
            expect(form.steps).to.have.length(5);

            const confirmationStep = form.steps[3]; // confirmation step
            expect(confirmationStep).to.exist;
            expect(confirmationStep.name).to.equal("confirmation");

            // Find the disclaimer field
            const disclaimerField = confirmationStep.fields.find((field) => field.name === "confirmation_card3");
            expect(disclaimerField).to.exist;
            expect(disclaimerField?.type).to.equal("CARD");
            expect((disclaimerField as FormCardInput)?.text).to.equal(
                "Estimates to replace heating and cooling systems are free of charge. Repair jobs include a diagnostic fee of $99*. Service agreement customers pay $0 diagnostic fee.",
            );
            // expect(disclaimerField?.condition).to.equal("!!help_type && !help_type.includes('contact_us')");
        });

        it("adds disclaimer and consent checkbox when requireAccepted is true", () => {
            const form = getContactFormFallback(
                { capture: SIMPLE_BLUEPRINT },
                {
                    enablePreferredTime: true,
                    disclaimer: {
                        text: "Estimates to replace heating and cooling systems are free of charge. Repair jobs include a diagnostic fee of $99*. Service agreement customers pay $0 diagnostic fee.",
                        requireAccepted: true,
                    },
                },
            );

            // console.log(JSON.stringify(form, null, 2));

            expect(form).to.exist;
            const confirmationStep = form.steps[3]; // confirmation step
            expect(confirmationStep).to.exist;

            // Find the DISCLAIMER title field
            const titleField = confirmationStep.fields.find((field) => field.name === "confirmation_card3_disclaimer");
            expect(titleField).to.exist;
            expect(titleField?.type).to.equal("CARD");
            if (titleField?.type === "CARD") {
                expect((titleField as FormCardInput)?.text).to.equal("DISCLAIMER");
            }

            // Find the disclaimer field
            const disclaimerField = confirmationStep.fields.find((field) => field.name === "confirmation_card3");
            expect(disclaimerField).to.exist;
            expect(disclaimerField?.type).to.equal("CARD");
            if (disclaimerField?.type === "CARD") {
                expect((disclaimerField as FormCardInput)?.text).to.equal(
                    "Estimates to replace heating and cooling systems are free of charge. Repair jobs include a diagnostic fee of $99*. Service agreement customers pay $0 diagnostic fee.",
                );
            }

            // Find the consent checkbox field
            const consentField = confirmationStep.fields.find((field) => field.name === "consent_approval");
            expect(consentField).to.exist;
            expect(consentField?.type).to.equal("CHECK");
            expect(consentField?.mandatory).to.be.true;
            expect(consentField?.mandatoryError).to.equal('Please click "I agree" to submit your request.');
            // expect(consentField?.condition).to.equal("!!help_type && !help_type.includes('contact_us')");
        });

        it("adds disclaimer to contact-only form", () => {
            const form = getContactFormFallback(
                { capture: SIMPLE_BLUEPRINT },
                {
                    disclaimer: {
                        text: "This is a disclaimer for contact form.",
                    },
                },
            );

            expect(form).to.exist;
            expect(form.steps).to.have.length(2);

            const contactStep = form.steps[0]; // contact_info step
            expect(contactStep).to.exist;
            expect(contactStep.name).to.equal("contact_info");

            // Find the disclaimer field
            const disclaimerField = contactStep.fields.find(
                (field) => field.name === "confirmation_card3_disclaimer_text",
            );
            expect(disclaimerField).to.exist;
            expect(disclaimerField?.type).to.equal("CARD");
            expect((disclaimerField as FormCardInput)?.text).to.equal("This is a disclaimer for contact form.");
            // Contact-only form shouldn't have the condition
            expect(disclaimerField?.condition).to.be.undefined;
        });
    });
    describe("when passed turnOffFirstAvailableDay", () => {
        it("removes preferred_date field and makes dateTime mandatory", () => {
            const form = getContactFormFallback(
                {
                    capture: SIMPLE_BLUEPRINT,
                    turnOffFirstAvailableDay: true,
                },
                { enablePreferredTime: true },
            );

            expect(form).to.exist;
            expect(form.steps).to.have.length(5);

            const preferredTimeStep = form.steps[2]; // preferred_time step
            expect(preferredTimeStep).to.exist;
            expect(preferredTimeStep.name).to.equal("preferred_time");

            // Check that preferred_date field does not exist
            const preferredDateField = preferredTimeStep.fields.find((field) => field.name === "preferred_date");
            expect(preferredDateField).to.be.undefined;

            // Check that dateTime field exists and is mandatory without mandatoryGroup
            const dateTimeField = preferredTimeStep.fields.find((field) => field.name === "dateTime");
            expect(dateTimeField).to.exist;
            expect(dateTimeField?.mandatory).to.be.true;
            expect(dateTimeField?.mandatoryGroup).to.be.undefined;
            expect(dateTimeField?.mandatoryError).to.equal("Please select a date");
        });

        it("keeps default behavior when turnOffFirstAvailableDay is false", () => {
            const form = getContactFormFallback(
                {
                    capture: SIMPLE_BLUEPRINT,
                    turnOffFirstAvailableDay: false,
                },
                { enablePreferredTime: true },
            );

            expect(form).to.exist;

            const preferredTimeStep = form.steps[2]; // preferred_time step
            expect(preferredTimeStep).to.exist;

            // Check that preferred_date field exists
            const preferredDateField = preferredTimeStep.fields.find((field) => field.name === "preferred_date");
            expect(preferredDateField).to.exist;
            expect(preferredDateField?.type).to.equal("CHIPS");

            // Check that dateTime field has mandatoryGroup
            const dateTimeField = preferredTimeStep.fields.find((field) => field.name === "dateTime");
            expect(dateTimeField).to.exist;
            expect(dateTimeField?.mandatory).to.be.undefined;
            expect(dateTimeField?.mandatoryGroup).to.equal("date");
            expect(dateTimeField?.mandatoryError).to.equal("Please select either a date or first available date");
        });
    });
    describe("when passed preferredTimeOptions", () => {
        it("replaces default preferred_time items with custom options", () => {
            const customTimeOptions: SelectableItem[] = [
                { id: "morning_8am", label: "Morning (8:00 AM - 12:00 PM)" },
                { id: "afternoon_12pm", label: "Afternoon (12:00 PM - 5:00 PM)" },
                { id: "evening_5pm", label: "Evening (5:00 PM - 8:00 PM)" },
            ];

            const form = getContactFormFallback(
                {
                    capture: SIMPLE_BLUEPRINT,
                    preferredTimeOptions: customTimeOptions,
                },
                { enablePreferredTime: true },
            );

            expect(form).to.exist;

            const preferredTimeStep = form.steps[2]; // preferred_time step
            expect(preferredTimeStep).to.exist;

            // Find the preferred_time field
            const preferredTimeField = preferredTimeStep.fields.find((field) => field.name === "preferred_time");
            expect(preferredTimeField).to.exist;
            expect(preferredTimeField?.type).to.equal("CHIPS");

            if (preferredTimeField?.type === "CHIPS") {
                const chipsField = preferredTimeField as FormChipsInput;
                expect(chipsField.items).to.have.length(3);
                expect(chipsField.items[0].id).to.equal("morning_8am");
                expect(chipsField.items[0].label).to.equal("Morning (8:00 AM - 12:00 PM)");
                expect(chipsField.items[1].id).to.equal("afternoon_12pm");
                expect(chipsField.items[1].label).to.equal("Afternoon (12:00 PM - 5:00 PM)");
                expect(chipsField.items[2].id).to.equal("evening_5pm");
                expect(chipsField.items[2].label).to.equal("Evening (5:00 PM - 8:00 PM)");
            }
        });

        it("uses default options when preferredTimeOptions is not provided", () => {
            const form = getContactFormFallback({ capture: SIMPLE_BLUEPRINT }, { enablePreferredTime: true });

            expect(form).to.exist;

            const preferredTimeStep = form.steps[2]; // preferred_time step
            const preferredTimeField = preferredTimeStep.fields.find((field) => field.name === "preferred_time");
            expect(preferredTimeField).to.exist;

            if (preferredTimeField?.type === "CHIPS") {
                const chipsField = preferredTimeField as FormChipsInput;
                expect(chipsField.items).to.have.length(3);
                expect(chipsField.items[0].id).to.equal("first_available");
                expect(chipsField.items[0].label).to.equal("First Available Time");
                expect(chipsField.items[1].id).to.equal("morning");
                expect(chipsField.items[1].label).to.equal("Morning");
                expect(chipsField.items[2].id).to.equal("afternoon");
                expect(chipsField.items[2].label).to.equal("Afternoon");
            }
        });
    });
    describe("when both turnOffFirstAvailableDay and preferredTimeOptions are passed", () => {
        it("applies both configurations correctly", () => {
            const customTimeOptions: SelectableItem[] = [
                { id: "9am_12pm", label: "9 AM - 12 PM" },
                { id: "12pm_5pm", label: "12 PM - 5 PM" },
            ];

            const form = getContactFormFallback(
                {
                    capture: SIMPLE_BLUEPRINT,
                    turnOffFirstAvailableDay: true,
                    preferredTimeOptions: customTimeOptions,
                },
                { enablePreferredTime: true },
            );

            expect(form).to.exist;

            const preferredTimeStep = form.steps[2]; // preferred_time step
            expect(preferredTimeStep).to.exist;

            // Verify preferred_date field is removed
            const preferredDateField = preferredTimeStep.fields.find((field) => field.name === "preferred_date");
            expect(preferredDateField).to.be.undefined;

            // Verify dateTime is mandatory
            const dateTimeField = preferredTimeStep.fields.find((field) => field.name === "dateTime");
            expect(dateTimeField).to.exist;
            expect(dateTimeField?.mandatory).to.be.true;
            expect(dateTimeField?.mandatoryGroup).to.be.undefined;

            // Verify custom time options are used
            const preferredTimeField = preferredTimeStep.fields.find((field) => field.name === "preferred_time");
            expect(preferredTimeField).to.exist;

            if (preferredTimeField?.type === "CHIPS") {
                const chipsField = preferredTimeField as FormChipsInput;
                expect(chipsField.items).to.have.length(2);
                expect(chipsField.items[0].id).to.equal("9am_12pm");
                expect(chipsField.items[0].label).to.equal("9 AM - 12 PM");
                expect(chipsField.items[1].id).to.equal("12pm_5pm");
                expect(chipsField.items[1].label).to.equal("12 PM - 5 PM");
            }
        });
    });
    describe("when passed preferredDateConfirmationText", () => {
        it("uses custom confirmation text instead of default", () => {
            const customText = "Our team will reach out to you within 24 hours to confirm your appointment.";

            const form = getContactFormFallback(
                {
                    capture: SIMPLE_BLUEPRINT,
                    preferredDateConfirmationText: customText,
                },
                { enablePreferredTime: true },
            );

            expect(form).to.exist;

            const confirmationStep = form.steps[3]; // confirmation step
            expect(confirmationStep).to.exist;
            expect(confirmationStep.name).to.equal("confirmation");

            // Find the preferred_time_confirmation_message field
            const confirmationMessageField = confirmationStep.fields.find(
                (field) => field.name === "preferred_time_confirmation_message",
            );
            expect(confirmationMessageField).to.exist;
            expect(confirmationMessageField?.type).to.equal("CARD");

            if (confirmationMessageField?.type === "CARD") {
                const cardField = confirmationMessageField as FormCardInput;
                expect(cardField.text).to.equal(customText);
            }
        });

        it("uses default text when preferredDateConfirmationText is not provided", () => {
            const form = getContactFormFallback({ capture: SIMPLE_BLUEPRINT }, { enablePreferredTime: true });

            expect(form).to.exist;

            const confirmationStep = form.steps[3]; // confirmation step
            const confirmationMessageField = confirmationStep.fields.find(
                (field) => field.name === "preferred_time_confirmation_message",
            );
            expect(confirmationMessageField).to.exist;

            if (confirmationMessageField?.type === "CARD") {
                const cardField = confirmationMessageField as FormCardInput;
                // Check for the default text (note: there's a typo "son" instead of "soon" in the original)
                expect(cardField.text).to.equal(
                    "Someone from our team will contact you soon to confirm the date & time as well as additional details",
                );
            }
        });

        it("merges preferredDateConfirmationText from ContactCaptureData", () => {
            const customText = "We will confirm your preferred date and time shortly.";

            const form = getContactFormFallback(
                {
                    capture: SIMPLE_BLUEPRINT,
                    preferredDateConfirmationText: customText,
                    enablePreferredTime: true,
                },
                {},
            );

            expect(form).to.exist;

            const confirmationStep = form.steps[3];
            const confirmationMessageField = confirmationStep.fields.find(
                (field) => field.name === "preferred_time_confirmation_message",
            );
            expect(confirmationMessageField).to.exist;

            if (confirmationMessageField?.type === "CARD") {
                const cardField = confirmationMessageField as FormCardInput;
                expect(cardField.text).to.equal(customText);
            }
        });
    });
    describe("edge cases", () => {
        describe("preferredTimeOptions with empty array", () => {
            it("handles empty array gracefully by using default options", () => {
                const form = getContactFormFallback(
                    {
                        capture: SIMPLE_BLUEPRINT,
                        preferredTimeOptions: [],
                    },
                    { enablePreferredTime: true },
                );

                expect(form).to.exist;

                const preferredTimeStep = form.steps[2];
                const preferredTimeField = preferredTimeStep.fields.find((field) => field.name === "preferred_time");
                expect(preferredTimeField).to.exist;

                if (preferredTimeField?.type === "CHIPS") {
                    const chipsField = preferredTimeField as FormChipsInput;
                    // Should use default options when empty array is provided
                    expect(chipsField.items).to.have.length(3);
                    expect(chipsField.items[0].id).to.equal("first_available");
                }
            });
        });

        describe("service ID with special characters", () => {
            it("sanitizes service IDs with special characters", () => {
                const form = getContactFormFallback(
                    {
                        capture: {
                            data: SIMPLE_BLUEPRINT.data,
                            serviceOptions: [
                                {
                                    id: "schedule'maintenance",
                                    label: "Schedule Maintenance",
                                    requiresDate: true,
                                },
                            ],
                        },
                    },
                    { enablePreferredTime: true },
                );

                expect(form).to.exist;

                const preferredTimeStep = form.steps[2];
                expect(preferredTimeStep).to.exist;

                // Check that the condition is properly sanitized
                const condition = preferredTimeStep.condition;
                expect(condition).to.exist;
                // The single quote should be removed
                expect(condition).to.equal("help_type.includes('schedulemaintenance')");
            });

            it("sanitizes preselected service with special characters", () => {
                const form = getContactFormFallback(
                    { capture: SIMPLE_BLUEPRINT },
                    { enablePreferredTime: true, service: "schedule<script>alert('xss')</script>visit" },
                );

                expect(form).to.exist;

                const step = form.steps[0];
                const chipItem = step.fields[0];

                if (chipItem.type === "CHIPS") {
                    const items = (chipItem as FormChipsInput).items;
                    // Should have sanitized the service ID
                    const serviceItem = items.find((item) => (item as SelectableItem).selected);
                    expect(serviceItem).to.exist;
                    // Special characters should be removed, leaving only alphanumeric, underscores, and hyphens
                    expect(serviceItem?.id).to.equal("schedulescriptalertxssscriptvisit");
                }
            });
        });

        describe("turnOffFirstAvailableDay without enablePreferredTime", () => {
            it("does not affect contact-only form", () => {
                const form = getContactFormFallback(
                    {
                        capture: SIMPLE_BLUEPRINT,
                        turnOffFirstAvailableDay: true,
                    },
                    { enablePreferredTime: false },
                );

                expect(form).to.exist;
                expect(form.name).to.equal("contact_us_only");
                expect(form.steps).to.have.length(2);
            });
        });

        describe("preferredTimeOptions with single option", () => {
            it("handles single time option correctly", () => {
                const customTimeOptions: SelectableItem[] = [{ id: "anytime", label: "Any Time" }];

                const form = getContactFormFallback(
                    {
                        capture: SIMPLE_BLUEPRINT,
                        preferredTimeOptions: customTimeOptions,
                    },
                    { enablePreferredTime: true },
                );

                expect(form).to.exist;

                const preferredTimeStep = form.steps[2];
                const preferredTimeField = preferredTimeStep.fields.find((field) => field.name === "preferred_time");
                expect(preferredTimeField).to.exist;

                if (preferredTimeField?.type === "CHIPS") {
                    const chipsField = preferredTimeField as FormChipsInput;
                    expect(chipsField.items).to.have.length(1);
                    expect(chipsField.items[0].id).to.equal("anytime");
                    expect(chipsField.items[0].label).to.equal("Any Time");
                }
            });
        });

        describe("props immutability", () => {
            it("does not mutate input props object", () => {
                const originalProps: FormResponseProps = { enablePreferredTime: false };
                const propsCopy = { ...originalProps };

                getContactFormFallback(
                    {
                        capture: SIMPLE_BLUEPRINT,
                        enablePreferredTime: true,
                        turnOffFirstAvailableDay: true,
                    },
                    originalProps,
                );

                // Original props should not be mutated
                expect(originalProps.enablePreferredTime).to.equal(propsCopy.enablePreferredTime);
                expect(originalProps.turnOffFirstAvailableDay).to.be.undefined;
            });
        });
    });
    describe("when passed firstPageInputType configuration", () => {
        describe('with firstPageInputType: "dropdown"', () => {
            it("renders service selection as DROPDOWN instead of CHIPS", () => {
                const form = getContactFormFallback(
                    {
                        capture: SIMPLE_BLUEPRINT,
                        firstPageInputType: "dropdown",
                    },
                    { enablePreferredTime: true },
                );

                expect(form).to.exist;
                expect(form.steps).to.have.length(5);

                const serviceRequestStep = form.steps[0];
                expect(serviceRequestStep).to.exist;
                expect(serviceRequestStep.name).to.equal("service_request");

                // Step title should be set
                expect(serviceRequestStep.title).to.equal("What can we help you with?");

                // Should have 2 fields: help_type (dropdown) and message
                expect(serviceRequestStep.fields).to.have.length(2);

                // First field should be the dropdown
                const helpTypeField = serviceRequestStep.fields[0];
                expect(helpTypeField.name).to.equal("help_type");
                expect(helpTypeField.type).to.equal("DROPDOWN");
                expect(helpTypeField.mandatory).to.be.true;
                expect(helpTypeField.title).to.be.undefined; // No title on the field itself

                // Verify it has items
                if (helpTypeField.type === "DROPDOWN") {
                    const dropdownField = helpTypeField as FormDropdownInput;
                    expect(dropdownField.items).to.have.length(3);
                    expect(dropdownField.items[0].id).to.equal("schedule_visit");
                    expect(dropdownField.items[0].label).to.equal("Schedule Visit");
                }

                // Verify message field still exists
                const messageField = serviceRequestStep.fields[1];
                expect(messageField.name).to.equal("message");
                expect(messageField.type).to.equal("TEXT");
            });

            it("works with custom serviceOptions", () => {
                const form = getContactFormFallback(
                    {
                        capture: {
                            ...SIMPLE_BLUEPRINT,
                            serviceOptions: [
                                { id: "service_a", label: "Service A" },
                                { id: "service_b", label: "Service B" },
                            ],
                        },
                        firstPageInputType: "dropdown",
                    },
                    { enablePreferredTime: true },
                );

                expect(form).to.exist;

                const serviceRequestStep = form.steps[0];
                const helpTypeField = serviceRequestStep.fields[0];

                expect(helpTypeField.type).to.equal("DROPDOWN");
                if (helpTypeField.type === "DROPDOWN") {
                    const dropdownField = helpTypeField as FormDropdownInput;
                    expect(dropdownField.items).to.have.length(2);
                    expect(dropdownField.items[0].id).to.equal("service_a");
                    expect(dropdownField.items[1].id).to.equal("service_b");
                }
            });

            it("does not have radio property on DROPDOWN field", () => {
                const form = getContactFormFallback(
                    {
                        capture: SIMPLE_BLUEPRINT,
                        firstPageInputType: "dropdown",
                    },
                    { enablePreferredTime: true },
                );

                const serviceRequestStep = form.steps[0];
                const helpTypeField = serviceRequestStep.fields[0];

                expect(helpTypeField.type).to.equal("DROPDOWN");
                // DROPDOWN fields don't have radio property
                expect((helpTypeField as any).radio).to.be.undefined;
            });
        });

        describe("with default firstPageInputType (chips)", () => {
            it("renders service selection as CHIPS by default", () => {
                const form = getContactFormFallback(
                    {
                        capture: SIMPLE_BLUEPRINT,
                    },
                    { enablePreferredTime: true },
                );

                expect(form).to.exist;

                const serviceRequestStep = form.steps[0];
                const helpTypeField = serviceRequestStep.fields[0];

                expect(helpTypeField.name).to.equal("help_type");
                expect(helpTypeField.type).to.equal("CHIPS");

                if (helpTypeField.type === "CHIPS") {
                    const chipsField = helpTypeField as FormChipsInput;
                    expect(chipsField.radio).to.be.true;
                    expect(chipsField.items).to.have.length(3);
                }
            });
        });
    });

    describe("when passed showFirstPageMessage configuration", () => {
        describe("with showFirstPageMessage: false", () => {
            it("hides the message field from the first page", () => {
                const form = getContactFormFallback(
                    {
                        capture: SIMPLE_BLUEPRINT,
                        showFirstPageMessage: false,
                    },
                    { enablePreferredTime: true },
                );

                expect(form).to.exist;
                expect(form.steps).to.have.length(5);

                const serviceRequestStep = form.steps[0];
                expect(serviceRequestStep).to.exist;
                expect(serviceRequestStep.name).to.equal("service_request");

                // Should only have 1 field: help_type (chips)
                expect(serviceRequestStep.fields).to.have.length(1);

                const helpTypeField = serviceRequestStep.fields[0];
                expect(helpTypeField.name).to.equal("help_type");
                expect(helpTypeField.type).to.equal("CHIPS");

                // Verify no message field
                const messageField = serviceRequestStep.fields.find((field) => field.name === "message");
                expect(messageField).to.be.undefined;
            });

            it("only affects preferred time form, not contact-only form", () => {
                const form = getContactFormFallback(
                    {
                        capture: SIMPLE_BLUEPRINT,
                        showFirstPageMessage: false,
                    },
                    { enablePreferredTime: false },
                );

                expect(form).to.exist;
                expect(form.name).to.equal("contact_us_only");
                expect(form.steps).to.have.length(2);

                const contactStep = form.steps[0];
                expect(contactStep).to.exist;

                // Contact-only form should still have message field
                const messageField = contactStep.fields.find((field) => field.name === "message");
                expect(messageField).to.exist;
                expect(messageField?.type).to.equal("TEXT");
            });
        });

        describe("with showFirstPageMessage: true (explicit)", () => {
            it("shows the message field on the first page", () => {
                const form = getContactFormFallback(
                    {
                        capture: SIMPLE_BLUEPRINT,
                        showFirstPageMessage: true,
                    },
                    { enablePreferredTime: true },
                );

                expect(form).to.exist;

                const serviceRequestStep = form.steps[0];
                expect(serviceRequestStep.fields).to.have.length(2);

                const messageField = serviceRequestStep.fields[1];
                expect(messageField.name).to.equal("message");
                expect(messageField.type).to.equal("TEXT");
            });
        });

        describe("with default showFirstPageMessage (undefined)", () => {
            it("shows the message field by default", () => {
                const form = getContactFormFallback(
                    {
                        capture: SIMPLE_BLUEPRINT,
                    },
                    { enablePreferredTime: true },
                );

                expect(form).to.exist;

                const serviceRequestStep = form.steps[0];
                expect(serviceRequestStep.fields).to.have.length(2);

                const messageField = serviceRequestStep.fields[1];
                expect(messageField.name).to.equal("message");
                expect(messageField.type).to.equal("TEXT");
            });
        });
    });

    describe("when passed both firstPageInputType and showFirstPageMessage", () => {
        it("applies both configurations correctly (dropdown without message)", () => {
            const form = getContactFormFallback(
                {
                    capture: SIMPLE_BLUEPRINT,
                    firstPageInputType: "dropdown",
                    showFirstPageMessage: false,
                },
                { enablePreferredTime: true },
            );

            expect(form).to.exist;
            expect(form.steps).to.have.length(5);

            const serviceRequestStep = form.steps[0];
            expect(serviceRequestStep).to.exist;

            // Step title should be set
            expect(serviceRequestStep.title).to.equal("What can we help you with?");

            // Should have 1 field: help_type (dropdown) only
            expect(serviceRequestStep.fields).to.have.length(1);

            const helpTypeField = serviceRequestStep.fields[0];
            expect(helpTypeField.name).to.equal("help_type");
            expect(helpTypeField.type).to.equal("DROPDOWN");
            expect(helpTypeField.mandatory).to.be.true;

            // Verify no message field
            const messageField = serviceRequestStep.fields.find((field) => field.name === "message");
            expect(messageField).to.be.undefined;
        });

        it("applies both configurations correctly (dropdown with message)", () => {
            const form = getContactFormFallback(
                {
                    capture: SIMPLE_BLUEPRINT,
                    firstPageInputType: "dropdown",
                    showFirstPageMessage: true,
                },
                { enablePreferredTime: true },
            );

            expect(form).to.exist;

            const serviceRequestStep = form.steps[0];
            expect(serviceRequestStep.fields).to.have.length(2);

            // First field is the dropdown
            const helpTypeField = serviceRequestStep.fields[0];
            expect(helpTypeField.type).to.equal("DROPDOWN");

            // Second field is the message
            const messageField = serviceRequestStep.fields[1];
            expect(messageField.name).to.equal("message");
            expect(messageField.type).to.equal("TEXT");
        });

        it("applies both configurations correctly (chips without message)", () => {
            const form = getContactFormFallback(
                {
                    capture: SIMPLE_BLUEPRINT,
                    firstPageInputType: "chips",
                    showFirstPageMessage: false,
                },
                { enablePreferredTime: true },
            );

            expect(form).to.exist;

            const serviceRequestStep = form.steps[0];
            expect(serviceRequestStep.fields).to.have.length(1);

            const helpTypeField = serviceRequestStep.fields[0];
            expect(helpTypeField.type).to.equal("CHIPS");

            const messageField = serviceRequestStep.fields.find((field) => field.name === "message");
            expect(messageField).to.be.undefined;
        });
    });

    describe("when configurations are passed through ContactCaptureData", () => {
        it("merges firstPageInputType from data into props", () => {
            const response = getFormResponse(
                {
                    capture: SIMPLE_BLUEPRINT,
                    enablePreferredTime: true,
                    firstPageInputType: "dropdown",
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
                const serviceRequestStep = form.steps[0];
                const helpTypeField = serviceRequestStep.fields[0];
                expect(helpTypeField.type).to.equal("DROPDOWN");
            }
        });

        it("merges showFirstPageMessage from data into props", () => {
            const response = getFormResponse(
                {
                    capture: SIMPLE_BLUEPRINT,
                    enablePreferredTime: true,
                    showFirstPageMessage: false,
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
                const serviceRequestStep = form.steps[0];
                expect(serviceRequestStep.fields).to.have.length(1);
                expect(serviceRequestStep.fields[0].name).to.equal("help_type");
            }
        });

        it("props override data when both are provided", () => {
            const response = getFormResponse(
                {
                    capture: SIMPLE_BLUEPRINT,
                    enablePreferredTime: true,
                    firstPageInputType: "chips",
                },
                {
                    firstPageInputType: "dropdown",
                },
            );

            expect(response).to.exist;

            const form =
                response && Array.isArray(response.displays) && response?.displays?.length > 0
                    ? response.displays[0]
                    : undefined;

            expect(isMultistepForm(form)).to.be.true;

            if (isMultistepForm(form)) {
                const serviceRequestStep = form.steps[0];
                const helpTypeField = serviceRequestStep.fields[0];
                // Props should win
                expect(helpTypeField.type).to.equal("DROPDOWN");
            }
        });

        it("merges both new configurations from data", () => {
            const response = getFormResponse(
                {
                    capture: SIMPLE_BLUEPRINT,
                    enablePreferredTime: true,
                    firstPageInputType: "dropdown",
                    showFirstPageMessage: false,
                },
                {},
            );

            expect(response).to.exist;

            const form =
                response && Array.isArray(response.displays) && response?.displays?.length > 0
                    ? response.displays[0]
                    : undefined;

            expect(isMultistepForm(form)).to.be.true;

            if (isMultistepForm(form)) {
                const serviceRequestStep = form.steps[0];
                // Should have 1 field: dropdown only (no message)
                expect(serviceRequestStep.fields).to.have.length(1);
                expect(serviceRequestStep.fields[0].type).to.equal("DROPDOWN");
            }
        });
    });
    describe("when passed serviceSelectionTitle configuration", () => {
        describe("with custom serviceSelectionTitle", () => {
            it("uses custom title for CHIPS field", () => {
                const form = getContactFormFallback(
                    {
                        capture: SIMPLE_BLUEPRINT,
                        serviceSelectionTitle: "How can we assist you today?",
                    },
                    { enablePreferredTime: true },
                );

                expect(form).to.exist;

                const serviceRequestStep = form.steps[0];
                const helpTypeField = serviceRequestStep.fields[0];

                expect(helpTypeField.name).to.equal("help_type");
                expect(helpTypeField.type).to.equal("CHIPS");
                expect(helpTypeField.title).to.equal("How can we assist you today?");
            });

            it("uses custom title for DROPDOWN field", () => {
                const form = getContactFormFallback(
                    {
                        capture: SIMPLE_BLUEPRINT,
                        firstPageInputType: "dropdown",
                        serviceSelectionTitle: "What type of service do you need?",
                    },
                    { enablePreferredTime: true },
                );

                expect(form).to.exist;

                const serviceRequestStep = form.steps[0];

                // For dropdown, title should be on the step itself
                expect(serviceRequestStep.title).to.equal("What type of service do you need?");

                const helpTypeField = serviceRequestStep.fields[0];
                expect(helpTypeField.name).to.equal("help_type");
                expect(helpTypeField.type).to.equal("DROPDOWN");
                expect(helpTypeField.title).to.be.undefined; // No title on dropdown field itself
            });

            it("applies custom title across different configurations", () => {
                const form = getContactFormFallback(
                    {
                        capture: SIMPLE_BLUEPRINT,
                        firstPageInputType: "dropdown",
                        showFirstPageMessage: false,
                        serviceSelectionTitle: "Select your service:",
                    },
                    { enablePreferredTime: true },
                );

                expect(form).to.exist;

                const serviceRequestStep = form.steps[0];
                expect(serviceRequestStep.fields).to.have.length(1); // Just dropdown

                // Title should be on the step itself
                expect(serviceRequestStep.title).to.equal("Select your service:");
            });
        });

        describe("with default serviceSelectionTitle", () => {
            it("uses default title when not specified", () => {
                const form = getContactFormFallback(
                    {
                        capture: SIMPLE_BLUEPRINT,
                    },
                    { enablePreferredTime: true },
                );

                expect(form).to.exist;

                const serviceRequestStep = form.steps[0];
                const helpTypeField = serviceRequestStep.fields[0];

                expect(helpTypeField.title).to.equal("What can we help you with?");
            });

            it("uses default title for dropdown when not specified", () => {
                const form = getContactFormFallback(
                    {
                        capture: SIMPLE_BLUEPRINT,
                        firstPageInputType: "dropdown",
                    },
                    { enablePreferredTime: true },
                );

                expect(form).to.exist;

                const serviceRequestStep = form.steps[0];

                // For dropdown, title should be on the step itself
                expect(serviceRequestStep.title).to.equal("What can we help you with?");

                const helpTypeField = serviceRequestStep.fields[0];
                expect(helpTypeField.type).to.equal("DROPDOWN");
                expect(helpTypeField.title).to.be.undefined;
            });
        });

        describe("when passed through ContactCaptureData", () => {
            it("merges serviceSelectionTitle from data into props", () => {
                const response = getFormResponse(
                    {
                        capture: SIMPLE_BLUEPRINT,
                        enablePreferredTime: true,
                        serviceSelectionTitle: "Choose your service:",
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
                    const serviceRequestStep = form.steps[0];
                    const helpTypeField = serviceRequestStep.fields[0];
                    expect(helpTypeField.title).to.equal("Choose your service:");
                }
            });

            it("props override data when both are provided", () => {
                const response = getFormResponse(
                    {
                        capture: SIMPLE_BLUEPRINT,
                        enablePreferredTime: true,
                        serviceSelectionTitle: "From data",
                    },
                    {
                        serviceSelectionTitle: "From props",
                    },
                );

                expect(response).to.exist;

                const form =
                    response && Array.isArray(response.displays) && response?.displays?.length > 0
                        ? response.displays[0]
                        : undefined;

                expect(isMultistepForm(form)).to.be.true;

                if (isMultistepForm(form)) {
                    const serviceRequestStep = form.steps[0];
                    const helpTypeField = serviceRequestStep.fields[0];
                    // Props should win
                    expect(helpTypeField.title).to.equal("From props");
                }
            });
        });

        describe("when fields have undefined active property", () => {
            it("excludes fields without active property set (should not default to true)", () => {
                // This test validates the fix for the bug where fields without the active property
                // were incorrectly included in the form when using active !== false logic
                const form = getContactFormFallback(
                    {
                        capture: {
                            data: [
                                {
                                    slotName: "full_name",
                                    questionContentKey: "name",
                                    type: "FULL_NAME",
                                    required: true,
                                    active: true, // explicitly true - should be included
                                },
                                {
                                    slotName: "phone",
                                    questionContentKey: "phone",
                                    type: "PHONE",
                                    required: true,
                                    active: true, // explicitly true - should be included
                                },
                                {
                                    slotName: "email",
                                    questionContentKey: "email",
                                    type: "EMAIL",
                                    required: false,
                                    active: false, // explicitly false - should be excluded
                                },
                                {
                                    slotName: "address",
                                    questionContentKey: "address",
                                    type: "ADDRESS",
                                    required: true,
                                    // active property not set (undefined) - should be excluded
                                },
                                {
                                    slotName: "selection",
                                    questionContentKey: "selection",
                                    type: "SELECTION",
                                    enums: ["Option 1", "Option 2"],
                                    // active property not set (undefined) - should be excluded
                                },
                            ],
                        },
                    },
                    { enablePreferredTime: true },
                );

                expect(form).to.exist;
                expect(form.steps).to.have.length(5);

                const contactInfoStep = form.steps[1]; // contact_info step in preferred time form
                expect(contactInfoStep).to.exist;

                // Should only have 2 fields: full_name and phone (both with active: true)
                // email (active: false), address (active: undefined), and selection (active: undefined) should be excluded
                expect(contactInfoStep.fields).to.have.length(2);

                const fieldNames = contactInfoStep.fields.map((field) => field.name);
                expect(fieldNames).to.include("full_name");
                expect(fieldNames).to.include("phone");
                expect(fieldNames).to.not.include("email");
                expect(fieldNames).to.not.include("address");
                expect(fieldNames).to.not.include("selection");
            });

            it("excludes fields without active property in contact-only form", () => {
                const form = getContactFormFallback(
                    {
                        capture: {
                            data: [
                                {
                                    slotName: "full_name",
                                    questionContentKey: "name",
                                    type: "FULL_NAME",
                                    required: true,
                                    active: true,
                                },
                                {
                                    slotName: "phone",
                                    questionContentKey: "phone",
                                    type: "PHONE",
                                    required: true,
                                    active: true,
                                },
                                {
                                    slotName: "zip",
                                    questionContentKey: "zip",
                                    type: "ZIP",
                                    // active not set - should be excluded
                                },
                            ],
                        },
                    },
                    { enablePreferredTime: false },
                );

                expect(form).to.exist;
                expect(form.name).to.equal("contact_us_only");

                const contactStep = form.steps[0];
                expect(contactStep).to.exist;

                // Should have: full_name, phone, message (4 fields)
                // zip should be excluded because active is not set
                expect(contactStep.fields).to.have.length(3);

                const fieldNames = contactStep.fields.map((field) => field.name);
                expect(fieldNames).to.include("full_name");
                expect(fieldNames).to.include("phone");
                expect(fieldNames).to.include("message");
                expect(fieldNames).to.not.include("zip");
            });
        });

        describe("preferredTimeNotification", () => {
            it("adds notification card at top of preferred time step when provided", () => {
                const notificationText = "For emergency service, please call 1-800-555-0100";
                const form = getContactFormFallback(
                    {
                        capture: SIMPLE_BLUEPRINT,
                        preferredTimeNotification: notificationText,
                    },
                    { enablePreferredTime: true },
                );

                expect(form).to.exist;

                const preferredTimeStep = form.steps[2]; // preferred_time step
                expect(preferredTimeStep).to.exist;
                expect(preferredTimeStep.fields).to.exist;

                // First field should be the notification card
                const notificationField = preferredTimeStep.fields[0];
                expect(notificationField).to.exist;
                expect(notificationField.name).to.equal("preferred_time_notification");
                expect(notificationField.type).to.equal("CARD");

                if (notificationField.type === "CARD") {
                    const cardField = notificationField as FormCardInput;
                    expect(cardField.text).to.equal(notificationText);
                    expect(cardField.variant).to.equal("body1");
                    expect(cardField.style).to.exist;
                    const style = cardField.style as any;
                    expect(style?.backgroundColor).to.equal("#FFF3CD");
                    expect(style?.border).to.equal("1px solid #FFE69C");
                    expect(style?.fontWeight).to.equal("500");
                    expect(style?.color).to.equal("#664D03");
                }
            });

            it("does not add notification card when not provided", () => {
                const form = getContactFormFallback(
                    {
                        capture: SIMPLE_BLUEPRINT,
                    },
                    { enablePreferredTime: true },
                );

                expect(form).to.exist;

                const preferredTimeStep = form.steps[2]; // preferred_time step
                expect(preferredTimeStep).to.exist;

                // Verify notification field doesn't exist
                const notificationField = preferredTimeStep.fields.find(
                    (field) => field.name === "preferred_time_notification",
                );
                expect(notificationField).to.be.undefined;
            });

            it("passes preferredTimeNotification from data through mergedProps", () => {
                const notificationText = "Appointments subject to technician availability";
                const response = getFormResponse(
                    {
                        capture: SIMPLE_BLUEPRINT,
                        enablePreferredTime: true,
                        preferredTimeNotification: notificationText,
                    },
                    {},
                );

                expect(response).to.exist;

                const form =
                    response && Array.isArray(response.displays) && response?.displays?.length > 0
                        ? response.displays[0]
                        : undefined;

                expect(isMultistepForm(form)).to.be.true;

                if (isMultistepForm(form)) {
                    const preferredTimeStep = form.steps[2];
                    const notificationField = preferredTimeStep.fields.find(
                        (field) => field.name === "preferred_time_notification",
                    );
                    expect(notificationField).to.exist;
                    expect(notificationField?.type).to.equal("CARD");

                    if (notificationField?.type === "CARD") {
                        const cardField = notificationField as FormCardInput;
                        expect(cardField.text).to.equal(notificationText);
                    }
                }
            });

            it("props override data when both are provided", () => {
                const response = getFormResponse(
                    {
                        capture: SIMPLE_BLUEPRINT,
                        enablePreferredTime: true,
                        preferredTimeNotification: "From data",
                    },
                    {
                        preferredTimeNotification: "From props",
                    },
                );

                expect(response).to.exist;

                const form =
                    response && Array.isArray(response.displays) && response?.displays?.length > 0
                        ? response.displays[0]
                        : undefined;

                expect(isMultistepForm(form)).to.be.true;

                if (isMultistepForm(form)) {
                    const preferredTimeStep = form.steps[2];
                    const notificationField = preferredTimeStep.fields.find(
                        (field) => field.name === "preferred_time_notification",
                    );

                    if (notificationField?.type === "CARD") {
                        const cardField = notificationField as FormCardInput;
                        // Props should win
                        expect(cardField.text).to.equal("From props");
                    }
                }
            });
        });
    });
});
