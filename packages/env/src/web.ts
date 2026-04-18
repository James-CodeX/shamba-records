import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const serverUrlSchema = z
  .url()
  .refine((value) => {
    if (process.env.NODE_ENV !== "production") {
      return true;
    }

    const hostname = new URL(value).hostname;
    return hostname !== "localhost" && hostname !== "127.0.0.1";
  }, "NEXT_PUBLIC_SERVER_URL cannot point to localhost in production.");

export const env = createEnv({
  client: {
    NEXT_PUBLIC_SERVER_URL: serverUrlSchema,
  },
  runtimeEnv: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
  },
  emptyStringAsUndefined: true,
});
