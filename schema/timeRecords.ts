import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const timeRecordsTable = pgTable("time_records", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),
  type: text("type").notNull(),
  entryTime: text("entry_time"),
  exitTime: text("exit_time"),
  workedMinutes: integer("worked_minutes").notNull().default(0),
  balanceMinutes: integer("balance_minutes").notNull().default(0),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTimeRecordSchema = createInsertSchema(timeRecordsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertTimeRecord = z.infer<typeof insertTimeRecordSchema>;
export type TimeRecord = typeof timeRecordsTable.$inferSelect;
