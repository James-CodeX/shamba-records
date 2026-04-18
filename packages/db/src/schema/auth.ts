import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: text("role").$type<"admin" | "agent">().notNull().default("agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const field = pgTable("field", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  cropType: text("crop_type").notNull(),
  plantingDate: timestamp("planting_date").notNull(),
  stage: text("stage")
    .$type<"planted" | "growing" | "ready" | "harvested">()
    .notNull()
    .default("planted"),
  status: text("status")
    .$type<"active" | "completed">()
    .notNull()
    .default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const fieldAssignment = pgTable(
  "field_assignment",
  {
    id: text("id").primaryKey(),
    fieldId: text("field_id")
      .notNull()
      .references(() => field.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  },
  (table) => [
    index("field_assignment_user_idx").on(table.userId),
    index("field_assignment_field_idx").on(table.fieldId),
  ],
);

export const fieldUpdate = pgTable(
  "field_update",
  {
    id: text("id").primaryKey(),
    fieldId: text("field_id")
      .notNull()
      .references(() => field.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    stage: text("stage")
      .$type<"planted" | "growing" | "ready" | "harvested">()
      .notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("field_update_field_idx").on(table.fieldId)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  assignments: many(fieldAssignment),
  updates: many(fieldUpdate),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const fieldRelations = relations(field, ({ many }) => ({
  assignments: many(fieldAssignment),
  updates: many(fieldUpdate),
}));

export const fieldAssignmentRelations = relations(fieldAssignment, ({ one }) => ({
  field: one(field, {
    fields: [fieldAssignment.fieldId],
    references: [field.id],
  }),
  user: one(user, {
    fields: [fieldAssignment.userId],
    references: [user.id],
  }),
}));

export const fieldUpdateRelations = relations(fieldUpdate, ({ one }) => ({
  field: one(field, {
    fields: [fieldUpdate.fieldId],
    references: [field.id],
  }),
  user: one(user, {
    fields: [fieldUpdate.userId],
    references: [user.id],
  }),
}));
