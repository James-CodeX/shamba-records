"use client";

import { Badge } from "@my-better-t-app/ui/components/badge";
import { Button } from "@my-better-t-app/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@my-better-t-app/ui/components/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@my-better-t-app/ui/components/field";
import { Input } from "@my-better-t-app/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@my-better-t-app/ui/components/native-select";
import { Textarea } from "@my-better-t-app/ui/components/textarea";
import { type Dispatch, type SetStateAction } from "react";

import { type FieldStage, type FieldSummary, type FieldUpdateEntry } from "@/lib/api-client";

import { STAGE_OPTIONS, defaultUpdateDraft, statusVariant, toDateInput, type EditDraft, type UpdateDraft } from "../dashboard-model";

type DashboardFieldsProps = {
  isAdmin: boolean;
  fields: FieldSummary[];
  updates: Record<string, UpdateDraft>;
  setUpdates: Dispatch<SetStateAction<Record<string, UpdateDraft>>>;
  edits: Record<string, EditDraft>;
  setEdits: Dispatch<SetStateAction<Record<string, EditDraft>>>;
  assignments: Record<string, string>;
  setAssignments: Dispatch<SetStateAction<Record<string, string>>>;
  agents: Array<{ id: string; name: string; email: string }>;
  historyByField: Record<string, FieldUpdateEntry[]>;
  historyVisible: Record<string, boolean>;
  historyLoading: Record<string, boolean>;
  toggleHistory: (fieldId: string) => Promise<void>;
  handleAssignField: (fieldId: string) => Promise<void>;
  handleSaveField: (fieldId: string) => Promise<void>;
  handleSubmitUpdate: (fieldId: string) => Promise<void>;
};

function mergeEditDraft(current: Record<string, EditDraft>, fieldItem: FieldSummary): EditDraft {
  return (
    current[fieldItem.id] ?? {
      name: fieldItem.name,
      cropType: fieldItem.cropType,
      plantingDate: toDateInput(fieldItem.plantingDate),
      stage: fieldItem.stage,
    }
  );
}

