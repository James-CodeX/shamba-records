import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type ReactNode } from "react";

import { authClient } from "@/lib/auth-client";

import { DashboardApp } from "./dashboard-app";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect("/login");
  }

  return <DashboardApp>{children}</DashboardApp>;
}
