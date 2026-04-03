// src/controllers/dependency.controller.ts
import { Request, Response } from "express";
import ServiceDependency from "../models/serviceDependency.model";
import Service from "../models/service.model";
import logger from "../logger";

/**
 * POST /v1/dependencies
 */
export async function createDependency(req: Request, res: Response) {
  try {
    const { from_service, to_service, relationship, description } = req.body;

    // Prevent self-dependency
    if (from_service === to_service) {
      return res.status(400).json({ error: "from_service and to_service cannot be the same" });
    }

    // Check for duplicate
    const existing = await ServiceDependency.findOne({
      from_service,
      to_service,
      relationship,
    })
      .lean()
      .exec();
    if (existing) {
      return res.status(409).json({ error: "Dependency already exists" });
    }

    const dep = new ServiceDependency({
      from_service,
      to_service,
      relationship,
      description: description ?? null,
      declared_by: "user",
    });

    const saved = await dep.save();
    logger.info(
      { from: from_service, to: to_service, rel: relationship },
      "Dependency created"
    );
    return res.status(201).json(saved);
  } catch (err: any) {
    logger.error({ err }, "createDependency failed");
    return res.status(500).json({ error: "Failed to create dependency" });
  }
}

/**
 * DELETE /v1/dependencies/:id
 */
export async function deleteDependency(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const result = await ServiceDependency.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Dependency not found" });
    }
    return res.status(204).send();
  } catch (err: any) {
    logger.error({ err }, "deleteDependency failed");
    return res.status(500).json({ error: "Failed to delete dependency" });
  }
}

/**
 * GET /v1/dependencies?service=
 * Returns deps where from_service or to_service matches.
 */
export async function getDependencies(req: Request, res: Response) {
  try {
    const service = req.query.service ? String(req.query.service) : null;

    const filter: any = {};
    if (service) {
      filter.$or = [{ from_service: service }, { to_service: service }];
    }

    const deps = await ServiceDependency.find(filter)
      .sort({ created_at: -1 })
      .lean()
      .exec();

    return res.json(deps);
  } catch (err: any) {
    logger.error({ err }, "getDependencies failed");
    return res.status(500).json({ error: "Failed to fetch dependencies" });
  }
}

/**
 * GET /v1/services
 */
export async function listServices(req: Request, res: Response) {
  try {
    const services = await Service.find()
      .sort({ last_seen_at: -1 })
      .lean()
      .exec();
    return res.json(services);
  } catch (err: any) {
    logger.error({ err }, "listServices failed");
    return res.status(500).json({ error: "Failed to fetch services" });
  }
}