export function DashboardFields({
  isAdmin,
  fields,
  updates,
  setUpdates,
  edits,
  setEdits,
  assignments,
  setAssignments,
  agents,
  historyByField,
  historyVisible,
  historyLoading,
  toggleHistory,
  handleAssignField,
  handleSaveField,
  handleSubmitUpdate,
}: DashboardFieldsProps) {
  return (
    <section id="fields" className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{isAdmin ? "All Fields" : "Assigned Fields"}</CardTitle>
          <CardDescription>
            {isAdmin
              ? "Create, assign, and monitor season progress."
              : "Update stages and observations for your assigned fields."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {fields.length === 0 ? <p className="text-xs text-muted-foreground">No fields available yet.</p> : null}

          {fields.map((fieldItem) => {
            const updateDraft = updates[fieldItem.id] ?? defaultUpdateDraft(fieldItem.stage);
            const editDraft = edits[fieldItem.id] ?? mergeEditDraft(edits, fieldItem);
            const isHistoryVisible = historyVisible[fieldItem.id];
            const isFieldHistoryLoading = historyLoading[fieldItem.id];
            const history = historyByField[fieldItem.id] ?? [];

            return (
              <Card key={fieldItem.id}>
                <CardHeader className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <CardTitle>{fieldItem.name}</CardTitle>
                      <CardDescription>
                        {fieldItem.cropType} | planted {new Date(fieldItem.plantingDate).toLocaleDateString()}
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">Stage: {fieldItem.stage}</Badge>
                      <Badge variant={statusVariant(fieldItem.status)}>{fieldItem.status}</Badge>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Assigned: {fieldItem.assignments.length === 0 ? "none" : fieldItem.assignments.map((a) => a.name).join(", ")}
                  </p>

                  {fieldItem.latestUpdate ? (
                    <p className="text-xs text-muted-foreground">
                      Last update: {fieldItem.latestUpdate.stage} by {fieldItem.latestUpdate.userName} on{" "}
                      {new Date(fieldItem.latestUpdate.createdAt).toLocaleString()}
                    </p>
                  ) : null}

                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => void toggleHistory(fieldItem.id)}>
                      {isHistoryVisible ? "Hide History" : "Show History"}
                    </Button>
                  </div>
                </CardHeader>

                {isHistoryVisible ? (
                  <CardContent className="flex flex-col gap-2">
                    {isFieldHistoryLoading ? <p className="text-xs text-muted-foreground">Loading history...</p> : null}

                    {!isFieldHistoryLoading && history.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No updates recorded for this field yet.</p>
                    ) : null}

                    {!isFieldHistoryLoading
                      ? history.map((item) => (
                          <Card key={item.id}>
                            <CardHeader>
                              <CardTitle>{item.stage}</CardTitle>
                              <CardDescription>
                                by {item.userName} on {new Date(item.createdAt).toLocaleString()}
                              </CardDescription>
                            </CardHeader>
                            {item.notes ? (
                              <CardContent>
                                <p className="text-xs text-muted-foreground">{item.notes}</p>
                              </CardContent>
                            ) : null}
                          </Card>
                        ))
                      : null}
                  </CardContent>
                ) : null}

                <CardContent className="flex flex-col gap-3">
                  {isAdmin ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>Admin Controls</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3">
                        <FieldGroup className="grid gap-3 md:grid-cols-2">
                          <Field>
                            <FieldLabel htmlFor={`name-${fieldItem.id}`}>Field Name</FieldLabel>
                            <Input
                              id={`name-${fieldItem.id}`}
                              value={editDraft.name}
                              onChange={(event) => {
                                const value = event.currentTarget.value;

                                setEdits((current) => {
                                  const currentDraft = mergeEditDraft(current, fieldItem);
                                  return {
                                    ...current,
                                    [fieldItem.id]: {
                                      ...currentDraft,
                                      name: value,
                                    },
                                  };
                                });
                              }}
                            />
                          </Field>

                          <Field>
                            <FieldLabel htmlFor={`crop-${fieldItem.id}`}>Crop Type</FieldLabel>
                            <Input
                              id={`crop-${fieldItem.id}`}
                              value={editDraft.cropType}
                              onChange={(event) => {
                                const value = event.currentTarget.value;

                                setEdits((current) => {
                                  const currentDraft = mergeEditDraft(current, fieldItem);
                                  return {
                                    ...current,
                                    [fieldItem.id]: {
                                      ...currentDraft,
                                      cropType: value,
                                    },
                                  };
                                });
                              }}
                            />
                          </Field>

                          <Field>
                            <FieldLabel htmlFor={`date-${fieldItem.id}`}>Planting Date</FieldLabel>
                            <Input
                              id={`date-${fieldItem.id}`}
                              type="date"
                              value={editDraft.plantingDate}
                              onChange={(event) => {
                                const value = event.currentTarget.value;

                                setEdits((current) => {
                                  const currentDraft = mergeEditDraft(current, fieldItem);
                                  return {
                                    ...current,
                                    [fieldItem.id]: {
                                      ...currentDraft,
                                      plantingDate: value,
                                    },
                                  };
                                });
                              }}
                            />
                          </Field>

                          <Field>
                            <FieldLabel htmlFor={`stage-${fieldItem.id}`}>Current Stage</FieldLabel>
                            <NativeSelect
                              id={`stage-${fieldItem.id}`}
                              className="w-full"
                              value={editDraft.stage}
                              onChange={(event) => {
                                const stageValue = event.currentTarget.value as FieldStage;

                                setEdits((current) => {
                                  const currentDraft = mergeEditDraft(current, fieldItem);
                                  return {
                                    ...current,
                                    [fieldItem.id]: {
                                      ...currentDraft,
                                      stage: stageValue,
                                    },
                                  };
                                });
                              }}
                            >
                              {STAGE_OPTIONS.map((stage) => (
                                <NativeSelectOption key={stage} value={stage}>
                                  {stage}
                                </NativeSelectOption>
                              ))}
                            </NativeSelect>
                          </Field>
                        </FieldGroup>

                        <FieldGroup className="grid gap-3 md:grid-cols-[1fr_auto]">
                          <Field>
                            <FieldLabel htmlFor={`assign-${fieldItem.id}`}>Assign Agent</FieldLabel>
                            <NativeSelect
                              id={`assign-${fieldItem.id}`}
                              className="w-full"
                              value={assignments[fieldItem.id] ?? ""}
                              onChange={(event) => {
                                const value = event.currentTarget.value;

                                setAssignments((current) => ({
                                  ...current,
                                  [fieldItem.id]: value,
                                }));
                              }}
                            >
                              <NativeSelectOption value="">Select agent...</NativeSelectOption>
                              {agents.map((agent) => (
                                <NativeSelectOption key={agent.id} value={agent.id}>
                                  {agent.name} ({agent.email})
                                </NativeSelectOption>
                              ))}
                            </NativeSelect>
                          </Field>

                          <Field>
                            <FieldLabel htmlFor={`assign-action-${fieldItem.id}`}>Action</FieldLabel>
                            <Button
                              id={`assign-action-${fieldItem.id}`}
                              variant="outline"
                              onClick={() => void handleAssignField(fieldItem.id)}
                            >
                              Assign Agent
                            </Button>
                          </Field>
                        </FieldGroup>

                        <Button onClick={() => void handleSaveField(fieldItem.id)}>Save Field Details</Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Agent Update</CardTitle>
                        <CardDescription>Capture latest stage and field observations.</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3">
                        <FieldGroup className="grid gap-3 md:grid-cols-2">
                          <Field>
                            <FieldLabel htmlFor={`agent-stage-${fieldItem.id}`}>Stage</FieldLabel>
                            <NativeSelect
                              id={`agent-stage-${fieldItem.id}`}
                              className="w-full"
                              value={updateDraft.stage}
                              onChange={(event) => {
                                const nextStage = event.currentTarget.value as FieldStage;
                                setUpdates((current) => {
                                  const currentDraft = current[fieldItem.id] ?? defaultUpdateDraft(fieldItem.stage);
                                  return {
                                    ...current,
                                    [fieldItem.id]: {
                                      ...currentDraft,
                                      stage: nextStage,
                                    },
                                  };
                                });
                              }}
                            >
                              {STAGE_OPTIONS.map((stage) => (
                                <NativeSelectOption key={stage} value={stage}>
                                  {stage}
                                </NativeSelectOption>
                              ))}
                            </NativeSelect>
                          </Field>

                          <Field>
                            <FieldLabel htmlFor={`agent-action-${fieldItem.id}`}>Action</FieldLabel>
                            <Button id={`agent-action-${fieldItem.id}`} onClick={() => void handleSubmitUpdate(fieldItem.id)}>
                              Save Update
                            </Button>
                          </Field>
                        </FieldGroup>

                        <Field>
                          <FieldLabel htmlFor={`agent-notes-${fieldItem.id}`}>Notes</FieldLabel>
                          <Textarea
                            id={`agent-notes-${fieldItem.id}`}
                            placeholder="Notes or observations"
                            value={updateDraft.notes}
                            onChange={(event) => {
                              const value = event.currentTarget.value;

                              setUpdates((current) => {
                                const currentDraft = current[fieldItem.id] ?? defaultUpdateDraft(fieldItem.stage);
                                return {
                                  ...current,
                                  [fieldItem.id]: {
                                    ...currentDraft,
                                    notes: value,
                                  },
                                };
                              });
                            }}
                          />
                          <FieldDescription>Include weather impact, pest risk, or growth quality notes.</FieldDescription>
                        </Field>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </section>
  );
}
