"use client";

import { Button } from "@my-better-t-app/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@my-better-t-app/ui/components/card";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getCurrentUser, getDashboard } from "@/lib/api-client";

type HomeSummary = {
  role: "admin" | "agent";
  primaryCount: number;
  active: number;
  atRisk: number;
  completed: number;
};

export default function Home() {
  const [summary, setSummary] = useState<HomeSummary | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSummary() {
      try {
        const [me, dashboard] = await Promise.all([getCurrentUser(), getDashboard()]);

        if (!active) {
          return;
        }

        setSummary({
          role: me.user.role,
          primaryCount: dashboard.role === "admin" ? dashboard.totalFields : dashboard.assignedFields,
          active: dashboard.statusBreakdown.active,
          atRisk: dashboard.statusBreakdown.atRisk,
          completed: dashboard.statusBreakdown.completed,
        });
      } catch {
        if (!active) {
          return;
        }

        setSummary(null);
      }
    }

    void loadSummary();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
      <section className="grid gap-6 border p-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">SmartSeason Field Monitoring</p>
          <h1 className="text-3xl font-semibold leading-tight">Track every field from planting to harvest.</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Coordinate admins and field agents with assignment workflows, stage updates, notes, and risk visibility across the entire growing season.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link href="/dashboard">
              <Button>Open Dashboard</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
          </div>
        </div>

        <Card className="border-0 ring-0">
          <CardHeader>
            <CardTitle>Live Snapshot</CardTitle>
            <CardDescription>
              {summary ? `Your role: ${summary.role}` : "Sign in to see live season metrics"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-xs">
            <div className="border p-3">
              <p className="text-muted-foreground">Fields</p>
              <p className="pt-1 text-2xl font-semibold">{summary?.primaryCount ?? "-"}</p>
            </div>
            <div className="border p-3">
              <p className="text-muted-foreground">At Risk</p>
              <p className="pt-1 text-2xl font-semibold">{summary?.atRisk ?? "-"}</p>
            </div>
            <div className="border p-3">
              <p className="text-muted-foreground">Active</p>
              <p className="pt-1 text-2xl font-semibold">{summary?.active ?? "-"}</p>
            </div>
            <div className="border p-3">
              <p className="text-muted-foreground">Completed</p>
              <p className="pt-1 text-2xl font-semibold">{summary?.completed ?? "-"}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Admin Coordinator</CardTitle>
            <CardDescription>Create and manage all fields.</CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Add fields, edit details, assign agents, and monitor updates across the entire operation from one dashboard.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Field Agent</CardTitle>
            <CardDescription>Update assigned fields only.</CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Record growth stages and notes from assigned fields so coordinators can act quickly on risks.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Tracking</CardTitle>
            <CardDescription>Dynamic backend risk logic.</CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Field status is computed from stage and planting age, highlighting active, at-risk, and completed progress.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
