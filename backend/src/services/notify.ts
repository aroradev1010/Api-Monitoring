import axios from "axios";
import config from "../config";
import logger from "../logger";

export async function notifySlack(text: string): Promise<void> {
  const url = config.SLACK_WEBHOOK;
  if (!url) {
    logger.info(
      { text },
      "Slack webhook not configured - skipping notification"
    );
    return;
  }
  try {
    await axios.post(url, { text });
    logger.info("Sent Slack notification");
  } catch (err: any) {
    logger.error({ err }, "Failed to send Slack notification");
  }
}
