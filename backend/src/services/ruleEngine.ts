import Rule, { IRule } from "../models/rule.model";
import Alert from "../models/alert.model";
import logger from "../logger";
import { notifySlack } from "./notify";
import { IEvent } from "../models/event.model";
import pubsub from "./pubsub";

/**
 * Rule evaluation for events.
 * Called with an Event doc after it's saved.
 */

type EvalResult = { triggered: boolean; reason?: string };

async function evalRule(rule: IRule, event: IEvent): Promise<EvalResult> {
  if (!rule.active) return { triggered: false };

  switch (rule.type) {
    case "latency_gt": {
      const thr = rule.threshold ?? Number.MAX_SAFE_INTEGER;
      if (event.latency_ms > thr) {
        return {
          triggered: true,
          reason: `latency ${event.latency_ms}ms > ${thr}ms`,
        };
      }
      return { triggered: false };
    }
    case "status_not_in": {
      const allowed = rule.ignored_status ?? [];
      const statusCode = event.http?.status_code ?? 0;
      if (!allowed.includes(statusCode)) {
        return {
          triggered: true,
          reason: `status ${statusCode} not in allowed ${JSON.stringify(
            allowed
          )}`,
        };
      }
      return { triggered: false };
    }
    default:
      return { triggered: false };
  }
}

/**
 * Main entrypoint called per-event.
 * - Finds rules matching event.service (or global)
 * - For each rule, evaluates and creates/resolves alerts accordingly.
 **/

export async function evaluateRulesForEvent(event: IEvent): Promise<void> {
  try {
    // load active rules that apply to this service or are global
    const rules = await Rule.find({
      active: true,
      $or: [{ api_id: event.service }, { api_id: null }],
    }).lean();

    for (const r of rules) {
      const rule = r as IRule;
      const res = await evalRule(rule, event);

      // Check if an active alert already exists for this (rule_id + service)
      const existing = await Alert.findOne({
        rule_id: rule.rule_id,
        api_id: event.service,
        state: "triggered",
      });

      if (res.triggered) {
        // create alert if none exists
        if (!existing) {
          const payload = {
            rule_id: rule.rule_id,
            api_id: event.service,
            state: "triggered" as const,
            payload: {
              event,
              reason: res.reason,
            },
          };
          const savedAlert = await Alert.create(payload);
          try {
            pubsub.emit("alert", savedAlert.toObject());
          } catch (e) {
            logger.warn({ err: e }, "pubsub emit alert failed");
          }
          logger.info(
            { rule_id: rule.rule_id, service: event.service },
            "Alert triggered"
          );
          // notify
          await notifySlack(
            `Alert: ${rule.name} triggered for ${event.service} — ${res.reason}`
          );
        } else {
          // alert already triggered; optionally update payload/timestamp
          await Alert.updateOne(
            { _id: existing._id },
            { $set: { "payload.event": event, created_at: new Date() } }
          );
        }
      } else {
        // condition not met -> resolve any existing alert
        if (existing) {
          existing.state = "resolved";
          existing.payload = { event, reason: "condition cleared" };
          await existing.save();
          logger.info(
            { rule_id: rule.rule_id, service: event.service },
            "Alert resolved"
          );
          await notifySlack(`Resolved: ${rule.name} for ${event.service}`);
        }
      }
    }
  } catch (err: any) {
    logger.error({ err, service: event.service }, "Rule evaluation failed");
  }
}
