"use client";

import { Alert, AlertDescription, AlertTitle } from "@my-better-t-app/ui/components/alert";

import { DashboardUsers } from "../components/dashboard-users";
import { useDashboard } from "../dashboard-context";

export default function DashboardUsersPage() {
  const { user, dashboard, isAdmin } = useDashboard();

  if (!user || !dashboard) {
    return null;
  }

  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Access Restricted</AlertTitle>
        <AlertDescription>Only admins can access users management.</AlertDescription>
      </Alert>
    );
  }

  return <DashboardUsers currentUserId={user.id} />;
}
