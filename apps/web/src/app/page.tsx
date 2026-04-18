import { Badge } from "@my-better-t-app/ui/components/badge";
import { Button } from "@my-better-t-app/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@my-better-t-app/ui/components/card";
import { Separator } from "@my-better-t-app/ui/components/separator";
import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl items-center px-4 py-10 md:px-6">
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-3">
          <Badge variant="secondary">SmartSeason</Badge>
          <CardTitle className="text-balance text-3xl md:text-5xl">
            Field monitoring for fast seasonal decisions.
          </CardTitle>
          <CardDescription className="max-w-2xl">
            Manage fields, assign agents, and track progress from planted to harvested with one focused dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Separator />
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Track</CardTitle>
                <CardDescription>Monitor field stage progression in real time.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Assign</CardTitle>
                <CardDescription>Route responsibilities to the right field agents.</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Decide</CardTitle>
                <CardDescription>Use status signals to prioritize harvest actions.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3">
          <Link href="/dashboard">
            <Button>Open Dashboard</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline">Sign In</Button>
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
