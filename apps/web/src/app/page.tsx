import { Button } from "@my-better-t-app/ui/components/button";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative mx-auto flex min-h-[calc(100svh-48px)] w-full max-w-5xl items-center px-6 py-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--foreground)/0.07),transparent_35%),radial-gradient(circle_at_80%_70%,hsl(var(--foreground)/0.05),transparent_30%)]" />
      <section className="mx-auto w-full max-w-3xl space-y-8 border border-border/60 bg-background/80 p-8 backdrop-blur-sm md:p-12">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">SmartSeason</p>
        <h1 className="text-balance text-4xl font-semibold leading-tight md:text-5xl">
          Field monitoring for fast seasonal decisions.
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Manage fields, assign agents, and track progress from planted to harvested with one focused dashboard.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/dashboard">
            <Button>Open Dashboard</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline">Sign In</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
