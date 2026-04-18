"use client";

import { Alert, AlertDescription, AlertTitle } from "@my-better-t-app/ui/components/alert";
import { Avatar, AvatarFallback } from "@my-better-t-app/ui/components/avatar";
import { Badge } from "@my-better-t-app/ui/components/badge";
import { Button } from "@my-better-t-app/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@my-better-t-app/ui/components/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@my-better-t-app/ui/components/field";
import { Input } from "@my-better-t-app/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@my-better-t-app/ui/components/native-select";
import { Separator } from "@my-better-t-app/ui/components/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@my-better-t-app/ui/components/sidebar";
import { Skeleton } from "@my-better-t-app/ui/components/skeleton";
import { Textarea } from "@my-better-t-app/ui/components/textarea";
import {
  AlertTriangleIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  LogOutIcon,
  RefreshCcwIcon,
  SproutIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import {
  assignField,
  createField,
  createFieldUpdate,
  getAgents,
  getCurrentUser,
  getDashboard,
  getFieldUpdates,
  getFields,
  updateField,
  type ApiUser,
  type DashboardResponse,
  type FieldStage,
  type FieldSummary,
  type FieldUpdateEntry,
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

function getAgeInDays(isoDate: string) {
  const now = Date.now();
  const then = new Date(isoDate).getTime();

  if (Number.isNaN(then)) {
    return Number.POSITIVE_INFINITY;
  }

  return (now - then) / (1000 * 60 * 60 * 24);
}

function statusVariant(status: FieldSummary["status"]) {
  if (status === "at_risk") {
    return "destructive" as const;
  }

  if (status === "completed") {
    return "default" as const;
  }

  return "secondary" as const;
}

function initialsFromName(name: string) {
  const parts = name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "");

  return parts.join("") || "U";
}

export default function Dashboard() {
  const router = useRouter();

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

  const [activeNav, setActiveNav] = useState<"overview" | "fields" | "activity">("overview");

  async function loadData(initial = false) {
    if (initial) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setError(null);

    try {
      const [me, dashboardData, fieldsData] = await Promise.all([getCurrentUser(), getDashboard(), getFields()]);

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

  const unassignedFields = useMemo(() => fields.filter((item) => item.assignments.length === 0), [fields]);

  const atRiskFields = useMemo(() => fields.filter((item) => item.status === "at_risk"), [fields]);

  const readyFields = useMemo(() => fields.filter((item) => item.stage === "ready"), [fields]);

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

  async function handleCreateField(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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

  function signOut() {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
        },
      },
    });
  }

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-5xl items-center px-4 py-10">
        <div className="grid w-full gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-20" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-20" />
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-20" />
            </CardHeader>
          </Card>
        </div>
      </main>
    );
  }

  if (!user || !dashboard) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-4xl items-center px-4 py-10">
        <Alert variant="destructive">
          <AlertTitle>Unable to Load Dashboard</AlertTitle>
          <AlertDescription>{error || "Something went wrong while loading dashboard data."}</AlertDescription>
        </Alert>
      </main>
    );
  }

  const isAdmin = dashboard.role === "admin";
  const adminUpdates = dashboard.role === "admin" ? dashboard.updates : [];

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboardIcon },
    { id: "fields", label: "Fields", icon: SproutIcon },
    { id: "activity", label: "Activity", icon: ClipboardListIcon },
  ] as const;

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" isActive>
                <Avatar size="sm">
                  <AvatarFallback>{initialsFromName(user.name)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{user.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarSeparator />

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      render={<a href={`#${item.id}`} />}
                      isActive={activeNav === item.id}
                      onClick={() => setActiveNav(item.id)}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Role</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive>
                    <ListChecksIcon />
                    <span>{isAdmin ? "Admin Operations" : "Agent Operations"}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <Button variant="outline" onClick={signOut}>
            <LogOutIcon data-icon="inline-start" />
            Sign Out
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center justify-between px-4 md:px-6">
          <SidebarTrigger />
          <Button variant="outline" onClick={() => void loadData(false)} disabled={isRefreshing}>
            <RefreshCcwIcon data-icon="inline-start" className={isRefreshing ? "animate-spin" : undefined} />
            {isRefreshing ? "Refreshing" : "Refresh"}
          </Button>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <section id="overview" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-semibold">Season Dashboard</h1>
                <p className="text-xs text-muted-foreground">Signed in as {user.name}</p>
              </div>
              <Badge variant="outline">{dashboard.role}</Badge>
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertTriangleIcon />
                <AlertTitle>Data Sync Problem</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-3 md:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle>{isAdmin ? dashboard.totalFields : dashboard.assignedFields}</CardTitle>
                  <CardDescription>{isAdmin ? "Total fields" : "Assigned fields"}</CardDescription>
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

            <Card>
              <CardHeader>
                <CardTitle>{isAdmin ? "Admin Mission Board" : "Agent Action Board"}</CardTitle>
                <CardDescription>
                  {isAdmin
                    ? "Focus on assignment, risk mitigation, and update freshness."
                    : "Stay on cadence and keep assigned fields moving."}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
                <div className="grid gap-2 sm:grid-cols-2">
                  {isAdmin ? (
                    <>
                      <Card>
                        <CardHeader>
                          <CardTitle>Assign Unassigned Fields</CardTitle>
                          <CardDescription>Pending: {unassignedFields.length}</CardDescription>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle>Reduce At-Risk Fields</CardTitle>
                          <CardDescription>At risk: {atRiskFields.length}</CardDescription>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle>Keep Updates Fresh</CardTitle>
                          <CardDescription>Stale/no updates: {staleFields.length}</CardDescription>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle>Close Ready Fields</CardTitle>
                          <CardDescription>Ready to harvest: {readyFields.length}</CardDescription>
                        </CardHeader>
                      </Card>
                    </>
                  ) : (
                    <>
                      <Card>
                        <CardHeader>
                          <CardTitle>Update Stale Fields</CardTitle>
                          <CardDescription>Stale/no updates: {staleFields.length}</CardDescription>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle>Address At-Risk Fields</CardTitle>
                          <CardDescription>At risk: {atRiskFields.length}</CardDescription>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle>Close Ready Stages</CardTitle>
                          <CardDescription>Ready to harvest: {readyFields.length}</CardDescription>
                        </CardHeader>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle>Keep Daily Momentum</CardTitle>
                          <CardDescription>
                            Updated in 48h: {recentlyUpdatedCount}/{fields.length}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </>
                  )}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>{isAdmin ? "Priority Queue" : "Your Priorities"}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {isAdmin && unassignedFields.length === 0 && atRiskFields.length === 0 && staleFields.length === 0 ? (
                      <p className="text-xs text-muted-foreground">All key admin objectives are currently on track.</p>
                    ) : null}

                    {!isAdmin && atRiskFields.length === 0 && staleFields.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Great job. No urgent actions right now.</p>
                    ) : null}

                    {(isAdmin ? [...unassignedFields, ...atRiskFields, ...staleFields] : [...atRiskFields, ...staleFields])
                      .filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index)
                      .slice(0, 4)
                      .map((item) => (
                        <Card key={`priority-${item.id}`}>
                          <CardHeader>
                            <CardTitle>{item.name}</CardTitle>
                            <CardDescription>
                              {item.status === "at_risk"
                                ? "At risk - prioritize with fresh notes."
                                : item.assignments.length === 0
                                 ? "Needs assignment."
                                 : "No recent updates in the last 7 days."}
                            </CardDescription>
                          </CardHeader>
                        </Card>
                      ))}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {isAdmin ? (
            <section id="activity" className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Create Field</CardTitle>
                  <CardDescription>Add a new field for the season.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateField} className="flex flex-col gap-3">
                    <FieldGroup className="grid gap-3 md:grid-cols-4">
                      <Field>
                        <FieldLabel htmlFor="field-name">Field Name</FieldLabel>
                        <Input
                          id="field-name"
                          value={newFieldName}
                          onChange={(event) => setNewFieldName(event.currentTarget.value)}
                          placeholder="North Plot"
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="field-crop">Crop Type</FieldLabel>
                        <Input
                          id="field-crop"
                          value={newFieldCropType}
                          onChange={(event) => setNewFieldCropType(event.currentTarget.value)}
                          placeholder="Maize"
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="field-date">Planting Date</FieldLabel>
                        <Input
                          id="field-date"
                          type="date"
                          value={newFieldPlantingDate}
                          onChange={(event) => setNewFieldPlantingDate(event.currentTarget.value)}
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="field-submit">Action</FieldLabel>
                        <Button id="field-submit" type="submit">
                          Create Field
                        </Button>
                      </Field>
                    </FieldGroup>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Updates</CardTitle>
                  <CardDescription>Latest field activity from agents.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {adminUpdates.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No updates yet.</p>
                  ) : (
                    adminUpdates.map((update) => (
                      <Card key={update.id}>
                        <CardHeader>
                          <CardTitle>{update.fieldName}</CardTitle>
                          <CardDescription>
                            {update.stage} by {update.userName} on {new Date(update.createdAt).toLocaleString()}
                          </CardDescription>
                        </CardHeader>
                        {update.notes ? (
                          <CardContent>
                            <p className="text-xs text-muted-foreground">{update.notes}</p>
                          </CardContent>
                        ) : null}
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            </section>
          ) : null}

          <section id="fields" className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{isAdmin ? "All Fields" : "Assigned Fields"}</CardTitle>
                <CardDescription>
                  {isAdmin
                    ? "Create, assign, and monitor season progress."
                    : "Update stages and observations for your assigned fields."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {fields.length === 0 ? <p className="text-xs text-muted-foreground">No fields available yet.</p> : null}

                {fields.map((fieldItem) => {
                  const updateDraft = updates[fieldItem.id] ?? defaultUpdateDraft(fieldItem.stage);
                  const editDraft = edits[fieldItem.id];
                  const isHistoryVisible = historyVisible[fieldItem.id];
                  const isFieldHistoryLoading = historyLoading[fieldItem.id];
                  const history = historyByField[fieldItem.id] ?? [];

                  return (
                    <Card key={fieldItem.id}>
                      <CardHeader className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-col gap-1">
                            <CardTitle>{fieldItem.name}</CardTitle>
                            <CardDescription>
                              {fieldItem.cropType} | planted {new Date(fieldItem.plantingDate).toLocaleDateString()}
                            </CardDescription>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">Stage: {fieldItem.stage}</Badge>
                            <Badge variant={statusVariant(fieldItem.status)}>{fieldItem.status}</Badge>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Assigned: {fieldItem.assignments.length === 0 ? "none" : fieldItem.assignments.map((a) => a.name).join(", ")}
                        </p>

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
                      </CardHeader>

                      {isHistoryVisible ? (
                        <CardContent className="flex flex-col gap-2">
                          {isFieldHistoryLoading ? <p className="text-xs text-muted-foreground">Loading history...</p> : null}

                          {!isFieldHistoryLoading && history.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No updates recorded for this field yet.</p>
                          ) : null}

                          {!isFieldHistoryLoading
                            ? history.map((item) => (
                                <Card key={item.id}>
                                  <CardHeader>
                                    <CardTitle>{item.stage}</CardTitle>
                                    <CardDescription>
                                      by {item.userName} on {new Date(item.createdAt).toLocaleString()}
                                    </CardDescription>
                                  </CardHeader>
                                  {item.notes ? (
                                    <CardContent>
                                      <p className="text-xs text-muted-foreground">{item.notes}</p>
                                    </CardContent>
                                  ) : null}
                                </Card>
                              ))
                            : null}
                        </CardContent>
                      ) : null}

                      <CardContent className="flex flex-col gap-3">
                        {isAdmin ? (
                          <Card>
                            <CardHeader>
                              <CardTitle>Admin Controls</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3">
                              <FieldGroup className="grid gap-3 md:grid-cols-2">
                                <Field>
                                  <FieldLabel htmlFor={`name-${fieldItem.id}`}>Field Name</FieldLabel>
                                  <Input
                                    id={`name-${fieldItem.id}`}
                                    value={editDraft?.name ?? ""}
                                    onChange={(event) =>
                                      setEdits((current) => ({
                                        ...current,
                                        [fieldItem.id]: {
                                          name: event.currentTarget.value,
                                          cropType: editDraft?.cropType ?? fieldItem.cropType,
                                          plantingDate: editDraft?.plantingDate ?? toDateInput(fieldItem.plantingDate),
                                          stage: editDraft?.stage ?? fieldItem.stage,
                                        },
                                      }))
                                    }
                                  />
                                </Field>

                                <Field>
                                  <FieldLabel htmlFor={`crop-${fieldItem.id}`}>Crop Type</FieldLabel>
                                  <Input
                                    id={`crop-${fieldItem.id}`}
                                    value={editDraft?.cropType ?? ""}
                                    onChange={(event) =>
                                      setEdits((current) => ({
                                        ...current,
                                        [fieldItem.id]: {
                                          name: editDraft?.name ?? fieldItem.name,
                                          cropType: event.currentTarget.value,
                                          plantingDate: editDraft?.plantingDate ?? toDateInput(fieldItem.plantingDate),
                                          stage: editDraft?.stage ?? fieldItem.stage,
                                        },
                                      }))
                                    }
                                  />
                                </Field>

                                <Field>
                                  <FieldLabel htmlFor={`date-${fieldItem.id}`}>Planting Date</FieldLabel>
                                  <Input
                                    id={`date-${fieldItem.id}`}
                                    type="date"
                                    value={editDraft?.plantingDate ?? ""}
                                    onChange={(event) =>
                                      setEdits((current) => ({
                                        ...current,
                                        [fieldItem.id]: {
                                          name: editDraft?.name ?? fieldItem.name,
                                          cropType: editDraft?.cropType ?? fieldItem.cropType,
                                          plantingDate: event.currentTarget.value,
                                          stage: editDraft?.stage ?? fieldItem.stage,
                                        },
                                      }))
                                    }
                                  />
                                </Field>

                                <Field>
                                  <FieldLabel htmlFor={`stage-${fieldItem.id}`}>Current Stage</FieldLabel>
                                  <NativeSelect
                                    id={`stage-${fieldItem.id}`}
                                    className="w-full"
                                    value={editDraft?.stage ?? fieldItem.stage}
                                    onChange={(event) =>
                                      setEdits((current) => ({
                                        ...current,
                                        [fieldItem.id]: {
                                          name: editDraft?.name ?? fieldItem.name,
                                          cropType: editDraft?.cropType ?? fieldItem.cropType,
                                          plantingDate: editDraft?.plantingDate ?? toDateInput(fieldItem.plantingDate),
                                          stage: event.currentTarget.value as FieldStage,
                                        },
                                      }))
                                    }
                                  >
                                    {STAGE_OPTIONS.map((stage) => (
                                      <NativeSelectOption key={stage} value={stage}>
                                        {stage}
                                      </NativeSelectOption>
                                    ))}
                                  </NativeSelect>
                                </Field>
                              </FieldGroup>

                              <FieldGroup className="grid gap-3 md:grid-cols-[1fr_auto]">
                                <Field>
                                  <FieldLabel htmlFor={`assign-${fieldItem.id}`}>Assign Agent</FieldLabel>
                                  <NativeSelect
                                    id={`assign-${fieldItem.id}`}
                                    className="w-full"
                                    value={assignments[fieldItem.id] ?? ""}
                                    onChange={(event) =>
                                      setAssignments((current) => ({
                                        ...current,
                                        [fieldItem.id]: event.currentTarget.value,
                                      }))
                                    }
                                  >
                                    <NativeSelectOption value="">Select agent...</NativeSelectOption>
                                    {agents.map((agent) => (
                                      <NativeSelectOption key={agent.id} value={agent.id}>
                                        {agent.name} ({agent.email})
                                      </NativeSelectOption>
                                    ))}
                                  </NativeSelect>
                                </Field>

                                <Field>
                                  <FieldLabel htmlFor={`assign-action-${fieldItem.id}`}>Action</FieldLabel>
                                  <Button
                                    id={`assign-action-${fieldItem.id}`}
                                    variant="outline"
                                    onClick={() => void handleAssignField(fieldItem.id)}
                                  >
                                    Assign Agent
                                  </Button>
                                </Field>
                              </FieldGroup>

                              <Button onClick={() => void handleSaveField(fieldItem.id)}>Save Field Details</Button>
                            </CardContent>
                          </Card>
                        ) : (
                          <Card>
                            <CardHeader>
                              <CardTitle>Agent Update</CardTitle>
                              <CardDescription>Capture latest stage and field observations.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3">
                              <FieldGroup className="grid gap-3 md:grid-cols-2">
                                <Field>
                                  <FieldLabel htmlFor={`agent-stage-${fieldItem.id}`}>Stage</FieldLabel>
                                  <NativeSelect
                                    id={`agent-stage-${fieldItem.id}`}
                                    className="w-full"
                                    value={updateDraft.stage}
                                    onChange={(event) => {
                                      const nextStage = event.currentTarget.value as FieldStage;
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
                                      <NativeSelectOption key={stage} value={stage}>
                                        {stage}
                                      </NativeSelectOption>
                                    ))}
                                  </NativeSelect>
                                </Field>

                                <Field>
                                  <FieldLabel htmlFor={`agent-action-${fieldItem.id}`}>Action</FieldLabel>
                                  <Button id={`agent-action-${fieldItem.id}`} onClick={() => void handleSubmitUpdate(fieldItem.id)}>
                                    Save Update
                                  </Button>
                                </Field>
                              </FieldGroup>

                              <Field>
                                <FieldLabel htmlFor={`agent-notes-${fieldItem.id}`}>Notes</FieldLabel>
                                <Textarea
                                  id={`agent-notes-${fieldItem.id}`}
                                  placeholder="Notes or observations"
                                  value={updateDraft.notes}
                                  onChange={(event) =>
                                    setUpdates((current) => ({
                                      ...current,
                                      [fieldItem.id]: {
                                        ...updateDraft,
                                        notes: event.currentTarget.value,
                                      },
                                    }))
                                  }
                                />
                                <FieldDescription>Include weather impact, pest risk, or growth quality notes.</FieldDescription>
                              </Field>
                            </CardContent>
                          </Card>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>
          </section>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
