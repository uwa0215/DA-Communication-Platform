// @ts-nocheck
import path from "node:path";
import { defineConfig } from "prisma/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config();

export default defineConfig({
  schema: path.join(__dirname, "prisma/schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrate: {
    async adapter() {
      const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
      return new PrismaPg(pool);
    },
  },
});
