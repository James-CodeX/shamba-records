"use client";

import { Alert, AlertDescription, AlertTitle } from "@my-better-t-app/ui/components/alert";
import { Card, CardHeader } from "@my-better-t-app/ui/components/card";
import { Separator } from "@my-better-t-app/ui/components/separator";
import { Skeleton } from "@my-better-t-app/ui/components/skeleton";
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
  type FieldSummary,
  type FieldUpdateEntry,
} from "@/lib/api-client";

import { DashboardAdminActivity } from "./components/dashboard-admin-activity";
import { DashboardFields } from "./components/dashboard-fields";
import { DashboardOverview } from "./components/dashboard-overview";
import { DashboardShell } from "./components/dashboard-shell";
import { defaultUpdateDraft, getAgeInDays, toDateInput, type EditDraft, type UpdateDraft } from "./dashboard-model";

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
      return { active: 0, completed: 0 };
    }

    return dashboard.statusBreakdown;
  }, [dashboard]);

  const unassignedFields = useMemo(() => fields.filter((item) => item.assignments.length === 0), [fields]);

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

  return (
    <DashboardShell
      userName={user.name}
      isAdmin={isAdmin}
      activeNav={activeNav}
      setActiveNav={setActiveNav}
      onRefresh={() => loadData(false)}
      isRefreshing={isRefreshing}
      onSignOut={signOut}
    >
      <DashboardOverview
        userName={user.name}
        role={dashboard.role}
        primaryCount={isAdmin ? dashboard.totalFields : dashboard.assignedFields}
        primaryLabel={isAdmin ? "Total fields" : "Assigned fields"}
        statusTotals={statusTotals}
        fieldsCount={fields.length}
        recentlyUpdatedCount={recentlyUpdatedCount}
        unassignedFields={unassignedFields}
        staleFields={staleFields}
        readyFields={readyFields}
        error={error}
      />

      <Separator />

      {isAdmin ? (
        <DashboardAdminActivity
          newFieldName={newFieldName}
          setNewFieldName={setNewFieldName}
          newFieldCropType={newFieldCropType}
          setNewFieldCropType={setNewFieldCropType}
          newFieldPlantingDate={newFieldPlantingDate}
          setNewFieldPlantingDate={setNewFieldPlantingDate}
          adminUpdates={adminUpdates}
          handleCreateField={handleCreateField}
        />
      ) : null}

      <DashboardFields
        isAdmin={isAdmin}
        fields={fields}
        updates={updates}
        setUpdates={setUpdates}
        edits={edits}
        setEdits={setEdits}
        assignments={assignments}
        setAssignments={setAssignments}
        agents={agents}
        historyByField={historyByField}
        historyVisible={historyVisible}
        historyLoading={historyLoading}
        toggleHistory={toggleHistory}
        handleAssignField={handleAssignField}
        handleSaveField={handleSaveField}
        handleSubmitUpdate={handleSubmitUpdate}
      />
    </DashboardShell>
  );
}
