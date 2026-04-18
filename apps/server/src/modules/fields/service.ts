import { auth } from "@my-better-t-app/auth";
import { db } from "@my-better-t-app/db";
import { field, fieldAssignment, fieldUpdate, user } from "@my-better-t-app/db/schema/auth";
import { and, desc, eq, inArray } from "drizzle-orm";

import { computeFieldStatus, type FieldStage, type UserRole } from "./model";

type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

type CreateFieldInput = {
  name: string;
  cropType: string;
  plantingDate: string;
};

type UpdateFieldInput = {
  name?: string;
  cropType?: string;
  plantingDate?: string;
  stage?: FieldStage;
};

type CreateFieldUpdateInput = {
  stage: FieldStage;
  notes?: string;
};

export class FieldsService {
  async authenticate(headers: Headers): Promise<AuthenticatedUser | null> {
    const session = await auth.api.getSession({ headers });

    if (!session?.user?.id) {
      return null;
    }

    const [currentUser] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    return currentUser ?? null;
  }

  async getAgents(currentUser: AuthenticatedUser) {
    if (currentUser.role !== "admin") {
      return null;
    }

    return db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(user)
      .where(eq(user.role, "agent"))
      .orderBy(user.name);
  }

  async getFields(currentUser: AuthenticatedUser) {
    const fields = await this.getScopedFields(currentUser);

    if (fields.length === 0) {
      return [];
    }

    const fieldIds = fields.map((item) => item.id);
    const assignments = await db
      .select({
        fieldId: fieldAssignment.fieldId,
        userId: user.id,
        name: user.name,
        email: user.email,
      })
      .from(fieldAssignment)
      .innerJoin(user, eq(user.id, fieldAssignment.userId))
      .where(inArray(fieldAssignment.fieldId, fieldIds));

    const updates = await db
      .select({
        id: fieldUpdate.id,
        fieldId: fieldUpdate.fieldId,
        stage: fieldUpdate.stage,
        notes: fieldUpdate.notes,
        createdAt: fieldUpdate.createdAt,
        userName: user.name,
        userEmail: user.email,
      })
      .from(fieldUpdate)
      .innerJoin(user, eq(user.id, fieldUpdate.userId))
      .where(inArray(fieldUpdate.fieldId, fieldIds))
      .orderBy(desc(fieldUpdate.createdAt));

    const assignmentsByField = new Map<string, Array<{ userId: string; name: string; email: string }>>();
    for (const assignment of assignments) {
      const list = assignmentsByField.get(assignment.fieldId) ?? [];
      list.push({ userId: assignment.userId, name: assignment.name, email: assignment.email });
      assignmentsByField.set(assignment.fieldId, list);
    }

    const latestUpdateByField = new Map<string, (typeof updates)[number]>();
    for (const update of updates) {
      if (!latestUpdateByField.has(update.fieldId)) {
        latestUpdateByField.set(update.fieldId, update);
      }
    }

    return fields.map((item) => ({
      ...item,
      status: computeFieldStatus(item.stage, item.plantingDate),
      assignments: assignmentsByField.get(item.id) ?? [],
      latestUpdate: latestUpdateByField.get(item.id) ?? null,
    }));
  }

  async getDashboard(currentUser: AuthenticatedUser) {
    const fields = await this.getFields(currentUser);
    const statusBreakdown = {
      active: fields.filter((item) => item.status === "active").length,
      completed: fields.filter((item) => item.status === "completed").length,
    };

    if (currentUser.role === "agent") {
      return {
        role: currentUser.role,
        assignedFields: fields.length,
        statusBreakdown,
        fields,
      };
    }

    const updates = await db
      .select({
        id: fieldUpdate.id,
        fieldId: fieldUpdate.fieldId,
        fieldName: field.name,
        stage: fieldUpdate.stage,
        notes: fieldUpdate.notes,
        createdAt: fieldUpdate.createdAt,
        userName: user.name,
      })
      .from(fieldUpdate)
      .innerJoin(field, eq(field.id, fieldUpdate.fieldId))
      .innerJoin(user, eq(user.id, fieldUpdate.userId))
      .orderBy(desc(fieldUpdate.createdAt))
      .limit(20);

    return {
      role: currentUser.role,
      totalFields: fields.length,
      statusBreakdown,
      updates,
      fields,
    };
  }

  async createField(currentUser: AuthenticatedUser, input: CreateFieldInput) {
    if (currentUser.role !== "admin") {
      return null;
    }

    const plantingDate = this.parseDate(input.plantingDate);
    if (!plantingDate) {
      return { error: "Invalid plantingDate" };
    }

    const [createdField] = await db
      .insert(field)
      .values({
        id: crypto.randomUUID(),
        name: input.name.trim(),
        cropType: input.cropType.trim(),
        plantingDate,
        stage: "planted",
        status: computeFieldStatus("planted", plantingDate),
      })
      .returning();

    return createdField;
  }

