// sdk/src/buffer.ts
import type { EventPayload, ResolvedConfig } from "./types";
import axios from "axios";

// ── Constants ──────────────────────────────────────────────────────

const MAX_BATCH_SIZE = 50;
const MAX_BATCH_BYTES = 1_000_000; // 1 MB
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BACKOFF_BASE_MS = 500;
const MAX_RETRY_QUEUE_DEPTH = 100;
const DRAIN_TIMEOUT_MS = 3_000;

// ── Types ──────────────────────────────────────────────────────────

interface RetryEntry {
  events: EventPayload[];
  attempt: number;
}

// ── EventBuffer ────────────────────────────────────────────────────

export class EventBuffer {
  private buffer: EventPayload[] = [];
  private bufferBytes = 0;
  private retryQueue: RetryEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private draining = false;
  private inFlightRequests = 0;
  private readonly config: ResolvedConfig;

  constructor(config: ResolvedConfig) {
    this.config = config;
    this.startFlushTimer();
    this.registerExitHandlers();
  }

  // ── Public API ─────────────────────────────────────────────────

  /**
   * Add an event to the buffer. Triggers flush if batch limits are met.
   */
  add(event: EventPayload): void {
    if (this.config.disabled) return;

    const eventBytes = Buffer.byteLength(JSON.stringify(event), "utf-8");
    this.buffer.push(event);
    this.bufferBytes += eventBytes;

    if (this.buffer.length >= MAX_BATCH_SIZE || this.bufferBytes >= MAX_BATCH_BYTES) {
      this.flush();
    }
  }

  /**
   * Flush the current buffer to the backend.
   */
  flush(): void {
    if (this.buffer.length === 0) return;

    const events = this.buffer;
    this.buffer = [];
    this.bufferBytes = 0;

    this.sendBatch(events, 0);
  }

  /**
   * Drain all pending events. Called on process exit.
   * Returns a promise that resolves when done or times out.
   */
  async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;

    this.stopFlushTimer();
    this.stopRetryTimer();

    // Flush remaining buffer
    this.flush();

    // Retry all queued batches once
    const pending = [...this.retryQueue];
    this.retryQueue = [];
    for (const entry of pending) {
      this.sendBatch(entry.events, entry.attempt);
    }

    // Wait for in-flight requests with timeout
    await Promise.race([
      this.waitForInflight(),
      new Promise<void>((resolve) => setTimeout(resolve, DRAIN_TIMEOUT_MS)),
    ]);
  }

  // ── Internal ───────────────────────────────────────────────────

  private async sendBatch(events: EventPayload[], attempt: number): Promise<void> {
    this.inFlightRequests++;
    try {
      await axios.post(
        `${this.config.ingestUrl}/v1/events/batch`,
        { events },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 10_000,
        }
      );

      if (this.config.debug) {
        process.stderr.write(
          `[api-monitor-sdk] Sent batch of ${events.length} events\n`
        );
      }
    } catch (err: unknown) {
      if (this.config.debug) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(
          `[api-monitor-sdk] Batch send failed (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS}): ${message}\n`
        );
      }

      if (attempt + 1 < MAX_RETRY_ATTEMPTS) {
        this.enqueueRetry({ events, attempt: attempt + 1 });
      } else if (this.config.debug) {
        process.stderr.write(
          `[api-monitor-sdk] Dropping batch of ${events.length} events after ${MAX_RETRY_ATTEMPTS} attempts\n`
        );
      }
    } finally {
      this.inFlightRequests--;
    }
  }

  private enqueueRetry(entry: RetryEntry): void {
    if (this.retryQueue.length >= MAX_RETRY_QUEUE_DEPTH) {
      // Drop oldest
      this.retryQueue.shift();
      process.stderr.write(
        `[api-monitor-sdk] Retry queue full (${MAX_RETRY_QUEUE_DEPTH}), dropping oldest batch\n`
      );
    }
    this.retryQueue.push(entry);
    this.scheduleRetry(entry);
  }

  private scheduleRetry(entry: RetryEntry): void {
    const delayMs = RETRY_BACKOFF_BASE_MS * Math.pow(2, entry.attempt - 1);
    this.retryTimer = setTimeout(() => {
      const idx = this.retryQueue.indexOf(entry);
      if (idx !== -1) {
        this.retryQueue.splice(idx, 1);
        this.sendBatch(entry.events, entry.attempt);
      }
    }, delayMs);

    // MUST NOT keep the process alive
    if (this.retryTimer && typeof this.retryTimer === "object" && "unref" in this.retryTimer) {
      this.retryTimer.unref();
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushIntervalMs);

    // MUST NOT keep the process alive
    if (this.flushTimer && typeof this.flushTimer === "object" && "unref" in this.flushTimer) {
      this.flushTimer.unref();
    }
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private stopRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private registerExitHandlers(): void {
    const onExit = () => {
      this.drain();
    };

    process.once("SIGTERM", onExit);
    process.once("SIGINT", onExit);
    process.once("beforeExit", onExit);
  }

  private waitForInflight(): Promise<void> {
    return new Promise<void>((resolve) => {
      const check = () => {
        if (this.inFlightRequests <= 0) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }
}
