import type { InternalAxiosRequestConfig } from "axios";
import { init, _resetForTesting } from "../src/init";
import { axios } from "../src/axios";
import { createRootContext, runWithContext } from "../src/context";

const mockAdd = jest.fn();

jest.mock("axios", () => {
  const requestHandlers: Array<
    (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig
  > = [];

  return {
    __esModule: true,
    default: {
      create: () => ({
        interceptors: {
          request: {
            use: (
              fulfilled: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig
            ) => {
              requestHandlers.push(fulfilled);
            },
          },
          response: {
            use: jest.fn(),
          },
        },
        get: jest.fn(
          (url: string, config: Partial<InternalAxiosRequestConfig> = {}) => {
            const initialConfig = {
              url,
              method: "get",
              headers: {},
              ...config,
            } as InternalAxiosRequestConfig;

            const finalConfig = requestHandlers.reduce(
              (acc, handler) => handler(acc),
              initialConfig
            );

            return Promise.resolve({
              status: 200,
              config: finalConfig,
              data: {},
            });
          }
        ),
      }),
    },
  };
});

jest.mock("../src/buffer", () => ({
  EventBuffer: jest.fn().mockImplementation(() => ({
    add: mockAdd,
    flush: jest.fn(),
    drain: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe("axios propagation", () => {
  beforeEach(() => {
    mockAdd.mockClear();
    _resetForTesting();
    init({ apiKey: "test-key", service: "test-svc" });
  });

  afterEach(() => {
    _resetForTesting();
  });

  it("sends correlation and parent event headers from the current ALS context", async () => {
    const root = createRootContext("test-svc", "cid-123");

    const response = await runWithContext(root, () =>
      axios.get("http://example.com/pay")
    );

    expect(response.config.headers["X-Correlation-ID"]).toBe("cid-123");
    expect(response.config.headers["X-Parent-Event-ID"]).toBe(
      root.currentEventId
    );
  });
});
