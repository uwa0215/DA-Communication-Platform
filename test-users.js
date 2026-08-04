const { PrismaClient } = require("@prisma/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");
const path = require("path");

const adapter = new PrismaLibSql({
  url: `file:${path.join(process.cwd(), "prisma/dev.db")}`,
});
const prisma = new PrismaClient({ adapter });

async function check() {
  const users = await prisma.user.findMany();
  console.log("Users in DB:", users.length);
  if (users.length > 0) {
    console.log("First user:", users[0].email, "isApproved:", users[0].isApproved);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
