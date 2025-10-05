"use strict";
const axios = require("axios");
async function notify(alert) {
    console.log("ALERT created:", alert.api_id, alert.rule_id, alert.created_at);
    // If SLACK_WEBHOOK is set, post a message
    const webhook = process.env.SLACK_WEBHOOK;
    if (webhook) {
        try {
            await axios.post(webhook, {
                text: `Alert: ${alert.api_id} triggered ${alert.rule_id} at ${alert.created_at}\nPayload: ${JSON.stringify(alert.payload)}`,
            });
        }
        catch (err) {
            console.error("Slack notify failed:", err.message);
        }
    }
}
module.exports = { notify };
//# sourceMappingURL=alertManager.js.map