import http from "http";
import express, { Express } from "express";
import morgan from "morgan";
import routes from "./routes/index";
const router: Express = express();

router.use(morgan("dev"));
router.use(express.urlencoded({ extended: false }));
router.use(express.json());

router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "origin, X-Requested-With, access-control-allow-origin, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, PUT");
    res.header(
      "Access-Control-Allow-Headers",
      "access-control-allow-origin, content-type"
    );
    return res.status(200).json({});
  }
  next();
});

/** Routes */
router.use("/", routes);

/** Error handling */
router.use((req, res, next) => {
  const error = new Error("not found");
  return res.status(404).json({
    message: error.message,
  });
});

/** Server */
const httpServer = http.createServer(router);
const PORT: any = process.env.PORT ?? 8080;
httpServer.listen(PORT, () =>
  console.log(`The server is running on port ${PORT}`)
);
