"use client";

import { DashboardOverview } from "./components/dashboard-overview";
import { useDashboard } from "./dashboard-context";

export default function DashboardPage() {
  const {
    user,
    dashboard,
    statusTotals,
    fields,
    recentlyUpdatedCount,
    unassignedFields,
    staleFields,
    readyFields,
    error,
  } = useDashboard();

  if (!user || !dashboard) {
    return null;
  }

  return (
    <DashboardOverview
      userName={user.name}
      role={dashboard.role}
      primaryCount={dashboard.role === "admin" ? dashboard.totalFields : dashboard.assignedFields}
      primaryLabel={dashboard.role === "admin" ? "Total fields" : "Assigned fields"}
      statusTotals={statusTotals}
      fieldsCount={fields.length}
      recentlyUpdatedCount={recentlyUpdatedCount}
      unassignedFields={unassignedFields}
      staleFields={staleFields}
      readyFields={readyFields}
      error={error}
    />
  );
}
