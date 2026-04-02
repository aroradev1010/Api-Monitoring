// backend/src/tests/probe.test.ts
import request from "supertest";
import app from "../app";
import { connectInMemoryMongo, stopInMemoryMongo } from "./test-setup";
import mongoose from "mongoose";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Probe endpoint", () => {
  beforeAll(async () => {
    await connectInMemoryMongo();
  });
  afterAll(async () => {
    await stopInMemoryMongo();
  });
  afterEach(async () => {
    const cols = await mongoose.connection.db.collections();
    for (const c of cols) await c.deleteMany({});
    jest.clearAllMocks();
  });

  test("POST /v1/probe/:api_id - successful probe and forward", async () => {
    // create API
    await request(app)
      .post("/v1/apis")
      .send({
        api_id: "probe-api",
        name: "Probe API",
        base_url: "https://httpbin.org/get",
        probe_interval: 30,
        expected_status: [200],
      });

    // mock axios.get to simulate target responding 200 quickly
    mockedAxios.get.mockResolvedValueOnce({ status: 200, data: {} } as any);

    // mock axios.post to ingest endpoint success
    mockedAxios.post.mockResolvedValueOnce({ status: 202, data: {} } as any);

    const res = await request(app).post("/v1/probe/probe-api").send();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("event");
    expect(res.body.event.service).toBe("probe-api");
    expect(res.body.event.kind).toBe("http_request");

    // axios.get called with target
    expect(mockedAxios.get).toHaveBeenCalled();
    // axios.post forwarded to ingest (now /v1/events)
    expect(mockedAxios.post).toHaveBeenCalled();
    const postCallUrl = mockedAxios.post.mock.calls[0][0];
    expect(postCallUrl).toContain("/v1/events");
  });

  test("POST /v1/probe/:api_id - forward to ingest fails (return indicates warn)", async () => {
    // create API
    await request(app)
      .post("/v1/apis")
      .send({
        api_id: "probe-api-fail",
        name: "Probe API Fail",
        base_url: "https://httpbin.org/get",
        probe_interval: 30,
        expected_status: [200],
      });

    // simulate successful target get
    mockedAxios.get.mockResolvedValueOnce({ status: 200, data: {} } as any);

    // simulate ingest failure
    const err = new Error("Bad request");
    (err as any).response = { status: 400, data: { error: "bad" } };
    mockedAxios.post.mockRejectedValueOnce(err);

    const res = await request(app).post("/v1/probe/probe-api-fail").send();
    expect(res.status).toBe(502);
    expect(res.body).toHaveProperty("event");
    expect(res.body).toHaveProperty("warn");
    expect(res.body.warn).toMatch(/failed to forward/i);
  });
});
