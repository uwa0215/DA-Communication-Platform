import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/users — get all employees
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { department: { contains: q } },
            { jobTitle: { contains: q } },
          ],
        }
      : undefined,
    select: {
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
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    { users },
    { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" } }
  );
}
