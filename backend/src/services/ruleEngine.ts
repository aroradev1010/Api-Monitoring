import Rule, { IRule } from "../models/rule.model";
import Alert from "../models/alert.model";
import logger from "../logger";
import { notifySlack } from "./notify";
import { IMetric } from "../models/metric.model";

/**
 * Basic rule evaluation for Sprint 3.1.
 * Called with a Metric doc after it's saved.
 */

type EvalResult = { triggered: boolean; reason?: string };

async function evalRule(rule: IRule, metric: IMetric): Promise<EvalResult> {
  if (!rule.active) return { triggered: false };

  switch (rule.type) {
    case "latency_gt": {
      const thr = rule.threshold ?? Number.MAX_SAFE_INTEGER;
      if (metric.latency_ms > thr) {
        return {
          triggered: true,
          reason: `latency ${metric.latency_ms}ms > ${thr}ms`,
        };
      }
      return { triggered: false };
    }
    case "status_not_in": {
      const allowed = rule.ignored_status ?? [];
      // If metric.status_code NOT in allowed -> it's an error
      if (!allowed.includes(metric.status_code)) {
        return {
          triggered: true,
          reason: `status ${metric.status_code} not in allowed ${JSON.stringify(
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
 * Main entrypoint called per-metric.
 * - Finds rules matching metric.api_id (or global)
 * - For each rule, evaluates and creates/resolves alerts accordingly.
 **/


export async function evaluateRulesForMetric(metric: IMetric): Promise<void> {
  try {
    // load active rules that apply to this api or are global
    const rules = await Rule.find({
      active: true,
      $or: [{ api_id: metric.api_id }, { api_id: null }],
    }).lean();

    for (const r of rules) {
      const rule = r as IRule;
      const res = await evalRule(rule, metric);

      // Check if an active alert already exists for this (rule_id + api_id)
      const existing = await Alert.findOne({
        rule_id: rule.rule_id,
        api_id: metric.api_id,
        state: "triggered",
      });

      if (res.triggered) {
        // create alert if none exists
        if (!existing) {
          const payload = {
            rule_id: rule.rule_id,
            api_id: metric.api_id,
            state: "triggered" as const,
            payload: {
              metric,
              reason: res.reason,
            },
          };
          await Alert.create(payload);
          logger.info(
            { rule_id: rule.rule_id, api_id: metric.api_id },
            "Alert triggered"
          );
          // notify
          await notifySlack(
            `Alert: ${rule.name} triggered for ${metric.api_id} — ${res.reason}`
          );
        } else {
          // alert already triggered; optionally update payload/timestamp
          await Alert.updateOne(
            { _id: existing._id },
            { $set: { "payload.metric": metric, created_at: new Date() } }
          );
        }
      } else {
        // condition not met -> resolve any existing alert
        if (existing) {
          existing.state = "resolved";
          existing.payload = { metric, reason: "condition cleared" };
          await existing.save();
          logger.info(
            { rule_id: rule.rule_id, api_id: metric.api_id },
            "Alert resolved"
          );
          await notifySlack(`Resolved: ${rule.name} for ${metric.api_id}`);
        }
      }
    }
  } catch (err: any) {
    logger.error({ err, api_id: metric.api_id }, "Rule evaluation failed");
  }
}
