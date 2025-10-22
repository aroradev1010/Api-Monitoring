// backend/src/tests/notify.test.ts
import axios from "axios";
import { notifySlack } from "../services/notify";
import config from "../config";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("notifySlack", () => {
  const originalEnvWebhook = config.SLACK_WEBHOOK;

  beforeAll(() => {
    // Set env var before calling notifySlack; notifySlack reads config which reads env at module load.
    // To be safe, ensure the module uses current process.env (our notifySlack uses config which was built earlier).
    // If config reads env only at import time you can also require the notify module after setting env.
    config.SLACK_WEBHOOK = "http://example.local/webhook";
  });

  afterAll(() => {
    // restore original env
    if (originalEnvWebhook === undefined) {
      delete config.SLACK_WEBHOOK;
    } else {
      config.SLACK_WEBHOOK = originalEnvWebhook;
    }
    jest.resetAllMocks();
  });

  it("posts message to webhook", async () => {
    // Option A: create a minimal object that satisfies AxiosResponse shape
    mockedAxios.post.mockResolvedValue({ status: 200, data: {} } as any);


    await notifySlack("test message");

    expect(mockedAxios.post).toHaveBeenCalledWith(
      "http://example.local/webhook",
      { text: "test message" }
    );
  });

  it("skips when webhook not configured", async () => {
    // Remove env var and clear mocks
    delete config.SLACK_WEBHOOK;
    mockedAxios.post.mockClear();

    await notifySlack("no webhook");

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});
