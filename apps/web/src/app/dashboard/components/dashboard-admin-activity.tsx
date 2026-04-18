"use client";

import { Button } from "@my-better-t-app/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@my-better-t-app/ui/components/card";
import { Field, FieldGroup, FieldLabel } from "@my-better-t-app/ui/components/field";
import { Input } from "@my-better-t-app/ui/components/input";
import { type FormEvent } from "react";

import { type DashboardResponse } from "@/lib/api-client";

type AdminUpdateEntry = Extract<DashboardResponse, { role: "admin" }>["updates"][number];

type DashboardAdminActivityProps = {
  newFieldName: string;
  setNewFieldName: (value: string) => void;
  newFieldCropType: string;
  setNewFieldCropType: (value: string) => void;
  newFieldPlantingDate: string;
  setNewFieldPlantingDate: (value: string) => void;
  adminUpdates: AdminUpdateEntry[];
  handleCreateField: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function DashboardAdminActivity({
  newFieldName,
  setNewFieldName,
  newFieldCropType,
  setNewFieldCropType,
  newFieldPlantingDate,
  setNewFieldPlantingDate,
  adminUpdates,
  handleCreateField,
}: DashboardAdminActivityProps) {
  return (
    <section id="activity" className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Create Field</CardTitle>
          <CardDescription>Add a new field for the season.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateField} className="flex flex-col gap-3">
            <FieldGroup className="grid gap-3 md:grid-cols-4">
              <Field>
                <FieldLabel htmlFor="field-name">Field Name</FieldLabel>
                <Input
                  id="field-name"
                  value={newFieldName}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setNewFieldName(value);
                  }}
                  placeholder="North Plot"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="field-crop">Crop Type</FieldLabel>
                <Input
                  id="field-crop"
                  value={newFieldCropType}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setNewFieldCropType(value);
                  }}
                  placeholder="Maize"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="field-date">Planting Date</FieldLabel>
                <Input
                  id="field-date"
                  type="date"
                  value={newFieldPlantingDate}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setNewFieldPlantingDate(value);
                  }}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="field-submit">Action</FieldLabel>
                <Button id="field-submit" type="submit">
                  Create Field
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Updates</CardTitle>
          <CardDescription>Latest field activity from agents.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {adminUpdates.length === 0 ? (
            <p className="text-xs text-muted-foreground">No updates yet.</p>
          ) : (
            adminUpdates.map((update) => (
              <Card key={update.id}>
                <CardHeader>
                  <CardTitle>{update.fieldName}</CardTitle>
                  <CardDescription>
                    {update.stage} by {update.userName} on {new Date(update.createdAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                {update.notes ? (
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{update.notes}</p>
                  </CardContent>
                ) : null}
              </Card>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  );
}
