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
import { ClipboardListIcon, LayoutDashboardIcon, ListChecksIcon, LogOutIcon, RefreshCcwIcon, SproutIcon } from "lucide-react";
import { type ReactNode } from "react";

import { initialsFromName } from "../dashboard-model";

type DashboardNav = "overview" | "fields" | "activity";

type DashboardShellProps = {
  userName: string;
  isAdmin: boolean;
  activeNav: DashboardNav;
  setActiveNav: (value: DashboardNav) => void;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  onSignOut: () => void;
  children: ReactNode;
};

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboardIcon },
  { id: "fields", label: "Fields", icon: SproutIcon },
  { id: "activity", label: "Activity", icon: ClipboardListIcon },
] as const;

export function DashboardShell({
  userName,
  isAdmin,
  activeNav,
  setActiveNav,
  onRefresh,
  isRefreshing,
  onSignOut,
  children,
}: DashboardShellProps) {
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
                    <SidebarMenuButton
                      render={<a href={`#${item.id}`} />}
                      isActive={activeNav === item.id}
                      onClick={() => setActiveNav(item.id)}
                    >
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
