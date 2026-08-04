const { PrismaClient } = require("@prisma/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");
const path = require("path");

const adapter = new PrismaLibSql({
  url: `file:${path.join(__dirname, "dev.db")}`,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany();
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "admin", isApproved: true },
    });
    console.log(`Promoted ${user.email} to Admin and Approved.`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
