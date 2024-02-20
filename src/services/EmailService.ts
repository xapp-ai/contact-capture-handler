/*! Copyright (c) 2024, XAPP AI */

import { log } from "stentor-logger";

import SparkPost = require("sparkpost");

export async function sendEmail(to: string, wording?: {subject?: string, body?: string, lead?: string}): Promise<void> {
    if (!process.env.SPARKPOST_API_KEY || !process.env.SPARKPOST_SENDER) {
        log().error("SPARKPOST environment variables are not set (SPARKPOST_API_KEY and SPARKPOST_SENDER)");
        return;
    }
    
    const from = process.env.SPARKPOST_SENDER;

    const subject = wording?.subject || "You have a new lead";
    const body = wording?.body || `You have an incomplete lead:\n${wording?.lead}`;

    const client = new SparkPost();

    log().info(`Sending email. From: ${from}, to: ${to}, subject: ${subject}`);
    log().info(`Sending email. Body: ${body}`);

    const addresses = to.split(",");
    const recipients: { address: string }[] = [];
    addresses.forEach((address) => {
        recipients.push({ address });
    });

    const content = { from, subject, text: body };

    return client.transmissions.send({
        options: {
            sandbox: false,
            open_tracking: false,
            click_tracking: false
        },
        content,
        recipients
    })
    .then((data: any) => {
      log().info(`Email sent. ${JSON.stringify(data)}`);
    })
    .catch((err: any) => {
        log().info(`Email failed. ${err}`);
    });
}
