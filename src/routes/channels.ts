import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

// Kanal ekle
router.post("/add", async (req, res) => {
  try {
    const { tenantId, name, type, apiKey } = req.body;
    if (!tenantId || !name || !type || !apiKey) {
      return res.status(400).json({ error: "tenantId, name, type, apiKey gerekli" });
    }

    const channel = await prisma.channel.create({
      data: { tenantId, name, type, apiKey },
    });

    res.json(channel);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Kanal ekleme hatası" });
  }
});

// Kiracıya göre listele
router.get("/:tenantId", async (req, res) => {
  try {
    const { tenantId } = req.params;
    const channels = await prisma.channel.findMany({ where: { tenantId } });
    res.json(channels);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Kanal listeleme hatası" });
  }
});

export default router;
