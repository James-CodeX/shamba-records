import { type FieldStage, type FieldSummary } from "@/lib/api-client";

export const STAGE_OPTIONS: FieldStage[] = ["planted", "growing", "ready", "harvested"];

export type UpdateDraft = {
  stage: FieldStage;
  notes: string;
};

export type EditDraft = {
  name: string;
  cropType: string;
  plantingDate: string;
  stage: FieldStage;
};

export const defaultUpdateDraft = (stage: FieldStage): UpdateDraft => ({ stage, notes: "" });

export function toDateInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function getAgeInDays(isoDate: string) {
  const now = Date.now();
  const then = new Date(isoDate).getTime();

  if (Number.isNaN(then)) {
    return Number.POSITIVE_INFINITY;
  }

  return (now - then) / (1000 * 60 * 60 * 24);
}

export function statusVariant(status: FieldSummary["status"]) {
  if (status === "completed") {
    return "default" as const;
  }

  return "secondary" as const;
}

export function initialsFromName(name: string) {
  const parts = name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "");

  return parts.join("") || "U";
}
