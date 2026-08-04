const { PrismaClient } = require("@prisma/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");
const path = require("path");

async function main() {
  const adapter = new PrismaLibSql({
    url: `file:${path.join(process.cwd(), "prisma/dev.db")}`,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const messages = await prisma.directMessage.findMany({
      where: {
        parentId: null,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true, status: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 10,
    });
    console.log("Success:", messages);
  } catch (err) {
    console.error("Prisma error:", err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
