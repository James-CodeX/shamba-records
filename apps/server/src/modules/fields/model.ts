import { t } from "elysia";

export const fieldStageSchema = t.Union([
  t.Literal("planted"),
  t.Literal("growing"),
  t.Literal("ready"),
  t.Literal("harvested"),
]);

export const userRoleSchema = t.Union([t.Literal("admin"), t.Literal("agent")]);

export const createFieldBodySchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 120 }),
  cropType: t.String({ minLength: 1, maxLength: 120 }),
  plantingDate: t.String({ minLength: 1 }),
});

export const updateFieldBodySchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  cropType: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  plantingDate: t.Optional(t.String({ minLength: 1 })),
  stage: t.Optional(fieldStageSchema),
});

export const assignFieldBodySchema = t.Object({
  userId: t.String({ minLength: 1 }),
});

export const createFieldUpdateBodySchema = t.Object({
  stage: fieldStageSchema,
  notes: t.Optional(t.String({ maxLength: 2000 })),
});

export const fieldIdParamsSchema = t.Object({
  fieldId: t.String({ minLength: 1 }),
});

export const fieldStageValues = ["planted", "growing", "ready", "harvested"] as const;

export type FieldStage = (typeof fieldStageValues)[number];
export type FieldStatus = "active" | "at_risk" | "completed";
export type UserRole = "admin" | "agent";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function computeFieldStatus(stage: FieldStage, plantingDate: Date | string): FieldStatus {
  if (stage === "harvested") {
    return "completed";
  }

  const plantedAt = new Date(plantingDate);
  const elapsedDays = (Date.now() - plantedAt.getTime()) / MS_PER_DAY;

  if (elapsedDays > 90 && stage !== "ready") {
    return "at_risk";
  }

  return "active";
}
