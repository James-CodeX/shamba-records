"use client";

import { DashboardFields } from "../components/dashboard-fields";
import { useDashboard } from "../dashboard-context";

export default function DashboardFieldsPage() {
  const {
    user,
    dashboard,
    isAdmin,
    fields,
    updates,
    setUpdates,
    edits,
    setEdits,
    assignments,
    setAssignments,
    agents,
    historyByField,
    historyVisible,
    historyLoading,
    toggleHistory,
    handleAssignField,
    handleSaveField,
    handleSubmitUpdate,
  } = useDashboard();

  if (!user || !dashboard) {
    return null;
  }

  return (
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
  );
}
