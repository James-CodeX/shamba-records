"use client";

import { Alert, AlertDescription, AlertTitle } from "@my-better-t-app/ui/components/alert";
import { Button } from "@my-better-t-app/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@my-better-t-app/ui/components/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@my-better-t-app/ui/components/field";
import { Input } from "@my-better-t-app/ui/components/input";
import { Skeleton } from "@my-better-t-app/ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@my-better-t-app/ui/components/tabs";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [tab, setTab] = useState("signup");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [signInValues, setSignInValues] = useState({ email: "", password: "" });
  const [signUpValues, setSignUpValues] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    if (session?.user) {
      router.replace("/dashboard");
    }
  }, [session, router]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!signInValues.email.includes("@")) {
      setFormError("Enter a valid email address.");
      return;
    }

    if (signInValues.password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    await authClient.signIn.email(
      {
        email: signInValues.email,
        password: signInValues.password,
      },
      {
        onSuccess: () => {
          toast.success("Signed in successfully");
          router.push("/dashboard");
        },
        onError: (error) => {
          const message = error.error.message || error.error.statusText || "Unable to sign in";
          setFormError(message);
          toast.error(message);
        },
      },
    );
    setIsSubmitting(false);
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (signUpValues.name.trim().length < 2) {
      setFormError("Name must be at least 2 characters.");
      return;
    }

    if (!signUpValues.email.includes("@")) {
      setFormError("Enter a valid email address.");
      return;
    }

    if (signUpValues.password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    await authClient.signUp.email(
      {
        name: signUpValues.name,
        email: signUpValues.email,
        password: signUpValues.password,
      },
      {
        onSuccess: () => {
          toast.success("Account created");
          router.push("/dashboard");
        },
        onError: (error) => {
          const message = error.error.message || error.error.statusText || "Unable to create account";
          setFormError(message);
          toast.error(message);
        },
      },
    );
    setIsSubmitting(false);
  }

  if (isPending) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-md items-center px-4 py-10">
        <Card className="w-full">
          <CardHeader className="flex flex-col gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-60" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-2">
          <CardTitle>Access SmartSeason</CardTitle>
          <CardDescription>Sign up for a new account or sign in to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-4">
            <TabsList>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="signin">Sign In</TabsTrigger>
            </TabsList>

            {formError ? (
              <Alert variant="destructive">
                <AlertTitle>Authentication Error</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="flex flex-col gap-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="signup-name">Name</FieldLabel>
                    <Input
                      id="signup-name"
                      value={signUpValues.name}
                      onChange={(event) =>
                        setSignUpValues((current) => ({
                          ...current,
                          name: event.currentTarget.value,
                        }))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="signup-email">Email</FieldLabel>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signUpValues.email}
                      onChange={(event) =>
                        setSignUpValues((current) => ({
                          ...current,
                          email: event.currentTarget.value,
                        }))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="signup-password">Password</FieldLabel>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signUpValues.password}
                      onChange={(event) =>
                        setSignUpValues((current) => ({
                          ...current,
                          password: event.currentTarget.value,
                        }))
                      }
                    />
                    <FieldDescription>Use at least 8 characters.</FieldDescription>
                  </Field>
                </FieldGroup>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="flex flex-col gap-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="signin-email">Email</FieldLabel>
                    <Input
                      id="signin-email"
                      type="email"
                      value={signInValues.email}
                      onChange={(event) =>
                        setSignInValues((current) => ({
                          ...current,
                          email: event.currentTarget.value,
                        }))
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="signin-password">Password</FieldLabel>
                    <Input
                      id="signin-password"
                      type="password"
                      value={signInValues.password}
                      onChange={(event) =>
                        setSignInValues((current) => ({
                          ...current,
                          password: event.currentTarget.value,
                        }))
                      }
                    />
                  </Field>
                </FieldGroup>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
