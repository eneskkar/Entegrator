import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import channelRoutes from "./routes/channels";
import { connectPrisma, disconnectPrisma } from "./prisma";
import trendyolRoutes from "./routes/trendyol";
import xmlRoutes from "./routes/xml";
import productRoutes from "./routes/products";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/auth", authRoutes);
app.use("/channels", channelRoutes);
app.use("/trendyol", trendyolRoutes);
app.use("/xml", xmlRoutes);
app.use("/products", productRoutes);


const PORT = 4000;

async function start() {
  try {
    await connectPrisma();
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await disconnectPrisma();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await disconnectPrisma();
  process.exit(0);
});

start();
