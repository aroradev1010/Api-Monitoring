// src/routes/apis.ts
import express from "express";
import { listApis, createApi } from "../controllers/api.controller";

const router = express.Router();

router.get("/", listApis);
router.post("/", createApi);

export default router;
