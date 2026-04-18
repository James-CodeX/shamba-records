"use client";

import { Alert, AlertDescription, AlertTitle } from "@my-better-t-app/ui/components/alert";
import { Badge } from "@my-better-t-app/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@my-better-t-app/ui/components/card";
import { AlertTriangleIcon } from "lucide-react";

import { type FieldSummary } from "@/lib/api-client";

type DashboardOverviewProps = {
  userName: string;
  role: "admin" | "agent";
  primaryCount: number;
  primaryLabel: string;
  statusTotals: { active: number; completed: number };
  fieldsCount: number;
  recentlyUpdatedCount: number;
  unassignedFields: FieldSummary[];
  staleFields: FieldSummary[];
  readyFields: FieldSummary[];
  error: string | null;
};

export function DashboardOverview({
  userName,
  role,
  primaryCount,
  primaryLabel,
  statusTotals,
  fieldsCount,
  recentlyUpdatedCount,
  unassignedFields,
  staleFields,
  readyFields,
  error,
}: DashboardOverviewProps) {
  const isAdmin = role === "admin";

  return (
    <section id="overview" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Season Dashboard</h1>
          <p className="text-xs text-muted-foreground">Signed in as {userName}</p>
        </div>
        <Badge variant="outline">{role}</Badge>
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
            <CardTitle>{primaryCount}</CardTitle>
            <CardDescription>{primaryLabel}</CardDescription>
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
            <CardTitle>{readyFields.length}</CardTitle>
            <CardDescription>Ready</CardDescription>
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
              ? "Focus on assignment, harvest readiness, and update freshness."
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
                    <CardTitle>Prepare Ready Fields</CardTitle>
                    <CardDescription>Ready now: {readyFields.length}</CardDescription>
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
                    <CardTitle>Advance Active Fields</CardTitle>
                    <CardDescription>Active now: {statusTotals.active}</CardDescription>
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
                      Updated in 48h: {recentlyUpdatedCount}/{fieldsCount}
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
              {isAdmin && unassignedFields.length === 0 && staleFields.length === 0 ? (
                <p className="text-xs text-muted-foreground">All key admin objectives are currently on track.</p>
              ) : null}

              {!isAdmin && staleFields.length === 0 ? (
                <p className="text-xs text-muted-foreground">Great job. No urgent actions right now.</p>
              ) : null}

              {(isAdmin ? [...unassignedFields, ...staleFields, ...readyFields] : [...staleFields, ...readyFields])
                .filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index)
                .slice(0, 4)
                .map((item) => (
                  <Card key={`priority-${item.id}`}>
                    <CardHeader>
                      <CardTitle>{item.name}</CardTitle>
                      <CardDescription>
                        {item.assignments.length === 0
                          ? "Needs assignment."
                          : item.stage === "ready"
                            ? "Ready for harvest planning."
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
  );
}
