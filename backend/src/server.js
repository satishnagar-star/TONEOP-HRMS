import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { logger } from "./utils/logger.js";
import { requestId } from "./middleware/requestId.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

import { authRoutes } from "./routes/authRoutes.js";
import { attendanceRoutes } from "./routes/attendanceRoutes.js";
import { commentsRoutes } from "./routes/commentsRoutes.js";
import { employeeRoutes } from "./routes/employeeRoutes.js";
import { systemRoutes } from "./routes/systemRoutes.js";

const app = express();

app.disable("x-powered-by");
app.use(requestId);
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(
  morgan("combined", {
    stream: { write: (msg) => logger.info(msg.trim()) },
  })
);

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/comments", commentsRoutes);
app.use("/employee", employeeRoutes);
app.use("/system", systemRoutes);

app.use(notFound);
app.use(errorHandler);

// Connect to MongoDB then start the server
connectDB().then(() => {
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "API listening");
  });
});
