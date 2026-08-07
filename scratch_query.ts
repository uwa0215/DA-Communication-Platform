import { db } from './src/lib/db';
import { users } from './src/lib/schema';
import { desc } from 'drizzle-orm';
async function main() {
  const u = await db.query.users.findFirst({ orderBy: [desc(users.createdAt)] });
  console.log(u);
  process.exit(0);
}
main();
