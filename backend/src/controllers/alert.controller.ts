// backend/src/controllers/alert.controller.ts
import { Request, Response } from "express";
import Alert from "../models/alert.model";

export async function listAlerts(req: Request, res: Response) {
  try {
    const { api_id, state, limit = 50 } = req.query;
    const q: any = {};
    if (api_id) q.api_id = String(api_id);
    if (state) q.state = String(state);
    const l = Math.min(500, Number(limit) || 50);
    const alerts = await Alert.find(q)
      .sort({ created_at: -1 })
      .limit(l)
      .lean()
      .exec();
    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
export default { listAlerts };
