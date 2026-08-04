import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create default channels
  const general = await prisma.channel.findFirst({ where: { name: "general" } }) || await prisma.channel.create({
    data: {
      name: "general",
      description: "General company-wide discussion",
      isPrivate: false,
      createdById: "seed", // temp, will update below
    },
  });

  const announcements = await prisma.channel.findFirst({ where: { name: "announcements" } }) || await prisma.channel.create({
    data: {
      name: "announcements",
      description: "Company announcements and news",
      isPrivate: false,
      createdById: "seed",
    },
  });

  // Create sample employees
  const employees = [
    { name: "Alice Johnson", email: "alice@company.com", jobTitle: "CEO", department: "Executive" },
    { name: "Bob Smith", email: "bob@company.com", jobTitle: "CTO", department: "Engineering" },
    { name: "Carol Williams", email: "carol@company.com", jobTitle: "Lead Developer", department: "Engineering" },
    { name: "David Lee", email: "david@company.com", jobTitle: "Product Manager", department: "Product" },
    { name: "Emma Davis", email: "emma@company.com", jobTitle: "Designer", department: "Design" },
    { name: "Frank Miller", email: "frank@company.com", jobTitle: "Marketing Head", department: "Marketing" },
  ];

  const createdUsers = [];
  for (const emp of employees) {
    const hashed = await bcrypt.hash("password123", 12);
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        name: emp.name,
        email: emp.email,
        password: hashed,
        jobTitle: emp.jobTitle,
        department: emp.department,
        status: "offline",
      },
    });
    createdUsers.push(user);
  }

  // Update channel createdById to first user
  if (createdUsers.length > 0) {
    await prisma.channel.updateMany({
      where: { createdById: "seed" },
      data: { createdById: createdUsers[0].id },
    });
  }

  // Add all users to general channel
  for (const user of createdUsers) {
    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId: general.id, userId: user.id } },
      update: {},
      create: { channelId: general.id, userId: user.id },
    });
    await prisma.channelMember.upsert({
      where: { channelId_userId: { channelId: announcements.id, userId: user.id } },
      update: {},
      create: { channelId: announcements.id, userId: user.id },
    });
  }

  // Seed a welcome message
  await prisma.message.deleteMany({ where: { channelId: general.id } });
  await prisma.message.create({
    data: {
      content: "👋 Welcome to CompanyChat! This is your company's communication hub. Say hello!",
      senderId: createdUsers[0].id,
      channelId: general.id,
    },
  });

  console.log("✅ Seed complete!");
  console.log("\nDefault login credentials:");
  employees.forEach(e => console.log(`  📧 ${e.email} | 🔑 password123`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
