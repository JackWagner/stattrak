"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const config_1 = require("./config");
const index_1 = __importDefault(require("./routes/index"));
const error_middleware_1 = require("./middleware/error.middleware");
const pool_1 = require("./database/pool");
const app = (0, express_1.default)();
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: config_1.config.corsOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
// Request logging
app.use((0, morgan_1.default)(config_1.config.nodeEnv === "development" ? "dev" : "combined"));
// Body parsing
app.use(express_1.default.urlencoded({ extended: false }));
app.use(express_1.default.json());
// Routes
app.use("/", index_1.default);
// Error handling
app.use(error_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
// Server
const httpServer = http_1.default.createServer(app);
httpServer.listen(config_1.config.port, () => {
    console.log(`Server running on port ${config_1.config.port} in ${config_1.config.nodeEnv} mode`);
});
// Graceful shutdown
const shutdown = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("\nShutting down gracefully...");
    httpServer.close(() => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, pool_1.closePool)();
        console.log("Server closed");
        process.exit(0);
    }));
});
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
