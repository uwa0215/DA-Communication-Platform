import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userToCall, type, callerName } = await req.json();

    if (!userToCall) {
      return NextResponse.json({ error: "userToCall required" }, { status: 400 });
    }

    const caller = callerName || session.user.name || "Someone";
    const callTypeStr = type === "video" ? "Video Call" : "Voice Call";

    // Send high-priority incoming call push notification
    await sendPushToUser(userToCall, {
      title: `📞 Incoming ${callTypeStr}`,
      body: `${caller} is calling you on Trellis Messenger... Tap to answer.`,
      icon: (session.user as any).image || "/icon-192.png",
      url: `/dm/${session.user.id}?call=incoming`
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/calls/notify error:", error);
    return NextResponse.json({ error: "Failed to trigger call push notification" }, { status: 500 });
  }
}
