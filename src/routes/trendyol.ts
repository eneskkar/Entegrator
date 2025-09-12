// src/routes/trendyol.ts
import { Router } from "express";
import { prisma } from "../prisma";
import { healthCheck, pushProducts, MappedProduct } from "../adapters/trendyol";

const router = Router();

/**
 * GET /trendyol/health/:tenantId/:channelId
 * Kanal cred'leriyle mock health kontrolü.
 */
router.get("/health/:tenantId/:channelId", async (req, res) => {
  try {
    const { tenantId, channelId } = req.params;

    // type filtresine gerek yok; channelId tekildir
    const channel = await prisma.channel.findFirst({
      where: { id: channelId, tenantId },
    });
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    const result = await healthCheck({
      apiKey: channel.apiKey,
      apiSecret: channel.apiSecret || undefined,
      sellerId: channel.sellerId || undefined,
    });

    res.json(result);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message || "health error" });
  }
});

/**
 * POST /trendyol/push
 * Body: { tenantId: string, channelId: string, products: MappedProduct[] }
 * Mock adapter ile push; her SKU için SyncLog kaydı atar.
 */
router.post("/push", async (req, res) => {
  try {
    const { tenantId, channelId, products } = req.body as {
      tenantId: string;
      channelId: string;
      products: MappedProduct[];
    };

    if (!tenantId || !channelId || !Array.isArray(products)) {
      return res
        .status(400)
        .json({ error: "tenantId, channelId, products gerekli" });
    }

    const channel = await prisma.channel.findFirst({
      where: { id: channelId, tenantId },
    });
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    const creds = {
      apiKey: channel.apiKey,
      apiSecret: channel.apiSecret || undefined,
      sellerId: channel.sellerId || undefined,
    };

    // Mock push
    const result = await pushProducts(creds, products);

    // SyncLog kayıtları
    const logOps: Promise<any>[] = [];
    for (const p of result) {
      for (const v of p.variants) {
        logOps.push(
          prisma.syncLog.create({
            data: {
              tenantId,
              channelId,
              sku: v.sku,
              status: (v as any).status ?? "SUCCESS",
              message: (v as any).message ?? null,
            },
          })
        );
      }
    }
    await Promise.all(logOps);

    res.json({ ok: true, pushed: result.length, result });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message || "push error" });
  }
});

/**
 * GET /trendyol/logs/:tenantId/:channelId?sku=&take=50
 * Son senkron loglarını getirir.
 */
router.get("/logs/:tenantId/:channelId", async (req, res) => {
  try {
    const { tenantId, channelId } = req.params;
    const sku = (req.query.sku as string) || undefined;
    const take = Math.min(Number(req.query.take || 50), 200);

    const logs = await prisma.syncLog.findMany({
      where: { tenantId, channelId, ...(sku ? { sku } : {}) },
      orderBy: { createdAt: "desc" },
      take,
    });

    res.json(logs);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message || "logs error" });
  }
});

export default router;
