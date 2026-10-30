import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer reads .env automatically; dotenv loads it for local CLI use.
// In Docker the variables come from the container environment instead.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx --conditions=react-server prisma/seed.ts",
  },
  datasource: {
    // `prisma generate` does not need a database, so an empty fallback keeps
    // Docker image builds working without credentials baked in.
    url: process.env.DATABASE_URL ?? "",
  },
});
