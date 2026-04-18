import { cors } from "@elysiajs/cors";
import { node } from "@elysiajs/node";
import { openapi } from "@elysiajs/openapi";
import { auth } from "@my-better-t-app/auth";
import { corsOrigins } from "@my-better-t-app/env/server";
import { Elysia } from "elysia";

import { fieldsModule } from "./modules/fields";

export const app = new Elysia({ adapter: node() })
  .use(
    cors({
      origin: corsOrigins,
      methods: ["GET", "POST", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  )
  .use(
    openapi({
      path: "/swagger",
      provider: "swagger-ui",
      documentation: {
        info: {
          title: "Shamba Records API",
          version: "1.0.0",
          description: "API for authentication, dashboard data, and field operations.",
        },
        tags: [{ name: "Fields", description: "Field management and activity endpoints." }],
      },
    }),
  )
  .get("/api/auth/*", ({ request }) => auth.handler(request))
  .post("/api/auth/*", ({ request }) => auth.handler(request))
  .all("/api/auth/*", ({ status }) => status(405))
  .use(fieldsModule)
  .get("/", () => "OK");

if (process.env.VERCEL !== "1") {
  app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
  });
}

export default app;
