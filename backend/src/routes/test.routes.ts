// backend/src/routes/test.routes.ts
import { Router, Request, Response } from "express";
import { publishTestEvent, registerTestClient } from "../services/testStream";

// try to import existing pubsub/notify service used by production stream
let pubsub: any = null;
try {
  // common names: services/pubsub.ts or services/notify.ts
  // adjust the path if needed in your project
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  pubsub = require("../services/pubsub");
} catch (err) {
  try {
    // fallback name
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    pubsub = require("../services/notify");
  } catch (err) {
    // no-op if neither exists — tests will still work using testStream
    pubsub = null;
  }
}

const router = Router();

// GET /__test__/stream - connect SSE client (dev/test only)
router.get("/stream", (req: Request, res: Response) => {
  registerTestClient(req, res);
});

// POST /__test__/push-event - publish event to SSE clients (test)
router.post("/push-event", async (req: Request, res: Response) => {
  const { type, payload } = req.body ?? {};
  if (!type) {
    return res.status(400).json({ error: "type is required" });
  }

  // 1) publish to dedicated test stream clients
  publishTestEvent({ type, payload });

  // 2) forward into production pubsub if available
  try {
    if (pubsub) {
      // Try several common shapes for pubsub publisher:
      if (typeof pubsub.publish === "function") {
        pubsub.publish(type, payload);
      } else if (typeof pubsub.push === "function") {
        pubsub.push(type, payload);
      } else if (typeof pubsub.notify === "function") {
        pubsub.notify(type, payload);
      } else if (typeof pubsub.default === "function") {
        // Common when using export default function
        pubsub.default(type, payload);
      } else if (typeof pubsub.send === "function") {
        pubsub.send(type, payload);
      } else {
        // If pubsub exports named functions like publishMetric or publishEvent:
        if (typeof pubsub.publishMetric === "function")
          pubsub.publishMetric(payload);
        if (typeof pubsub.publishEvent === "function")
          pubsub.publishEvent(type, payload);
      }
    }
  } catch (err) {
    // Non-fatal; still return ok to test runner. Log server-side for debugging.
    // eslint-disable-next-line no-console
    console.warn("Failed to forward test event to production pubsub:", err);
  }

  return res.json({ ok: true });
});

export default router;
