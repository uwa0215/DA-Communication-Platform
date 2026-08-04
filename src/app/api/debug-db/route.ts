import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const indexes = await prisma.$queryRawUnsafe(`PRAGMA index_list('Channel')`);
    const indexInfo = [];
    for (const idx of indexes as any[]) {
      const info = await prisma.$queryRawUnsafe(`PRAGMA index_info('${idx.name}')`);
      indexInfo.push({ name: idx.name, unique: idx.unique, info });
    }
    return NextResponse.json({ indexes, indexInfo });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
