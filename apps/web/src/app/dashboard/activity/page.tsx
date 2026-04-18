"use client";

import { Alert, AlertDescription, AlertTitle } from "@my-better-t-app/ui/components/alert";

import { DashboardAdminActivity } from "../components/dashboard-admin-activity";
import { useDashboard } from "../dashboard-context";

export default function DashboardActivityPage() {
  const {
    user,
    dashboard,
    isAdmin,
    newFieldName,
    setNewFieldName,
    newFieldCropType,
    setNewFieldCropType,
    newFieldPlantingDate,
    setNewFieldPlantingDate,
    adminUpdates,
    handleCreateField,
  } = useDashboard();

  if (!user || !dashboard) {
    return null;
  }

  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Access Restricted</AlertTitle>
        <AlertDescription>Only admins can access activity.</AlertDescription>
      </Alert>
    );
  }

  return (
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
  );
}
