/*! Copyright (c) 2024, XAPP AI */

import { Display, FormDateInput, FormInput, MultistepForm } from "stentor-models";

export const isMultistepForm = (display: Display | undefined): display is MultistepForm => {
    return !!display && (display as MultistepForm).type === "FORM";
};

export const isFormDateInput = (form: FormInput | undefined): form is FormDateInput => {
    return !!form && form.type === "DATE";
};
