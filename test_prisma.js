const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
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
      take: 100,
    });
    console.log("Success:", messages);
  } catch (err) {
    console.error("Prisma error:", err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
