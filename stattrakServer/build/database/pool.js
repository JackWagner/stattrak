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
Object.defineProperty(exports, "__esModule", { value: true });
exports.closePool = exports.getClient = exports.query = exports.pool = void 0;
const pg_1 = require("pg");
const config_1 = require("../config");
// Create the connection pool
exports.pool = new pg_1.Pool(config_1.config.database);
// Log pool errors
exports.pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
    process.exit(-1);
});
// Helper function to execute queries
function query(text, params) {
    return __awaiter(this, void 0, void 0, function* () {
        const start = Date.now();
        const result = yield exports.pool.query(text, params);
        const duration = Date.now() - start;
        if (config_1.config.nodeEnv === "development") {
            console.log("Executed query", {
                text: text.substring(0, 100),
                duration,
                rows: result.rowCount,
            });
        }
        return result;
    });
}
exports.query = query;
// Helper for transactions
function getClient() {
    return __awaiter(this, void 0, void 0, function* () {
        return exports.pool.connect();
    });
}
exports.getClient = getClient;
// Graceful shutdown
function closePool() {
    return __awaiter(this, void 0, void 0, function* () {
        yield exports.pool.end();
    });
}
exports.closePool = closePool;
