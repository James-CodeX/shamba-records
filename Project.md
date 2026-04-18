# 🌱 SmartSeason Field Monitoring System

## 📌 Overview

The SmartSeason Field Monitoring System is a simple web application designed to help track crop progress across multiple agricultural fields during a growing season.

The system enables coordination between administrators and field agents by providing tools to manage fields, assign responsibilities, and monitor crop development in real time.

This project was built as part of a Full Stack Developer technical assessment, with a focus on clean architecture, core business logic, and usability.

---

## 🎯 Objectives

The application demonstrates the ability to:

- Design a clean and scalable system
- Implement core backend logic
- Structure a relational database schema
- Build role-based access control
- Provide a usable and intuitive interface

---

## 👥 User Roles

The system supports two types of users:

### 1. Admin (Coordinator)

- Can create and manage fields
- Assign fields to field agents
- View all fields and updates
- Access system-wide dashboard

### 2. Field Agent

- Can view assigned fields only
- Can update field stages
- Can add notes/observations

---

## 🌾 Core Features

### 1. Authentication & Access Control

- Users are authenticated using a Better Auth system
- Each user has a role (`admin` or `agent`)
- Access is restricted based on role

---

### 2. Field Management

Admins can:

- Create fields
- Edit field details
- Assign fields to agents

Each field contains:

- Name
- Crop type
- Planting date
- Current stage

---

### 3. Field Updates

Field Agents can:

- Update the current stage of a field
- Add notes or observations

All updates are stored historically for tracking changes over time.

---

### 4. Field Lifecycle

Each field progresses through the following stages:

- `planted`
- `growing`
- `ready`
- `harvested`

---

### 5. Field Status Logic

Each field has a computed **status** based on its data:

- `active` → Normal progression
- `at_risk` → Delayed or abnormal progress
- `completed` → Harvested

#### Example Logic:

- If stage = `harvested` → `completed`
- If too many days have passed without reaching `ready` → `at_risk`
- Otherwise → `active`

This logic is computed dynamically in the backend.

---

### 6. Dashboard

#### Admin Dashboard:

- Total number of fields
- Status breakdown (active, at risk, completed)
- Overview of all updates

#### Field Agent Dashboard:

- Assigned fields only
- Current progress of each field

---

## 🗄️ Database Schema

You already have:

    user (with auth)

    roles are missing → we’ll add that

Now we add:

    field

    field_assignment

    field_update

✅ 1. Extend User (Roles)

You need Admin vs Field Agent

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
.$onUpdate(() => new Date())
.notNull(),
});

🌾 2. Fields Table

This is the core entity.

export const field = pgTable("field", {
id: text("id").primaryKey(),

name: text("name").notNull(),
cropType: text("crop_type").notNull(),

plantingDate: timestamp("planting_date").notNull(),

stage: text("stage")
.$type<"planted" | "growing" | "ready" | "harvested">()
.notNull()
.default("planted"),

// computed in backend (not stored ideally, but optional)
status: text("status")
.$type<"active" | "at_risk" | "completed">()
.notNull()
.default("active"),

createdAt: timestamp("created_at").defaultNow().notNull(),
updatedAt: timestamp("updated_at")
.$onUpdate(() => new Date())
.notNull(),
});

🔗 3. Field Assignment

A field agent can have multiple fields.

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
]
);

📝 4. Field Updates (VERY IMPORTANT)

This is where agents log progress.

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
(table) => [
index("field_update_field_idx").on(table.fieldId),
]
);

🔁 Relations (Drizzle)

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

⚙️ Status Logic (IMPORTANT for README)

Don’t rely fully on DB — compute in backend:

Example:

function computeFieldStatus(field) {
if (field.stage === "harvested") return "completed";

const daysSincePlanting =
(Date.now() - new Date(field.plantingDate).getTime()) / (1000 _ 60 _ 60 \* 24);

if (daysSincePlanting > 90 && field.stage !== "ready") {
return "at_risk";
}

return "active";
}

🧩 Final Schema Overview (Simple & Clean)

Tables:

    ✅ user (auth + role)

    ✅ session (auth)

    ✅ account (auth)

    ✅ verification (auth)

    ✅ field

    ✅ field_assignment

    ✅ field_update

## 🔗 Relationships

- A **user** can have many **field assignments**
- A **field** can be assigned to multiple users (if needed)
- A **field** has many **updates**
- A **field update** belongs to both a user and a field

---

## ⚙️ Design Decisions

### 1. Separation of Concerns

Authentication is handled independently from domain logic, improving maintainability.

### 2. History Tracking

Field updates are stored separately instead of overwriting field data, allowing:

- audit trails
- progress tracking
- better insights

### 3. Flexible Assignment Model

Using a join table (`field_assignment`) allows:

- one-to-many and many-to-many relationships
- future scalability

### 4. Computed Status

Field status is derived dynamically instead of being fully stored, ensuring:

- consistency
- easier updates to business logic

---

## 🧪 Assumptions

- A field is typically assigned to one agent, but the schema allows multiple assignments
- Status logic is simplified and can be extended
- No real-time updates (polling or refresh-based UI is sufficient)
- Authentication system is already functional

---

## 🚀 Possible Improvements

- Add geolocation for fields
- Add image uploads for field updates
- Add notifications for at-risk fields
- Implement real-time updates (WebSockets)
- Add analytics and reporting

---

## 🧰 Tech Stack (Suggested)

- **Frontend:** Next.js
- **Backend:** Elysiajs
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Auth:** Better Auth

---

## 📦 Deliverables

- GitHub repository (frontend + backend)
- Setup instructions in README
- Demo credentials
- (Optional) Live deployment

---

## ✅ Summary

This system provides a clean, minimal implementation of a field monitoring platform. It focuses on clarity, usability, and solid backend design while remaining simple enough to build within a short assessment timeframe.

---
