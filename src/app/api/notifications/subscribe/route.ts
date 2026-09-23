import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscription } = await req.json();

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription object" }, { status: 400 });
    }

    // Upsert subscription into database
    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId: session.user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      create: {
        userId: session.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/notifications/subscribe error:", error);
    return NextResponse.json({ error: "Failed to save push subscription" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { endpoint } = await req.json();

    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: {
          userId: session.user.id,
          endpoint: endpoint,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/notifications/subscribe error:", error);
    return NextResponse.json({ error: "Failed to delete push subscription" }, { status: 500 });
  }
}
