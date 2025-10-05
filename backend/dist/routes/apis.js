"use strict";
const express = require("express");
const Joi = require("joi");
const Api = require("../models/api.model");
const router = express.Router();
const schema = Joi.object({
    api_id: Joi.string().required(),
    name: Joi.string().required(),
    base_url: Joi.string().uri().required(),
    probe_interval: Joi.number().integer().min(5).default(30),
    expected_status: Joi.array().items(Joi.number()).default([200]),
});
router.post("/", async (req, res) => {
    const { error, value } = schema.validate(req.body);
    if (error)
        return res.status(400).json({ error: error.message });
    try {
        const api = new Api(value);
        await api.save();
        return res.status(201).json(api);
    }
    catch (err) {
        if (err.code === 11000)
            return res.status(409).json({ error: "api_id already exists" });
        return res.status(500).json({ error: err.message });
    }
});
router.get("/", async (req, res) => {
    try {
        const apis = await Api.find({}).select("-__v").sort({ created_at: -1 });
        res.json(apis);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;
//# sourceMappingURL=apis.js.map