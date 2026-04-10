// sdk/src/init.ts
import { randomUUID } from "node:crypto";
import type { SDKConfig, ResolvedConfig, EventPayload } from "./types";
import { EventBuffer } from "./buffer";
import { SDK_VERSION } from "./version";

// ── Module-level singleton state ───────────────────────────────────

let _config: ResolvedConfig | null = null;
let _buffer: EventBuffer | null = null;
let _initialized = false;

// ── Default values ─────────────────────────────────────────────────

const DEFAULTS = {
  ingestUrl: "http://localhost:3000",
  flushIntervalMs: 2000,
  debug: false,
  disabled: false,
} as const;

// ── init() ─────────────────────────────────────────────────────────

/**
 * Initialize the SDK. Must be called once before any other SDK function.
 *
 * @throws if apiKey or service are missing
 */
export function init(userConfig: SDKConfig): void {
  if (_initialized) {
    process.stderr.write(
      "[api-monitor-sdk] init() called more than once — ignoring\n"
    );
    return;
  }

  // ── Validate required fields ───────────────────────────────────
  if (!userConfig.apiKey || typeof userConfig.apiKey !== "string") {
    throw new Error("[api-monitor-sdk] apiKey is required");
  }
  if (!userConfig.service || typeof userConfig.service !== "string") {
    throw new Error("[api-monitor-sdk] service is required");
  }

  // ── Resolve config ─────────────────────────────────────────────
  _config = {
    apiKey: userConfig.apiKey,
    service: userConfig.service,
    ingestUrl: userConfig.ingestUrl ?? DEFAULTS.ingestUrl,
    flushIntervalMs: userConfig.flushIntervalMs ?? DEFAULTS.flushIntervalMs,
    debug: userConfig.debug ?? DEFAULTS.debug,
    disabled: userConfig.disabled ?? DEFAULTS.disabled,
  };

  _initialized = true;

  if (_config.disabled) {
    if (_config.debug) {
      process.stderr.write("[api-monitor-sdk] SDK is disabled\n");
    }
    return;
  }

  // ── Create buffer ──────────────────────────────────────────────
  _buffer = new EventBuffer(_config);

  // ── Emit startup event ─────────────────────────────────────────
  const now = new Date().toISOString();
  const startupEvent: EventPayload = {
    event_id: randomUUID(),
    service: _config.service,
    kind: "custom",
    operation: "sdk.init",
    correlation_id: null,
    parent_event_id: null,
    status: "ok",
    latency_ms: 0,
    error_code: null,
    error_message: null,
    started_at: now,
    ended_at: now,
    tags: {
      env: process.env.NODE_ENV || "unknown",
      service: _config.service,
    },
    sdk_version: SDK_VERSION,
    api_key: _config.apiKey,
  };
  _buffer.add(startupEvent);

  if (_config.debug) {
    process.stderr.write(
      `[api-monitor-sdk] Initialized for service "${_config.service}"\n`
    );
  }
}

// ── Internal getters (used by other SDK modules) ───────────────────

/** @internal */
export function getConfig(): ResolvedConfig {
  if (!_config) {
    throw new Error(
      "[api-monitor-sdk] SDK not initialized. Call init() first."
    );
  }
  return _config;
}

/** @internal */
export function getBuffer(): EventBuffer | null {
  return _buffer;
}

/** @internal */
export function isDisabled(): boolean {
  return !_initialized || (_config?.disabled ?? true);
}

/**
 * Emit an event through the buffer. Safe to call even if SDK is disabled.
 * @internal
 */
export function emit(event: EventPayload): void {
  if (isDisabled() || !_buffer) return;
  _buffer.add(event);
}

/**
 * Reset internal state — for testing ONLY.
 * @internal
 */
export function _resetForTesting(): void {
  _config = null;
  _buffer = null;
  _initialized = false;
}
