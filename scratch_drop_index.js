const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Check if index exists
    const result = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='index' AND name='Channel_name_key'`);
    console.log("Index check:", result);
    
    if (result && result.length > 0) {
      console.log("Dropping index...");
      await prisma.$executeRawUnsafe(`DROP INDEX "Channel_name_key"`);
      console.log("Index dropped successfully.");
    } else {
      console.log("Index not found. Checking all indexes on Channel...");
      const allIndexes = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='Channel'`);
      console.log("All indexes:", allIndexes);
      for (const idx of allIndexes) {
         if (idx.name.includes('name')) {
             console.log("Dropping index:", idx.name);
             await prisma.$executeRawUnsafe(`DROP INDEX "${idx.name}"`);
         }
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
