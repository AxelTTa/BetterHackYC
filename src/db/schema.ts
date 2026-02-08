import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  real,
  json,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================================
// BETTER AUTH CORE TABLES
// These are required by Better Auth - do not modify structure
// ============================================================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Custom field for your app
  role: text("role", { enum: ["manager", "employee"] }).notNull().default("employee"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// APPLICATION TABLES
// Your custom data model for the onboarding app
// ============================================================================

export const workspace = pgTable("workspace", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  modelUuid: text("model_uuid").notNull(), // From external 3D API
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tutorial = pgTable("tutorial", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspace.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  shareLink: text("share_link").notNull().unique(), // Unique string for sharing
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const annotation = pgTable("annotation", {
  id: uuid("id").primaryKey().defaultRandom(),
  tutorialId: uuid("tutorial_id")
    .notNull()
    .references(() => tutorial.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  // 3D position coordinates
  x: real("x").notNull(),
  y: real("y").notNull(),
  z: real("z").notNull(),
  order: integer("order").notNull(), // Sequence number
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const progress = pgTable("progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  tutorialId: uuid("tutorial_id")
    .notNull()
    .references(() => tutorial.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  completedAnnotations: json("completed_annotations").$type<string[]>().default([]),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================================================
// RELATIONS
// Define relationships for Drizzle query builder
// ============================================================================

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  workspaces: many(workspace),
  progress: many(progress),
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

export const workspaceRelations = relations(workspace, ({ one, many }) => ({
  creator: one(user, {
    fields: [workspace.createdBy],
    references: [user.id],
  }),
  tutorials: many(tutorial),
}));

export const tutorialRelations = relations(tutorial, ({ one, many }) => ({
  workspace: one(workspace, {
    fields: [tutorial.workspaceId],
    references: [workspace.id],
  }),
  annotations: many(annotation),
  progress: many(progress),
}));

export const annotationRelations = relations(annotation, ({ one }) => ({
  tutorial: one(tutorial, {
    fields: [annotation.tutorialId],
    references: [tutorial.id],
  }),
}));

export const progressRelations = relations(progress, ({ one }) => ({
  tutorial: one(tutorial, {
    fields: [progress.tutorialId],
    references: [tutorial.id],
  }),
  employee: one(user, {
    fields: [progress.employeeId],
    references: [user.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// For use throughout your application
// ============================================================================

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Workspace = typeof workspace.$inferSelect;
export type NewWorkspace = typeof workspace.$inferInsert;
export type Tutorial = typeof tutorial.$inferSelect;
export type NewTutorial = typeof tutorial.$inferInsert;
export type Annotation = typeof annotation.$inferSelect;
export type NewAnnotation = typeof annotation.$inferInsert;
export type Progress = typeof progress.$inferSelect;
export type NewProgress = typeof progress.$inferInsert;
