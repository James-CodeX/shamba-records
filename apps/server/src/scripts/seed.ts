import { auth } from "@my-better-t-app/auth";
import { db } from "@my-better-t-app/db";
import { field, fieldAssignment, fieldUpdate, user } from "@my-better-t-app/db/schema/auth";
import { corsOrigins } from "@my-better-t-app/env/server";
import { eq, sql } from "drizzle-orm";

const AGENT_COUNT = 30;
const FIELD_COUNT = 50;
const ADMIN_EMAIL = "seed.admin@shamba.local";
const ADMIN_PASSWORD = "Admin@12345";
const AGENT_PASSWORD = "Agent@12345";
const SEED_USER_EMAIL_LIKE = "seed.%@shamba.local";
const SEED_ORIGIN =
  corsOrigins[0] ??
  (() => {
    throw new Error("CORS_ORIGIN must include at least one valid origin");
  })();

type FieldStage = "planted" | "growing" | "ready" | "harvested";
type FieldStatus = "active" | "completed";

function toStatus(stage: FieldStage): FieldStatus {
  return stage === "harvested" ? "completed" : "active";
}

async function clearSeedData() {
  await db.delete(fieldUpdate).where(sql`${fieldUpdate.id} like 'seed-%'`);
  await db.delete(fieldAssignment).where(sql`${fieldAssignment.id} like 'seed-%'`);
  await db.delete(field).where(sql`${field.id} like 'seed-%'`);
  await db.delete(user).where(sql`${user.email} like ${SEED_USER_EMAIL_LIKE}`);
}

async function signUpUser(name: string, email: string, password: string) {
  await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
    },
    headers: new Headers({
      origin: SEED_ORIGIN,
    }),
  });
}

async function insertSeedUsers() {
  await signUpUser("Seed Admin", ADMIN_EMAIL, ADMIN_PASSWORD);
  await db.update(user).set({ role: "admin" }).where(eq(user.email, ADMIN_EMAIL));

  for (let index = 0; index < AGENT_COUNT; index += 1) {
    const n = String(index + 1).padStart(2, "0");
    await signUpUser(`Seed Agent ${n}`, `seed.agent${n}@shamba.local`, AGENT_PASSWORD);
  }
}

async function getSeedAgentIds() {
  const agents = await db
    .select({
      id: user.id,
      email: user.email,
    })
    .from(user)
    .where(sql`${user.email} like 'seed.agent%@shamba.local'`)
    .orderBy(user.email);

  if (agents.length !== AGENT_COUNT) {
    throw new Error(`Expected ${AGENT_COUNT} agent users, found ${agents.length}`);
  }

  return agents.map((agent) => agent.id);
}

async function insertSeedFieldData(agentIds: string[]) {
  const cropTypes = ["Maize", "Beans", "Wheat", "Sorghum", "Sunflower"] as const;
  const stages: FieldStage[] = ["planted", "growing", "ready", "harvested"];

  const fields = Array.from({ length: FIELD_COUNT }, (_, index) => {
    const n = index + 1;
    const stage = stages[index % stages.length] as FieldStage;
    const plantingDate = new Date(Date.now() - n * 24 * 60 * 60 * 1000 * 3);

    return {
      id: `seed-field-${String(n).padStart(3, "0")}`,
      name: `Seed Field ${String(n).padStart(3, "0")}`,
      cropType: cropTypes[index % cropTypes.length] as string,
      plantingDate,
      stage,
      status: toStatus(stage),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  await db.insert(field).values(fields);

  const assignments = fields.map((currentField, index) => {
    const n = index + 1;

    return {
      id: `seed-assignment-${String(n).padStart(3, "0")}`,
      fieldId: currentField.id,
      userId: agentIds[index % agentIds.length] as string,
      assignedAt: new Date(Date.now() - n * 24 * 60 * 60 * 1000),
    };
  });

  await db.insert(fieldAssignment).values(assignments);

  const updates = fields.map((currentField, index) => {
    const n = index + 1;

    return {
      id: `seed-update-${String(n).padStart(3, "0")}`,
      fieldId: currentField.id,
      userId: agentIds[index % agentIds.length] as string,
      stage: currentField.stage,
      notes: `Automated seed update for ${currentField.name}`,
      createdAt: new Date(Date.now() - n * 12 * 60 * 60 * 1000),
    };
  });

  await db.insert(fieldUpdate).values(updates);
}

async function printSeedSummary() {
  const [adminCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(user)
    .where(sql`${user.role} = 'admin' and ${user.email} = ${ADMIN_EMAIL}`);

  const [agentCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(user)
    .where(sql`${user.role} = 'agent' and ${user.email} like 'seed.agent%@shamba.local'`);

  const [fieldCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(field)
    .where(sql`${field.id} like 'seed-%'`);

  const [assignmentCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(fieldAssignment)
    .where(sql`${fieldAssignment.id} like 'seed-%'`);

  const [updateCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(fieldUpdate)
    .where(sql`${fieldUpdate.id} like 'seed-%'`);

  console.log("Seed complete:");
  console.log(`- admins: ${adminCount?.count ?? 0}`);
  console.log(`- agents: ${agentCount?.count ?? 0}`);
  console.log(`- fields: ${fieldCount?.count ?? 0}`);
  console.log(`- field assignments: ${assignmentCount?.count ?? 0}`);
  console.log(`- field updates: ${updateCount?.count ?? 0}`);
  console.log("Credentials:");
  console.log(`- admin email: ${ADMIN_EMAIL}`);
  console.log(`- admin password: ${ADMIN_PASSWORD}`);
  console.log(`- agent password: ${AGENT_PASSWORD}`);
}

async function main() {
  await clearSeedData();
  await insertSeedUsers();
  const seedAgentIds = await getSeedAgentIds();
  await insertSeedFieldData(seedAgentIds);
  await printSeedSummary();
}

main().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
