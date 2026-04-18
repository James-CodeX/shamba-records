import { Elysia } from "elysia";

import {
  type AssignFieldBody,
  type CreateFieldBody,
  type CreateFieldUpdateBody,
  type UpdateFieldBody,
  assignFieldBodySchema,
  createFieldBodySchema,
  createFieldUpdateBodySchema,
  fieldIdParamsSchema,
  updateFieldBodySchema,
} from "./model";
import { FieldsService } from "./service";

const fieldsService = new FieldsService();

function toHeadersObject(headers: unknown): Headers {
  const normalized = new Headers();

  if (!headers || typeof headers !== "object") {
    return normalized;
  }

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") {
      normalized.set(key, value);
    }
  }

  return normalized;
}

export const fieldsModule = new Elysia({ name: "fields-module" })
  .get("/api/me", async ({ headers, status }) => {
    const currentUser = await fieldsService.authenticate(toHeadersObject(headers));

    if (!currentUser) {
      return status(401, { message: "Unauthorized" });
    }

    return { user: currentUser };
  })
  .get("/api/dashboard", async ({ headers, status }) => {
    const currentUser = await fieldsService.authenticate(toHeadersObject(headers));

    if (!currentUser) {
      return status(401, { message: "Unauthorized" });
    }

    return fieldsService.getDashboard(currentUser);
  })
  .get("/api/agents", async ({ headers, status }) => {
    const currentUser = await fieldsService.authenticate(toHeadersObject(headers));

    if (!currentUser) {
      return status(401, { message: "Unauthorized" });
    }

    const agents = await fieldsService.getAgents(currentUser);

    if (!agents) {
      return status(403, { message: "Only admins can list agents" });
    }

    return { agents };
  })
  .get("/api/fields", async ({ headers, status }) => {
    const currentUser = await fieldsService.authenticate(toHeadersObject(headers));

    if (!currentUser) {
      return status(401, { message: "Unauthorized" });
    }

    const fields = await fieldsService.getFields(currentUser);
    return { fields };
  })
  .post(
    "/api/fields",
    async ({ headers, body, status }) => {
      const currentUser = await fieldsService.authenticate(toHeadersObject(headers));

      if (!currentUser) {
        return status(401, { message: "Unauthorized" });
      }

      const createdField = await fieldsService.createField(currentUser, body as CreateFieldBody);

      if (!createdField) {
        return status(403, { message: "Only admins can create fields" });
      }

      if ("error" in createdField) {
        return status(400, { message: createdField.error });
      }

      return status(201, { field: createdField });
    },
    {
      body: createFieldBodySchema,
    },
  )
  .patch(
    "/api/fields/:fieldId",
    async ({ headers, params, body, status }) => {
      const currentUser = await fieldsService.authenticate(toHeadersObject(headers));

      if (!currentUser) {
        return status(401, { message: "Unauthorized" });
      }

      const updatedField = await fieldsService.updateField(
        currentUser,
        params.fieldId,
        body as UpdateFieldBody,
      );

      if (!updatedField) {
        return status(403, { message: "Only admins can edit fields" });
      }

      if ("error" in updatedField) {
        return status(400, { message: updatedField.error });
      }

      return { field: updatedField };
    },
    {
      params: fieldIdParamsSchema,
      body: updateFieldBodySchema,
    },
  )
  .post(
    "/api/fields/:fieldId/assign",
    async ({ headers, params, body, status }) => {
      const currentUser = await fieldsService.authenticate(toHeadersObject(headers));

      if (!currentUser) {
        return status(401, { message: "Unauthorized" });
      }

      const assignment = await fieldsService.assignField(
        currentUser,
        params.fieldId,
        (body as AssignFieldBody).userId,
      );

      if (!assignment) {
        return status(403, { message: "Only admins can assign fields" });
      }

      if ("error" in assignment) {
        return status(400, { message: assignment.error });
      }

      return { assignment };
    },
    {
      params: fieldIdParamsSchema,
      body: assignFieldBodySchema,
    },
  )
  .get(
    "/api/fields/:fieldId/updates",
    async ({ headers, params, status }) => {
      const currentUser = await fieldsService.authenticate(toHeadersObject(headers));

      if (!currentUser) {
        return status(401, { message: "Unauthorized" });
      }

      const updates = await fieldsService.getFieldUpdates(currentUser, params.fieldId);

      if (!updates) {
        return status(403, { message: "Not allowed to view updates for this field" });
      }

      return { updates };
    },
    {
      params: fieldIdParamsSchema,
    },
  )
  .post(
    "/api/fields/:fieldId/updates",
    async ({ headers, params, body, status }) => {
      const currentUser = await fieldsService.authenticate(toHeadersObject(headers));

      if (!currentUser) {
        return status(401, { message: "Unauthorized" });
      }

      const createdUpdate = await fieldsService.createFieldUpdate(
        currentUser,
        params.fieldId,
        body as CreateFieldUpdateBody,
      );

      if (!createdUpdate) {
        return status(403, { message: "Not allowed to update this field" });
      }

      if ("error" in createdUpdate) {
        return status(400, { message: createdUpdate.error });
      }

      return status(201, { update: createdUpdate });
    },
    {
      params: fieldIdParamsSchema,
      body: createFieldUpdateBodySchema,
    },
  );
