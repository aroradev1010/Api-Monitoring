// sdk/src/axios.ts
import axiosLib, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { randomUUID } from "node:crypto";
import { getContext, createChildContext, runWithContext } from "./context";
import { getConfig, emit, isDisabled } from "./init";
import { SDK_VERSION } from "./version";
import type { EventPayload } from "./types";

// ── Metadata stored on each request ────────────────────────────────

interface RequestMeta {
  event_id: string;
  parent_event_id: string | null;
  start_time: number;
}

// Extend InternalAxiosRequestConfig to carry our metadata
declare module "axios" {
  interface InternalAxiosRequestConfig {
    _monitor?: RequestMeta;
  }
}

// ── Create wrapped instance ────────────────────────────────────────

const instance: AxiosInstance = axiosLib.create();

// ── Request interceptor ────────────────────────────────────────────

instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (isDisabled()) return config;

    const parentCtx = getContext();
    const eventId = randomUUID();

    // Store metadata for the response/error interceptor
    config._monitor = {
      event_id: eventId,
      parent_event_id: parentCtx?.currentEventId ?? null,
      start_time: Date.now(),
    };

    // Inject correlation header for downstream services
    if (parentCtx) {
      config.headers = config.headers ?? {};
      config.headers["X-Correlation-ID"] = parentCtx.correlationId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ───────────────────────────────────────────

instance.interceptors.response.use(
  (response) => {
    if (isDisabled()) return response;

    const meta = response.config._monitor;
    if (!meta) return response;

    let sdkConfig: ReturnType<typeof getConfig>;
    try {
      sdkConfig = getConfig();
    } catch {
      return response;
    }

    const endTime = Date.now();
    const url = response.config.url ?? "unknown";
    const method = (response.config.method ?? "GET").toUpperCase();

    const event: EventPayload = {
      event_id: meta.event_id,
      service: sdkConfig.service,
      kind: "http_request",
      operation: `${method} ${extractPath(url)}`,
      correlation_id: getContext()?.correlationId ?? null,
      parent_event_id: meta.parent_event_id,
      status: response.status >= 400 ? "error" : "ok",
      latency_ms: endTime - meta.start_time,
      error_code: null,
      error_message: null,
      started_at: new Date(meta.start_time).toISOString(),
      ended_at: new Date(endTime).toISOString(),
      http: {
        method,
        path: extractPath(url),
        status_code: response.status,
        target_url: url,
      },
      tags: {
        env: process.env.NODE_ENV || "unknown",
        service: sdkConfig.service,
      },
      sdk_version: SDK_VERSION,
      api_key: sdkConfig.apiKey,
    };

    emit(event);
    return response;
  },
  (error) => {
    if (!isDisabled() && error?.config?._monitor) {
      const meta: RequestMeta = error.config._monitor;

      let sdkConfig: ReturnType<typeof getConfig> | null = null;
      try {
        sdkConfig = getConfig();
      } catch {
        // SDK not initialized
      }

      if (sdkConfig) {
        const endTime = Date.now();
        const url = error.config?.url ?? "unknown";
        const method = (error.config?.method ?? "GET").toUpperCase();
        const statusCode = error.response?.status ?? 0;

        const event: EventPayload = {
          event_id: meta.event_id,
          service: sdkConfig.service,
          kind: "http_request",
          operation: `${method} ${extractPath(url)}`,
          correlation_id: getContext()?.correlationId ?? null,
          parent_event_id: meta.parent_event_id,
          status: "error",
          latency_ms: endTime - meta.start_time,
          error_code: statusCode ? String(statusCode) : error.code ?? "UNKNOWN",
          error_message: error.message ?? null,
          started_at: new Date(meta.start_time).toISOString(),
          ended_at: new Date(endTime).toISOString(),
          http: {
            method,
            path: extractPath(url),
            status_code: statusCode,
            target_url: url,
          },
          tags: {
            env: process.env.NODE_ENV || "unknown",
            service: sdkConfig.service,
          },
          sdk_version: SDK_VERSION,
          api_key: sdkConfig.apiKey,
        };

        emit(event);
      }
    }

    // ALWAYS re-throw — SDK must not swallow errors
    return Promise.reject(error);
  }
);

// ── Helpers ────────────────────────────────────────────────────────

function extractPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    // Relative URL or malformed — return as-is
    return url;
  }
}

// ── Export ──────────────────────────────────────────────────────────

/**
 * Pre-configured axios instance with monitoring interceptors.
 * NOT a global patch — users import this specific instance.
 *
 * Usage:
 *   import { axios } from '@api-monitor/sdk';
 *   const res = await axios.get('https://...');
 */
export { instance as axios };
