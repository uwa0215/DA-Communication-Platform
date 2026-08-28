import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { or, ilike } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getCache, setCache } from "@/lib/cache";

// GET /api/users — get all employees
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  const cacheKey = `users_list_${q || 'all'}`;
  const cachedUsers = await getCache(cacheKey);
  if (cachedUsers) {
    return NextResponse.json({ users: cachedUsers });
  }

  const usersData = await db.query.users.findMany({
    where: q
      ? (u, { or, ilike }) => or(
          ilike(u.name, `%${q}%`),
          ilike(u.email, `%${q}%`),
          ilike(u.department, `%${q}%`),
          ilike(u.jobTitle, `%${q}%`)
        )
      : undefined,
    columns: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      status: true,
      role: true,
      jobTitle: true,
      department: true,
      unit: true,
    },
    orderBy: (u, { asc }) => [asc(u.name)],
    limit: 50,
  });

  await setCache(cacheKey, usersData, 60);

  return NextResponse.json(
    { users: usersData },
    { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" } }
  );
}
