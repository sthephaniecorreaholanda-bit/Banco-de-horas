import { pgTable, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  dailyTargetMinutes: integer("daily_target_minutes").notNull().default(430),
  manualAdjustmentMinutes: integer("manual_adjustment_minutes").notNull().default(0),
  lunchBreakMinutes: integer("lunch_break_minutes").notNull().default(60),
  goalMinutes: integer("goal_minutes"),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
