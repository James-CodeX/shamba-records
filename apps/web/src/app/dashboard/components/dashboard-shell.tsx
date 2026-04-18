"use client";

import { Avatar, AvatarFallback } from "@my-better-t-app/ui/components/avatar";
import { Button } from "@my-better-t-app/ui/components/button";
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
import { ClipboardListIcon, LayoutDashboardIcon, ListChecksIcon, LogOutIcon, RefreshCcwIcon, SproutIcon, UsersIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";

import { initialsFromName } from "../dashboard-model";

export type DashboardNav = "overview" | "fields" | "activity" | "users";
type DashboardHref = "/dashboard" | "/dashboard/fields" | "/dashboard/activity" | "/dashboard/users";

type DashboardShellProps = {
  userName: string;
  isAdmin: boolean;
  activeNav: DashboardNav;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  onSignOut: () => void;
  children: ReactNode;
};

export function DashboardShell({
  userName,
  isAdmin,
  activeNav,
  onRefresh,
  isRefreshing,
  onSignOut,
  children,
}: DashboardShellProps) {
  const navItems: Array<{ id: DashboardNav; label: string; icon: LucideIcon; href: DashboardHref }> = isAdmin
    ? [
        { id: "overview", label: "Overview", icon: LayoutDashboardIcon, href: "/dashboard" },
        { id: "fields", label: "Fields", icon: SproutIcon, href: "/dashboard/fields" },
        { id: "activity", label: "Activity", icon: ClipboardListIcon, href: "/dashboard/activity" },
        { id: "users", label: "Users", icon: UsersIcon, href: "/dashboard/users" },
      ]
    : [
        { id: "overview", label: "Overview", icon: LayoutDashboardIcon, href: "/dashboard" },
        { id: "fields", label: "Fields", icon: SproutIcon, href: "/dashboard/fields" },
      ];

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" isActive>
                <Avatar size="sm">
                  <AvatarFallback>{initialsFromName(userName)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{userName}</span>
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
                    <SidebarMenuButton render={<Link href={item.href} />} isActive={activeNav === item.id}>
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
          <Button variant="outline" onClick={onSignOut}>
            <LogOutIcon data-icon="inline-start" />
            Sign Out
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center justify-between px-4 md:px-6">
          <SidebarTrigger />
          <Button variant="outline" onClick={() => void onRefresh()} disabled={isRefreshing}>
            <RefreshCcwIcon data-icon="inline-start" className={isRefreshing ? "animate-spin" : undefined} />
            {isRefreshing ? "Refreshing" : "Refresh"}
          </Button>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
