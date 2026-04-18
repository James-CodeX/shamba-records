"use client";

import { Button } from "@my-better-t-app/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@my-better-t-app/ui/components/card";
import { Input } from "@my-better-t-app/ui/components/input";
import { Label } from "@my-better-t-app/ui/components/label";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import Loader from "@/components/loader";
import {
  assignField,
  createField,
  createFieldUpdate,
  getFieldUpdates,
  getAgents,
  getCurrentUser,
  getDashboard,
  getFields,
  updateField,
  type AgentDashboard,
  type ApiUser,
  type DashboardResponse,
  type FieldUpdateEntry,
  type FieldStage,
  type FieldSummary,
} from "@/lib/api-client";

const STAGE_OPTIONS: FieldStage[] = ["planted", "growing", "ready", "harvested"];

type UpdateDraft = {
  stage: FieldStage;
  notes: string;
};

type EditDraft = {
  name: string;
  cropType: string;
  plantingDate: string;
  stage: FieldStage;
};

const defaultUpdateDraft = (stage: FieldStage): UpdateDraft => ({ stage, notes: "" });

function toDateInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function statusClasses(status: string) {
  if (status === "at_risk") {
    return "border border-orange-600/40 bg-orange-500/10 text-orange-700 dark:text-orange-300";
  }

  if (status === "completed") {
    return "border border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  return "border border-sky-600/40 bg-sky-500/10 text-sky-700 dark:text-sky-300";
}

function getAgeInDays(isoDate: string) {
  const now = Date.now();
  const then = new Date(isoDate).getTime();

  if (Number.isNaN(then)) {
    return Number.POSITIVE_INFINITY;
  }

  return (now - then) / (1000 * 60 * 60 * 24);
}

function objectiveClasses(isDone: boolean) {
  if (isDone) {
    return "border border-emerald-600/40 bg-emerald-500/10";
  }

  return "border border-amber-600/40 bg-amber-500/10";
}

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState<ApiUser | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [fields, setFields] = useState<FieldSummary[]>([]);
  const [agents, setAgents] = useState<Array<{ id: string; name: string; email: string }>>([]);

  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldCropType, setNewFieldCropType] = useState("");
  const [newFieldPlantingDate, setNewFieldPlantingDate] = useState("");
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [updates, setUpdates] = useState<Record<string, UpdateDraft>>({});
  const [edits, setEdits] = useState<Record<string, EditDraft>>({});
  const [historyByField, setHistoryByField] = useState<Record<string, FieldUpdateEntry[]>>({});
  const [historyVisible, setHistoryVisible] = useState<Record<string, boolean>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>({});

  async function loadData(initial = false) {
    if (initial) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setError(null);

    try {
      const [me, dashboardData, fieldsData] = await Promise.all([
        getCurrentUser(),
        getDashboard(),
        getFields(),
      ]);

      setUser(me.user);
      setDashboard(dashboardData);
      setFields(fieldsData.fields);

      if (me.user.role === "admin") {
        const { agents: availableAgents } = await getAgents();
        setAgents(availableAgents);
      } else {
        setAgents([]);
      }

      setUpdates((current) => {
        const next = { ...current };
        for (const field of fieldsData.fields) {
          if (!next[field.id]) {
            next[field.id] = defaultUpdateDraft(field.stage);
          }
        }
        return next;
      });

      setEdits((current) => {
        const next = { ...current };
        for (const field of fieldsData.fields) {
          next[field.id] = {
            name: field.name,
            cropType: field.cropType,
            plantingDate: toDateInput(field.plantingDate),
            stage: field.stage,
          };
        }
        return next;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load dashboard");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData(true);
  }, []);

  const statusTotals = useMemo(() => {
    if (!dashboard) {
      return { active: 0, atRisk: 0, completed: 0 };
    }

    return dashboard.statusBreakdown;
  }, [dashboard]);

  const unassignedFields = useMemo(
    () => fields.filter((item) => item.assignments.length === 0),
    [fields],
  );

  const atRiskFields = useMemo(
    () => fields.filter((item) => item.status === "at_risk"),
    [fields],
  );

  const readyFields = useMemo(
    () => fields.filter((item) => item.stage === "ready"),
    [fields],
  );

  const staleFields = useMemo(
    () =>
      fields.filter((item) => {
        if (!item.latestUpdate) {
          return true;
        }

        return getAgeInDays(item.latestUpdate.createdAt) > 7;
      }),
    [fields],
  );

  const recentlyUpdatedCount = useMemo(
    () =>
      fields.filter(
        (item) =>
          item.latestUpdate &&
          Number.isFinite(getAgeInDays(item.latestUpdate.createdAt)) &&
          getAgeInDays(item.latestUpdate.createdAt) <= 2,
      ).length,
    [fields],
  );

  if (isLoading) {
    return <Loader />;
  }

  if (!user || !dashboard) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <p className="text-sm text-red-500">{error || "Unable to load dashboard"}</p>
      </div>
    );
  }

  async function handleCreateField(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!newFieldName || !newFieldCropType || !newFieldPlantingDate) {
      toast.error("Fill in all field details");
      return;
    }

    try {
      await createField({
        name: newFieldName,
        cropType: newFieldCropType,
        plantingDate: newFieldPlantingDate,
      });

      setNewFieldName("");
      setNewFieldCropType("");
      setNewFieldPlantingDate("");
      await loadData(false);
      toast.success("Field created");
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "Could not create field");
    }
  }

  async function handleAssignField(fieldId: string) {
    const userId = assignments[fieldId];

    if (!userId) {
      toast.error("Select an agent first");
      return;
    }

    try {
      await assignField(fieldId, userId);
      await loadData(false);
      toast.success("Field assigned");
    } catch (assignError) {
      toast.error(assignError instanceof Error ? assignError.message : "Could not assign field");
    }
  }

  async function handleSubmitUpdate(fieldId: string) {
    const draft = updates[fieldId];

    if (!draft) {
      toast.error("Set stage details first");
      return;
    }

    try {
      await createFieldUpdate(fieldId, {
        stage: draft.stage,
        notes: draft.notes,
      });
      await loadData(false);
      toast.success("Field update saved");
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : "Could not save update");
    }
  }

  async function handleSaveField(fieldId: string) {
    const draft = edits[fieldId];

    if (!draft) {
      toast.error("No field changes to save");
      return;
    }

    if (!draft.name || !draft.cropType || !draft.plantingDate) {
      toast.error("Field details are required");
      return;
    }

    try {
      await updateField(fieldId, {
        name: draft.name,
        cropType: draft.cropType,
        plantingDate: draft.plantingDate,
        stage: draft.stage,
      });
      await loadData(false);
      toast.success("Field updated");
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : "Could not update field");
    }
  }

  async function toggleHistory(fieldId: string) {
    const willShow = !historyVisible[fieldId];
    setHistoryVisible((current) => ({ ...current, [fieldId]: willShow }));

    if (!willShow || historyByField[fieldId]) {
      return;
    }

    setHistoryLoading((current) => ({ ...current, [fieldId]: true }));

    try {
      const { updates: fieldUpdates } = await getFieldUpdates(fieldId);
      setHistoryByField((current) => ({ ...current, [fieldId]: fieldUpdates }));
    } catch (historyError) {
      toast.error(historyError instanceof Error ? historyError.message : "Could not load field history");
      setHistoryVisible((current) => ({ ...current, [fieldId]: false }));
    } finally {
      setHistoryLoading((current) => ({ ...current, [fieldId]: false }));
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Season Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {user.name} ({user.role})
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadData(false)} disabled={isRefreshing}>
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>{dashboard.role === "admin" ? dashboard.totalFields : dashboard.assignedFields}</CardTitle>
            <CardDescription>{dashboard.role === "admin" ? "Total fields" : "Assigned fields"}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{statusTotals.active}</CardTitle>
            <CardDescription>Active</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{statusTotals.atRisk}</CardTitle>
            <CardDescription>At Risk</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{statusTotals.completed}</CardTitle>
            <CardDescription>Completed</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {dashboard.role === "admin" ? (
        <Card>
          <CardHeader>
            <CardTitle>Admin Mission Board</CardTitle>
            <CardDescription>Focus on assignment, risk mitigation, and update freshness.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className={`p-2 text-xs ${objectiveClasses(unassignedFields.length === 0)}`}>
                <p className="font-medium">Assign Unassigned Fields</p>
                <p className="text-muted-foreground">Pending: {unassignedFields.length}</p>
              </div>
              <div className={`p-2 text-xs ${objectiveClasses(atRiskFields.length === 0)}`}>
                <p className="font-medium">Reduce At-Risk Fields</p>
                <p className="text-muted-foreground">At risk: {atRiskFields.length}</p>
              </div>
              <div className={`p-2 text-xs ${objectiveClasses(staleFields.length === 0)}`}>
                <p className="font-medium">Keep Updates Fresh</p>
                <p className="text-muted-foreground">Stale/no updates: {staleFields.length}</p>
              </div>
              <div className={`p-2 text-xs ${objectiveClasses(readyFields.length === 0)}`}>
                <p className="font-medium">Close Ready Fields</p>
                <p className="text-muted-foreground">Ready to harvest: {readyFields.length}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold">Priority Queue</p>
              {unassignedFields.length === 0 && atRiskFields.length === 0 && staleFields.length === 0 ? (
                <p className="border p-2 text-xs text-muted-foreground">All key admin objectives are currently on track.</p>
              ) : null}
              {unassignedFields.slice(0, 2).map((item) => (
                <div key={`unassigned-${item.id}`} className="border p-2 text-xs">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted-foreground">Needs assignment</p>
                </div>
              ))}
              {atRiskFields.slice(0, 2).map((item) => (
                <div key={`risk-${item.id}`} className="border p-2 text-xs">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted-foreground">At risk, prioritize follow-up updates</p>
                </div>
              ))}
              {staleFields.slice(0, 2).map((item) => (
                <div key={`stale-${item.id}`} className="border p-2 text-xs">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted-foreground">No recent update in the last 7 days</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Agent Action Board</CardTitle>
            <CardDescription>Stay on cadence and keep your assigned fields moving.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className={`p-2 text-xs ${objectiveClasses(staleFields.length === 0)}`}>
                <p className="font-medium">Update Stale Fields</p>
                <p className="text-muted-foreground">Stale/no updates: {staleFields.length}</p>
              </div>
              <div className={`p-2 text-xs ${objectiveClasses(atRiskFields.length === 0)}`}>
                <p className="font-medium">Address At-Risk Fields</p>
                <p className="text-muted-foreground">At risk: {atRiskFields.length}</p>
              </div>
              <div className={`p-2 text-xs ${objectiveClasses(readyFields.length === 0)}`}>
                <p className="font-medium">Close Ready Stages</p>
                <p className="text-muted-foreground">Ready to harvest: {readyFields.length}</p>
              </div>
              <div className={`p-2 text-xs ${objectiveClasses(recentlyUpdatedCount === fields.length || fields.length === 0)}`}>
                <p className="font-medium">Keep Daily Momentum</p>
                <p className="text-muted-foreground">Updated in 48h: {recentlyUpdatedCount}/{fields.length}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold">Your Priorities</p>
              {atRiskFields.length === 0 && staleFields.length === 0 ? (
                <p className="border p-2 text-xs text-muted-foreground">Great job. No urgent actions right now.</p>
              ) : null}
              {[...atRiskFields, ...staleFields]
                .filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index)
                .slice(0, 4)
                .map((item) => (
                  <div key={`agent-priority-${item.id}`} className="border p-2 text-xs">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground">
                      {item.status === "at_risk"
                        ? "At risk - submit a detailed update and note."
                        : "No recent update - log current stage and observations."}
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {dashboard.role === "admin" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Create Field</CardTitle>
              <CardDescription>Add a new field for the season.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateField} className="grid gap-3 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="field-name">Field Name</Label>
                  <Input
                    id="field-name"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.currentTarget.value)}
                    placeholder="North Plot"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="field-crop">Crop Type</Label>
                  <Input
                    id="field-crop"
                    value={newFieldCropType}
                    onChange={(e) => setNewFieldCropType(e.currentTarget.value)}
                    placeholder="Maize"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="field-date">Planting Date</Label>
                  <Input
                    id="field-date"
                    type="date"
                    value={newFieldPlantingDate}
                    onChange={(e) => setNewFieldPlantingDate(e.currentTarget.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" className="w-full">
                    Create
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Updates</CardTitle>
              <CardDescription>Latest field activity from agents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(dashboard as Extract<DashboardResponse, { role: "admin" }>).updates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No updates yet.</p>
              ) : (
                (dashboard as Extract<DashboardResponse, { role: "admin" }>).updates.map((update) => (
                  <div key={update.id} className="border p-2 text-xs">
                    <p className="font-medium">{update.fieldName}</p>
                    <p>
                      {update.stage} by {update.userName} on {new Date(update.createdAt).toLocaleString()}
                    </p>
                    {update.notes ? <p className="text-muted-foreground">{update.notes}</p> : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{dashboard.role === "admin" ? "All Fields" : "Assigned Fields"}</CardTitle>
          <CardDescription>
            {dashboard.role === "admin"
              ? "Create, assign, and monitor season progress."
              : "Update stages and observations for your assigned fields."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.length === 0 ? <p className="text-sm text-muted-foreground">No fields available yet.</p> : null}

          {fields.map((fieldItem) => {
            const agentDashboard = dashboard as AgentDashboard;
            const updateDraft = updates[fieldItem.id] ?? defaultUpdateDraft(fieldItem.stage);
            const editDraft = edits[fieldItem.id];
            const isHistoryVisible = historyVisible[fieldItem.id];
            const isHistoryLoading = historyLoading[fieldItem.id];
            const history = historyByField[fieldItem.id] ?? [];

            return (
              <div key={fieldItem.id} className="space-y-3 border p-3">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{fieldItem.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {fieldItem.cropType} | planted {new Date(fieldItem.plantingDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="border px-2 py-1">Stage: {fieldItem.stage}</span>
                    <span className={`px-2 py-1 ${statusClasses(fieldItem.status)}`}>
                      Status: {fieldItem.status}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Assigned: {fieldItem.assignments.length === 0 ? "none" : fieldItem.assignments.map((a) => a.name).join(", ")}
                </div>

                {fieldItem.latestUpdate ? (
                  <p className="text-xs text-muted-foreground">
                    Last update: {fieldItem.latestUpdate.stage} by {fieldItem.latestUpdate.userName} on{" "}
                    {new Date(fieldItem.latestUpdate.createdAt).toLocaleString()}
                  </p>
                ) : null}

                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => void toggleHistory(fieldItem.id)}>
                    {isHistoryVisible ? "Hide History" : "Show History"}
                  </Button>
                </div>

                {isHistoryVisible ? (
                  <div className="space-y-2 border p-2">
                    {isHistoryLoading ? <p className="text-xs text-muted-foreground">Loading history...</p> : null}
                    {!isHistoryLoading && history.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No updates recorded for this field yet.</p>
                    ) : null}
                    {!isHistoryLoading
                      ? history.map((item) => (
                          <div key={item.id} className="border p-2 text-xs">
                            <p>
                              <span className="font-medium">{item.stage}</span> by {item.userName} on{" "}
                              {new Date(item.createdAt).toLocaleString()}
                            </p>
                            {item.notes ? <p className="text-muted-foreground">{item.notes}</p> : null}
                          </div>
                        ))
                      : null}
                  </div>
                ) : null}

                {dashboard.role === "admin" ? (
                  <div className="space-y-3 border p-2">
                    <p className="text-xs font-semibold">Admin Controls</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor={`name-${fieldItem.id}`}>Field Name</Label>
                        <Input
                          id={`name-${fieldItem.id}`}
                          value={editDraft?.name ?? ""}
                          onChange={(e) =>
                            setEdits((current) => ({
                              ...current,
                              [fieldItem.id]: {
                                name: e.currentTarget.value,
                                cropType: editDraft?.cropType ?? fieldItem.cropType,
                                plantingDate: editDraft?.plantingDate ?? toDateInput(fieldItem.plantingDate),
                                stage: editDraft?.stage ?? fieldItem.stage,
                              },
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`crop-${fieldItem.id}`}>Crop Type</Label>
                        <Input
                          id={`crop-${fieldItem.id}`}
                          value={editDraft?.cropType ?? ""}
                          onChange={(e) =>
                            setEdits((current) => ({
                              ...current,
                              [fieldItem.id]: {
                                name: editDraft?.name ?? fieldItem.name,
                                cropType: e.currentTarget.value,
                                plantingDate: editDraft?.plantingDate ?? toDateInput(fieldItem.plantingDate),
                                stage: editDraft?.stage ?? fieldItem.stage,
                              },
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`date-${fieldItem.id}`}>Planting Date</Label>
                        <Input
                          id={`date-${fieldItem.id}`}
                          type="date"
                          value={editDraft?.plantingDate ?? ""}
                          onChange={(e) =>
                            setEdits((current) => ({
                              ...current,
                              [fieldItem.id]: {
                                name: editDraft?.name ?? fieldItem.name,
                                cropType: editDraft?.cropType ?? fieldItem.cropType,
                                plantingDate: e.currentTarget.value,
                                stage: editDraft?.stage ?? fieldItem.stage,
                              },
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`stage-${fieldItem.id}`}>Current Stage</Label>
                        <select
                          id={`stage-${fieldItem.id}`}
                          className="h-8 w-full border bg-background px-2 text-xs"
                          value={editDraft?.stage ?? fieldItem.stage}
                          onChange={(e) =>
                            setEdits((current) => ({
                              ...current,
                              [fieldItem.id]: {
                                name: editDraft?.name ?? fieldItem.name,
                                cropType: editDraft?.cropType ?? fieldItem.cropType,
                                plantingDate: editDraft?.plantingDate ?? toDateInput(fieldItem.plantingDate),
                                stage: e.currentTarget.value as FieldStage,
                              },
                            }))
                          }
                        >
                          {STAGE_OPTIONS.map((stage) => (
                            <option key={stage} value={stage}>
                              {stage}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                      <select
                        className="h-8 border bg-background px-2 text-xs"
                        value={assignments[fieldItem.id] ?? ""}
                        onChange={(e) =>
                          setAssignments((current) => ({
                            ...current,
                            [fieldItem.id]: e.currentTarget.value,
                          }))
                        }
                      >
                        <option value="">Select agent...</option>
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name} ({agent.email})
                          </option>
                        ))}
                      </select>
                      <Button variant="outline" onClick={() => void handleAssignField(fieldItem.id)}>
                        Assign Agent
                      </Button>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={() => void handleSaveField(fieldItem.id)}>Save Field Details</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid gap-2 md:grid-cols-2">
                      <select
                        className="h-8 border bg-background px-2 text-xs"
                        value={updateDraft.stage}
                        onChange={(e) => {
                          const nextStage = e.currentTarget.value as FieldStage;
                          setUpdates((current) => ({
                            ...current,
                            [fieldItem.id]: {
                              ...updateDraft,
                              stage: nextStage,
                            },
                          }));
                        }}
                      >
                        {STAGE_OPTIONS.map((stage) => (
                          <option key={stage} value={stage}>
                            {stage}
                          </option>
                        ))}
                      </select>
                      <Button
                        onClick={() => void handleSubmitUpdate(fieldItem.id)}
                        disabled={agentDashboard.role !== "agent"}
                      >
                        Save Update
                      </Button>
                    </div>

                    <textarea
                      className="w-full border bg-background px-2 py-1 text-xs"
                      rows={3}
                      placeholder="Notes or observations"
                      value={updateDraft.notes}
                      onChange={(e) =>
                        setUpdates((current) => ({
                          ...current,
                          [fieldItem.id]: {
                            ...updateDraft,
                            notes: e.currentTarget.value,
                          },
                        }))
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
