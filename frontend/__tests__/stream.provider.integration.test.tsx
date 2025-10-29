/**
 * frontend/__tests__/stream.provider.integration.test.tsx
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { StreamProvider, useStream } from "../context/stream";

// mock the useSSE hook used by StreamProvider
jest.mock("../hooks/useSSE", () => ({
  useSSE: jest.fn(),
}));

const mockedUseSSE = require("../hooks/useSSE").useSSE as jest.Mock;

function Consumer() {
  const stream = useStream();
  return (
    <div>
      <div>connected: {String(stream.connected)}</div>
      <div>fallback: {String(stream.fallback)}</div>
      <div>lastPing: {String(stream.lastPing)}</div>
    </div>
  );
}

describe("StreamProvider integration (mocked useSSE)", () => {
  beforeEach(() => jest.clearAllMocks());

  test("exposes useSSE values through context", () => {
    // mock a live SSE state
    mockedUseSSE.mockReturnValue({
      connected: true,
      fallback: false,
      lastPing: 12345,
      reconnect: jest.fn(),
      close: jest.fn(),
    });

    render(
      <StreamProvider>
        <Consumer />
      </StreamProvider>
    );

    expect(screen.getByText(/connected: true/i)).toBeInTheDocument();
    expect(screen.getByText(/fallback: false/i)).toBeInTheDocument();
    expect(screen.getByText(/lastPing: 12345/i)).toBeInTheDocument();
  });

  test("exposes fallback state when useSSE returns fallback", () => {
    mockedUseSSE.mockReturnValue({
      connected: false,
      fallback: true,
      lastPing: null,
      reconnect: jest.fn(),
      close: jest.fn(),
    });

    render(
      <StreamProvider>
        <Consumer />
      </StreamProvider>
    );

    expect(screen.getByText(/connected: false/i)).toBeInTheDocument();
    expect(screen.getByText(/fallback: true/i)).toBeInTheDocument();
    expect(screen.getByText(/lastPing: null/i)).toBeInTheDocument();
  });
});
