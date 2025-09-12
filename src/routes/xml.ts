// src/routes/xml.ts
import { Router } from "express";
import axios from "axios";
import { prisma } from "../prisma";
import { parseXml, extractItems, normalizeItem, GuessMap } from "../services/xmlIngest";
import { pushProducts } from "../adapters/trendyol";

const router = Router();

/**
 * POST /xml/ingest
 * Body: { tenantId, channelId, url, save?: boolean, push?: boolean }
 */
router.post("/ingest", async (req, res) => {
  try {
    const { tenantId, channelId, url, save = false, push = true } = req.body as {
      tenantId: string;
      channelId: string;
      url: string;
      save?: boolean;
      push?: boolean;
    };

    if (!tenantId || !channelId || !url) {
      return res.status(400).json({ error: "tenantId, channelId, url gerekli" });
    }

    // Kanal bilgisi (Trendyol mock push için gerekebilir)
    const channel = await prisma.channel.findFirst({
      where: { id: channelId, tenantId },
    });
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    // XML'i indir
    const resp = await axios.get(url, { responseType: "text", timeout: 30000 });
    const xml = resp.data as string;

    // Parse + extract + normalize
    const root = parseXml(xml);
    const rawItems = extractItems(root);
    const mapped = rawItems
      .map(normalizeItem)
      .filter(Boolean) as GuessMap[];

    // (Opsiyonel) DB'ye yaz - basit örnek: Product + tek variant
    let savedCount = 0;
    if (save && mapped.length) {
      for (const m of mapped) {
        await prisma.product.upsert({
          where: { tenantId_name: { tenantId, name: m.name } }, // bu unique composite yoksa aşağıdaki modele bak
          update: {
            brand: m.brand || undefined,
            variants: {
              upsert: {
                where: { sku: m.sku },
                update: { 
                    price: m.price, 
                    stock: m.stock, 
                    barcode: m.barcode || undefined,
                    attrs: m.attrs || undefined, 
                },
                create: {
                  sku: m.sku,
                  price: m.price,
                  stock: m.stock,
                  barcode: m.barcode || undefined,
                  attrs: m.attrs || undefined, // JSONB
                },
              },
            },
          },
          create: {
            tenantId,
            name: m.name,
            brand: m.brand || undefined,
            variants: {
              create: {
                sku: m.sku,
                price: m.price,
                stock: m.stock,
                barcode: m.barcode || undefined,
                attrs: m.attrs || undefined, 
              },
            },
          },
          include: { variants: true },
        });
        savedCount++;
      }
    }

    // Trendyol mock push (gerçekte burada adapter mapping'i detaylanacak)
    let pushResult: any = null;
    if (push && mapped.length) {
         const payload = (mapped as any[]).map((m) => ({
        name: m.name,
        brand: m.brand,
        variants: [
          {
            sku: m.sku,
            barcode: m.barcode,
            price: m.price,
            stock: m.stock,
            currency: "TRY",
            attrs: m.attrs, // kategori/açıklama/görseller vs. burada taşınır
          },
        ],
      }));
      pushResult = await pushProducts(
        {
          apiKey: channel.apiKey,
          apiSecret: channel.apiSecret || undefined,
          sellerId: channel.sellerId || undefined,
        },
        payload
      );
    }

    res.json({
      ok: true,
      totalInXml: rawItems.length,
      normalized: mapped.length,
      saved: savedCount,
      pushed: Array.isArray(pushResult) ? pushResult.length : 0,
      sample: mapped.slice(0, 3),
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message || "xml ingest error" });
  }
});

router.get("/peek", async (req, res) => {
  try {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ error: "url gerekli ?url=..." });

    const resp = await axios.get(url, { responseType: "text", timeout: 30000 });
    const xml = resp.data as string;

    const root = parseXml(xml);
    const items = extractItems(root);
    

    if (!items.length) return res.json({ ok: true, count: 0, note: "ürün bulunamadı" });

    const first = items[0];
    res.json({
      ok: true,
      count: items.length,
      sampleKeys: Object.keys(first),
      sample: first,
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message || "peek error" });
  }
});

export default router;
