import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password, tenantName } = req.body;
    if (!email || !password || !tenantName) {
      return res.status(400).json({ error: "email, password, tenantName gerekli" });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ error: "Email zaten kayıtlı" });

    const hashed = await bcrypt.hash(password, 10);

    const tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        users: {
          create: {
            email,
            password: hashed,
          },
        },
      },
      include: { users: true },
    });

    res.json({ message: "Kayıt ok", tenantId: tenant.id, userId: tenant.users[0].id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Register hatası" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: "Kullanıcı bulunamadı" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Şifre hatalı" });

    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenantId },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" }
    );

    res.json({ token, tenantId: user.tenantId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login hatası" });
  }
});

export default router;
