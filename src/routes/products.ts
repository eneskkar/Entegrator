import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

/**
 * GET /products/:tenantId?search=&page=1&pageSize=20
 * - Ürünleri variant’larıyla listeler
 */
router.get("/:tenantId", async (req, res) => {
  const { tenantId } = req.params;
  const search = (req.query.search as string)?.trim() || "";
  const page = Number(req.query.page || 1);
  const pageSize = Math.min(Number(req.query.pageSize || 20), 100);
  const where = {
    tenantId,
    ...(search
      ? { OR: [
          { name: { contains: search, mode: "insensitive" } },
          { brand: { contains: search, mode: "insensitive" } },
          { variants: { some: { sku: { contains: search, mode: "insensitive" } } } }
        ] }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { variants: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);
  res.json({ items, total, page, pageSize });
});

export default router;
