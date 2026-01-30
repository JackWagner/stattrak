"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const player_routes_1 = __importDefault(require("./player.routes"));
const match_routes_1 = __importDefault(require("./match.routes"));
const flash_routes_1 = __importDefault(require("./flash.routes"));
const sentiment_routes_1 = __importDefault(require("./sentiment.routes"));
const router = (0, express_1.Router)();
// Health check endpoint
router.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// API routes
router.use("/api/players", player_routes_1.default);
router.use("/api/matches", match_routes_1.default);
router.use("/api/flashes", flash_routes_1.default);
router.use("/api/sentiment", sentiment_routes_1.default);
exports.default = router;
