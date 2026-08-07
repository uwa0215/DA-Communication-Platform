import { db } from './src/lib/db';
import { users } from './src/lib/schema';
import { count } from 'drizzle-orm';
async function main() {
  const countResult = await db.select({ value: count() }).from(users);
  console.log("countResult:", countResult);
  console.log("countResult[0].value:", countResult[0].value);
  console.log("typeof value:", typeof countResult[0].value);
  const isFirstUser = countResult[0].value === 0;
  console.log("isFirstUser:", isFirstUser);
  process.exit(0);
}
main();
