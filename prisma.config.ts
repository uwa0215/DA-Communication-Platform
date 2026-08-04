// @ts-nocheck
import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join(__dirname, "prisma/schema.prisma"),
  datasource: {
    url: `file:${path.join(__dirname, "prisma/dev.db")}`,
  },
  migrate: {
    async adapter() {
      const { PrismaLibSQL } = await import("@prisma/adapter-libsql");
      return new PrismaLibSQL({
        url: `file:${path.join(__dirname, "prisma/dev.db")}`,
      });
    },
  },
});
