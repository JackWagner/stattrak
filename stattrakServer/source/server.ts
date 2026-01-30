import http from "http";
import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import routes from "./routes/index";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware";
import { closePool } from "./database/pool";

const app: Express = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Request logging
app.use(morgan(config.nodeEnv === "development" ? "dev" : "combined"));

// Body parsing
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Routes
app.use("/", routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Server
const httpServer = http.createServer(app);

httpServer.listen(config.port, () => {
  console.log(
    `Server running on port ${config.port} in ${config.nodeEnv} mode`,
  );
});

// Graceful shutdown
const shutdown = async () => {
  console.log("\nShutting down gracefully...");
  httpServer.close(async () => {
    await closePool();
    console.log("Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
