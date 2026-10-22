import path from "node:path";
import { defineConfig } from "prisma/config";
import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL ?? "";

export default defineConfig({
  earlyAccess: true,
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: databaseUrl,
  },
  migrate: {
    async resolveUrl() {
      return databaseUrl;
    },
  },
});