  async updateField(currentUser: AuthenticatedUser, fieldId: string, input: UpdateFieldInput) {
    if (currentUser.role !== "admin") {
      return null;
    }

    const [existingField] = await db.select().from(field).where(eq(field.id, fieldId)).limit(1);
    if (!existingField) {
      return { error: "Field not found" };
    }

    const nextPlantingDate = input.plantingDate
      ? this.parseDate(input.plantingDate)
      : existingField.plantingDate;

    if (!nextPlantingDate) {
      return { error: "Invalid plantingDate" };
    }

    const nextStage = input.stage ?? existingField.stage;

    const [updatedField] = await db
      .update(field)
      .set({
        name: input.name?.trim() ?? existingField.name,
        cropType: input.cropType?.trim() ?? existingField.cropType,
        plantingDate: nextPlantingDate,
        stage: nextStage,
        status: computeFieldStatus(nextStage, nextPlantingDate),
        updatedAt: new Date(),
      })
      .where(eq(field.id, fieldId))
      .returning();

    return updatedField;
  }

  async assignField(currentUser: AuthenticatedUser, fieldId: string, userId: string) {
    if (currentUser.role !== "admin") {
      return null;
    }

    const [existingField] = await db.select({ id: field.id }).from(field).where(eq(field.id, fieldId)).limit(1);
    if (!existingField) {
      return { error: "Field not found" };
    }

    const [assignee] = await db
      .select({ id: user.id, role: user.role, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!assignee) {
      return { error: "User not found" };
    }

    if (assignee.role !== "agent") {
      return { error: "Only agents can be assigned to fields" };
    }

    const [existingAssignment] = await db
      .select({ id: fieldAssignment.id })
      .from(fieldAssignment)
      .where(and(eq(fieldAssignment.fieldId, fieldId), eq(fieldAssignment.userId, userId)))
      .limit(1);

    if (existingAssignment) {
      return { id: existingAssignment.id, userId: assignee.id, name: assignee.name, email: assignee.email };
    }

    const [assignment] = await db
      .insert(fieldAssignment)
      .values({
        id: crypto.randomUUID(),
        fieldId,
        userId,
      })
      .returning();

    if (!assignment) {
      return { error: "Could not create assignment" };
    }

    return {
      id: assignment.id,
      userId: assignee.id,
      name: assignee.name,
      email: assignee.email,
    };
  }

  async getFieldUpdates(currentUser: AuthenticatedUser, fieldId: string) {
    const canAccess = await this.canAccessField(currentUser, fieldId);
    if (!canAccess) {
      return null;
    }

    return db
      .select({
        id: fieldUpdate.id,
        fieldId: fieldUpdate.fieldId,
        stage: fieldUpdate.stage,
        notes: fieldUpdate.notes,
        createdAt: fieldUpdate.createdAt,
        userName: user.name,
        userEmail: user.email,
      })
      .from(fieldUpdate)
      .innerJoin(user, eq(user.id, fieldUpdate.userId))
      .where(eq(fieldUpdate.fieldId, fieldId))
      .orderBy(desc(fieldUpdate.createdAt));
  }

  async createFieldUpdate(currentUser: AuthenticatedUser, fieldId: string, input: CreateFieldUpdateInput) {
    const canAccess = await this.canAccessField(currentUser, fieldId);
    if (!canAccess) {
      return null;
    }

    const [existingField] = await db.select().from(field).where(eq(field.id, fieldId)).limit(1);
    if (!existingField) {
      return { error: "Field not found" };
    }

    const [createdUpdate] = await db
      .insert(fieldUpdate)
      .values({
        id: crypto.randomUUID(),
        fieldId,
        userId: currentUser.id,
        stage: input.stage,
        notes: input.notes?.trim() || null,
      })
      .returning();

    await db
      .update(field)
      .set({
        stage: input.stage,
        status: computeFieldStatus(input.stage, existingField.plantingDate),
        updatedAt: new Date(),
      })
      .where(eq(field.id, fieldId));

    return {
      ...createdUpdate,
      userName: currentUser.name,
      userEmail: currentUser.email,
    };
  }

  private async getScopedFields(currentUser: AuthenticatedUser) {
    if (currentUser.role === "admin") {
      return db.select().from(field).orderBy(desc(field.createdAt));
    }

    const rows = await db
      .select({ field })
      .from(fieldAssignment)
      .innerJoin(field, eq(field.id, fieldAssignment.fieldId))
      .where(eq(fieldAssignment.userId, currentUser.id))
      .orderBy(desc(field.createdAt));

    return rows.map((row) => row.field);
  }

  private async canAccessField(currentUser: AuthenticatedUser, fieldId: string) {
    if (currentUser.role === "admin") {
      return true;
    }

    const [assignment] = await db
      .select({ id: fieldAssignment.id })
      .from(fieldAssignment)
      .where(and(eq(fieldAssignment.fieldId, fieldId), eq(fieldAssignment.userId, currentUser.id)))
      .limit(1);

    return Boolean(assignment);
  }

  private parseDate(value: string) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
