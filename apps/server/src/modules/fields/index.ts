import { Elysia } from "elysia";

import {
  assignFieldBodySchema,
  createFieldBodySchema,
  createFieldUpdateBodySchema,
  fieldIdParamsSchema,
  updateFieldBodySchema,
} from "./model";
import { FieldsService } from "./service";

const fieldsService = new FieldsService();

export const fieldsModule = new Elysia({ name: "fields-module" })
  .get("/api/me", async ({ request, status }) => {
    const currentUser = await fieldsService.authenticate(request.headers);

    if (!currentUser) {
      return status(401, { message: "Unauthorized" });
    }

    return { user: currentUser };
  })
  .get("/api/dashboard", async ({ request, status }) => {
    const currentUser = await fieldsService.authenticate(request.headers);

    if (!currentUser) {
      return status(401, { message: "Unauthorized" });
    }

    return fieldsService.getDashboard(currentUser);
  })
  .get("/api/agents", async ({ request, status }) => {
    const currentUser = await fieldsService.authenticate(request.headers);

    if (!currentUser) {
      return status(401, { message: "Unauthorized" });
    }

    const agents = await fieldsService.getAgents(currentUser);

    if (!agents) {
      return status(403, { message: "Only admins can list agents" });
    }

    return { agents };
  })
  .get("/api/fields", async ({ request, status }) => {
    const currentUser = await fieldsService.authenticate(request.headers);

    if (!currentUser) {
      return status(401, { message: "Unauthorized" });
    }

    const fields = await fieldsService.getFields(currentUser);
    return { fields };
  })
  .post(
    "/api/fields",
    async ({ request, body, status }) => {
      const currentUser = await fieldsService.authenticate(request.headers);

      if (!currentUser) {
        return status(401, { message: "Unauthorized" });
      }

      const createdField = await fieldsService.createField(currentUser, body);

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
    async ({ request, params, body, status }) => {
      const currentUser = await fieldsService.authenticate(request.headers);

      if (!currentUser) {
        return status(401, { message: "Unauthorized" });
      }

      const updatedField = await fieldsService.updateField(currentUser, params.fieldId, body);

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
    async ({ request, params, body, status }) => {
      const currentUser = await fieldsService.authenticate(request.headers);

      if (!currentUser) {
        return status(401, { message: "Unauthorized" });
      }

      const assignment = await fieldsService.assignField(currentUser, params.fieldId, body.userId);

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
    async ({ request, params, status }) => {
      const currentUser = await fieldsService.authenticate(request.headers);

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
    async ({ request, params, body, status }) => {
      const currentUser = await fieldsService.authenticate(request.headers);

      if (!currentUser) {
        return status(401, { message: "Unauthorized" });
      }

      const createdUpdate = await fieldsService.createFieldUpdate(currentUser, params.fieldId, body);

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
