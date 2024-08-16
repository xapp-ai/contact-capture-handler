/*! Copyright (c) 2024, XAPP AI */

import { Display, MultistepForm } from "stentor-models";

export const isMultistepForm = (display: Display | undefined): display is MultistepForm => {
    return display && (display as MultistepForm).type === "FORM";
}