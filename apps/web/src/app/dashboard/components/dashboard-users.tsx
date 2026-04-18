"use client";

import { Button } from "@my-better-t-app/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@my-better-t-app/ui/components/card";
import { Field, FieldGroup, FieldLabel } from "@my-better-t-app/ui/components/field";
import { Input } from "@my-better-t-app/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@my-better-t-app/ui/components/native-select";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  createManagedUser,
  deleteManagedUser,
  listUsers,
  updateManagedUser,
  type ManagedUser,
  type UserRole,
} from "@/lib/api-client";

type DashboardUsersProps = {
  currentUserId: string;
};

type UserDraft = {
  name: string;
  email: string;
  role: UserRole;
};

export function DashboardUsers({ currentUserId }: DashboardUsersProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});
  const [deletingById, setDeletingById] = useState<Record<string, boolean>>({});

  const [createDraft, setCreateDraft] = useState({
    name: "",
    email: "",
    password: "",
    role: "agent" as UserRole,
  });

  const [editDrafts, setEditDrafts] = useState<Record<string, UserDraft>>({});

  async function loadUsersData() {
    setIsLoading(true);

    try {
      const { users: fetchedUsers } = await listUsers();
      setUsers(fetchedUsers);
      setEditDrafts(
        Object.fromEntries(
          fetchedUsers.map((item) => [
            item.id,
            {
              name: item.name,
              email: item.email,
              role: item.role === "admin" ? "admin" : "agent",
            },
          ]),
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load users");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsersData();
  }, []);

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!createDraft.name || !createDraft.email || !createDraft.password) {
      toast.error("Name, email, and password are required");
      return;
    }

    if (createDraft.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsCreating(true);

    try {
      await createManagedUser({
        name: createDraft.name,
        email: createDraft.email,
        password: createDraft.password,
        role: createDraft.role,
      });

      setCreateDraft({
        name: "",
        email: "",
        password: "",
        role: "agent",
      });

      await loadUsersData();
      toast.success("User created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create user");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSaveUser(userId: string) {
    const draft = editDrafts[userId];

    if (!draft?.name || !draft?.email) {
      toast.error("Name and email are required");
      return;
    }

    setSavingById((current) => ({ ...current, [userId]: true }));

    try {
      await updateManagedUser(userId, {
        name: draft.name,
        email: draft.email,
        role: draft.role,
      });

      await loadUsersData();
      toast.success("User updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update user");
    } finally {
      setSavingById((current) => ({ ...current, [userId]: false }));
    }
  }

  async function handleDeleteUser(userId: string) {
    if (userId === currentUserId) {
      toast.error("You cannot delete your own account");
      return;
    }

    setDeletingById((current) => ({ ...current, [userId]: true }));

    try {
      await deleteManagedUser(userId);
      await loadUsersData();
      toast.success("User deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete user");
    } finally {
      setDeletingById((current) => ({ ...current, [userId]: false }));
    }
  }

  return (
    <section id="users" className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Create User</CardTitle>
          <CardDescription>Create admin or agent users with credential login.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="flex flex-col gap-3">
            <FieldGroup className="grid gap-3 md:grid-cols-4">
              <Field>
                <FieldLabel htmlFor="create-user-name">Name</FieldLabel>
                <Input
                  id="create-user-name"
                  value={createDraft.name}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setCreateDraft((current) => ({ ...current, name: value }));
                  }}
                  placeholder="Jane Doe"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="create-user-email">Email</FieldLabel>
                <Input
                  id="create-user-email"
                  type="email"
                  value={createDraft.email}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setCreateDraft((current) => ({ ...current, email: value }));
                  }}
                  placeholder="jane@example.com"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="create-user-password">Password</FieldLabel>
                <Input
                  id="create-user-password"
                  type="password"
                  value={createDraft.password}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setCreateDraft((current) => ({ ...current, password: value }));
                  }}
                  placeholder="Minimum 8 characters"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="create-user-role">Role</FieldLabel>
                <NativeSelect
                  id="create-user-role"
                  value={createDraft.role}
                  onChange={(event) => {
                    const value = event.currentTarget.value as UserRole;
                    setCreateDraft((current) => ({ ...current, role: value }));
                  }}
                >
                  <NativeSelectOption value="agent">agent</NativeSelectOption>
                  <NativeSelectOption value="admin">admin</NativeSelectOption>
                </NativeSelect>
              </Field>
            </FieldGroup>

            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creating" : "Create User"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Users</CardTitle>
          <CardDescription>View, edit, and delete users.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {isLoading ? <p className="text-xs text-muted-foreground">Loading users...</p> : null}

          {!isLoading && users.length === 0 ? <p className="text-xs text-muted-foreground">No users found.</p> : null}

          {!isLoading
            ? users.map((item) => {
                const draft = editDrafts[item.id];
                const isSaving = savingById[item.id];
                const isDeleting = deletingById[item.id];

                return (
                  <Card key={item.id}>
                    <CardHeader>
                      <CardTitle>{item.name}</CardTitle>
                      <CardDescription>
                        {item.email} | role: {item.role ?? "agent"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <FieldGroup className="grid gap-3 md:grid-cols-3">
                        <Field>
                          <FieldLabel htmlFor={`edit-user-name-${item.id}`}>Name</FieldLabel>
                          <Input
                            id={`edit-user-name-${item.id}`}
                            value={draft?.name ?? item.name}
                            onChange={(event) => {
                              const value = event.currentTarget.value;
                              setEditDrafts((current) => ({
                                ...current,
                                [item.id]: {
                                  name: value,
                                  email: current[item.id]?.email ?? item.email,
                                  role: current[item.id]?.role ?? (item.role === "admin" ? "admin" : "agent"),
                                },
                              }));
                            }}
                          />
                        </Field>

                        <Field>
                          <FieldLabel htmlFor={`edit-user-email-${item.id}`}>Email</FieldLabel>
                          <Input
                            id={`edit-user-email-${item.id}`}
                            type="email"
                            value={draft?.email ?? item.email}
                            onChange={(event) => {
                              const value = event.currentTarget.value;
                              setEditDrafts((current) => ({
                                ...current,
                                [item.id]: {
                                  name: current[item.id]?.name ?? item.name,
                                  email: value,
                                  role: current[item.id]?.role ?? (item.role === "admin" ? "admin" : "agent"),
                                },
                              }));
                            }}
                          />
                        </Field>

                        <Field>
                          <FieldLabel htmlFor={`edit-user-role-${item.id}`}>Role</FieldLabel>
                          <NativeSelect
                            id={`edit-user-role-${item.id}`}
                            value={draft?.role ?? (item.role === "admin" ? "admin" : "agent")}
                            onChange={(event) => {
                              const value = event.currentTarget.value as UserRole;
                              setEditDrafts((current) => ({
                                ...current,
                                [item.id]: {
                                  name: current[item.id]?.name ?? item.name,
                                  email: current[item.id]?.email ?? item.email,
                                  role: value,
                                },
                              }));
                            }}
                          >
                            <NativeSelectOption value="agent">agent</NativeSelectOption>
                            <NativeSelectOption value="admin">admin</NativeSelectOption>
                          </NativeSelect>
                        </Field>
                      </FieldGroup>

                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => void handleSaveUser(item.id)} disabled={isSaving || isDeleting}>
                          {isSaving ? "Saving" : "Save"}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => void handleDeleteUser(item.id)}
                          disabled={isSaving || isDeleting || item.id === currentUserId}
                        >
                          {isDeleting ? "Deleting" : item.id === currentUserId ? "Cannot Delete Self" : "Delete"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            : null}
        </CardContent>
      </Card>
    </section>
  );
}
