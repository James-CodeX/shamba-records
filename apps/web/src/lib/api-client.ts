import { env } from "@my-better-t-app/env/web";

export type UserRole = "admin" | "agent";
export type FieldStage = "planted" | "growing" | "ready" | "harvested";
export type FieldStatus = "active" | "at_risk" | "completed";

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type FieldSummary = {
  id: string;
  name: string;
  cropType: string;
  plantingDate: string;
  stage: FieldStage;
  status: FieldStatus;
  createdAt: string;
  updatedAt: string;
  assignments: Array<{
    userId: string;
    name: string;
    email: string;
  }>;
  latestUpdate: {
    id: string;
    fieldId: string;
    stage: FieldStage;
    notes: string | null;
    createdAt: string;
    userName: string;
    userEmail: string;
  } | null;
};

export type AdminDashboard = {
  role: "admin";
  totalFields: number;
  statusBreakdown: {
    active: number;
    atRisk: number;
    completed: number;
  };
  updates: Array<{
    id: string;
    fieldId: string;
    fieldName: string;
    stage: FieldStage;
    notes: string | null;
    createdAt: string;
    userName: string;
  }>;
  fields: FieldSummary[];
};

export type AgentDashboard = {
  role: "agent";
  assignedFields: number;
  statusBreakdown: {
    active: number;
    atRisk: number;
    completed: number;
  };
  fields: FieldSummary[];
};

export type DashboardResponse = AdminDashboard | AgentDashboard;

export type FieldUpdateEntry = {
  id: string;
  fieldId: string;
  stage: FieldStage;
  notes: string | null;
  createdAt: string;
  userName: string;
  userEmail: string;
};

type RequestConfig = Omit<RequestInit, "body"> & {
  body?: unknown;
};

const API_BASE = env.NEXT_PUBLIC_SERVER_URL;

async function apiRequest<T>(path: string, config?: RequestConfig): Promise<T> {
  const headers = new Headers(config?.headers);

  if (config?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...config,
    headers,
    credentials: "include",
    cache: "no-store",
    body: config?.body ? JSON.stringify(config.body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.message || response.statusText || "Request failed");
  }

  return payload as T;
}

export async function getCurrentUser() {
  return apiRequest<{ user: ApiUser }>("/api/me");
}

export async function getDashboard() {
  return apiRequest<DashboardResponse>("/api/dashboard");
}

export async function getFields() {
  return apiRequest<{ fields: FieldSummary[] }>("/api/fields");
}

export async function getAgents() {
  return apiRequest<{ agents: Array<{ id: string; name: string; email: string }> }>("/api/agents");
}

export async function createField(input: {
  name: string;
  cropType: string;
  plantingDate: string;
}) {
  return apiRequest<{ field: FieldSummary }>("/api/fields", {
    method: "POST",
    body: input,
  });
}

export async function updateField(
  fieldId: string,
  input: {
    name?: string;
    cropType?: string;
    plantingDate?: string;
    stage?: FieldStage;
  },
) {
  return apiRequest<{ field: FieldSummary }>(`/api/fields/${fieldId}`, {
    method: "PATCH",
    body: input,
  });
}

export async function assignField(fieldId: string, userId: string) {
  return apiRequest<{ assignment: { id: string; userId: string; name: string; email: string } }>(
    `/api/fields/${fieldId}/assign`,
    {
      method: "POST",
      body: { userId },
    },
  );
}

export async function createFieldUpdate(
  fieldId: string,
  input: {
    stage: FieldStage;
    notes?: string;
  },
) {
  return apiRequest<{ update: { id: string } }>(`/api/fields/${fieldId}/updates`, {
    method: "POST",
    body: input,
  });
}

export async function getFieldUpdates(fieldId: string) {
  return apiRequest<{ updates: FieldUpdateEntry[] }>(`/api/fields/${fieldId}/updates`);
}
