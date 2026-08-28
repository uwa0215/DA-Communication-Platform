const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash('Uwa_021502', 10);
  await prisma.user.update({
    where: { email: 'misjoshuamacasadia@gmail.com' },
    data: { password: hashedPassword }
  });
  console.log('Password updated successfully');
}

main().catch(console.error).finally(() => prisma.$disconnect());
