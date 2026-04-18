"use client";

import { Alert, AlertDescription, AlertTitle } from "@my-better-t-app/ui/components/alert";
import { Card, CardHeader } from "@my-better-t-app/ui/components/card";
import { Skeleton } from "@my-better-t-app/ui/components/skeleton";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { type DashboardNav, DashboardShell } from "./components/dashboard-shell";
import { DashboardProvider, useDashboard } from "./dashboard-context";

type DashboardAppProps = {
  children: ReactNode;
};

function activeNavFromPath(pathname: string): DashboardNav {
  if (pathname.startsWith("/dashboard/fields")) {
    return "fields";
  }

  if (pathname.startsWith("/dashboard/activity")) {
    return "activity";
  }

  if (pathname.startsWith("/dashboard/users")) {
    return "users";
  }

  return "overview";
}

function DashboardAppContent({ children }: DashboardAppProps) {
  const pathname = usePathname();
  const { isLoading, isRefreshing, error, user, dashboard, refresh, signOut } = useDashboard();

  return (
    <DashboardShell
      userName={user?.name ?? "Loading"}
      isAdmin={dashboard?.role === "admin"}
      activeNav={activeNavFromPath(pathname)}
      onRefresh={refresh}
      isRefreshing={isRefreshing}
      onSignOut={signOut}
    >
      {isLoading ? (
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
      ) : !user || !dashboard ? (
        <main className="mx-auto flex min-h-svh w-full max-w-4xl items-center px-4 py-10">
          <Alert variant="destructive">
            <AlertTitle>Unable to Load Dashboard</AlertTitle>
            <AlertDescription>{error || "Something went wrong while loading dashboard data."}</AlertDescription>
          </Alert>
        </main>
      ) : (
        children
      )}
    </DashboardShell>
  );
}

export function DashboardApp({ children }: DashboardAppProps) {
  return (
    <DashboardProvider>
      <DashboardAppContent>{children}</DashboardAppContent>
    </DashboardProvider>
  );
}
