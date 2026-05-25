import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(), // Guarda a senha criptografada com segurança
  createdAt: timestamp("created_at").defaultNow().notNull(),
});