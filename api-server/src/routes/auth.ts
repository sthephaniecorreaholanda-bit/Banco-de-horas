import { Router } from "express";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Rota para criar a sua conta inicial (/api/auth/register)
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Usuário e senha são obrigatórios." });
    }

    // Verifica se o usuário já existe no banco
    const existingUser = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Este usuário já existe." });
    }

    // Salva o usuário no banco (em sistemas de produção usaríamos bcrypt para o hash)
    await db.insert(users).values({
      username,
      passwordHash: password, // Salvando a senha diretamente para simplificar o ambiente local
    });

    return res.status(201).json({
      success: true,
      message: "Usuário mestre criado com sucesso!",
      username
    });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno ao registrar usuário." });
  }
});

// Rota para fazer o Login (/api/auth/login)
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Busca o usuário no banco de dados
    const userRecords = await db.select().from(users).where(eq(users.username, username)).limit(1);
    const user = userRecords[0];

    // Valida as credenciais
    if (!user || user.passwordHash !== password) {
      return res.status(401).json({ error: "Usuário ou senha incorretos." });
    }

    return res.status(200).json({
      success: true,
      message: "Autenticado com sucesso!",
      username: user.username
    });
  } catch (error) {
    return res.status(500).json({ error: "Erro interno ao fazer login." });
  }
});

export default router;