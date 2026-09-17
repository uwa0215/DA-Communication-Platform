import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import ChatArea from "@/components/chat/ChatArea";
import { getUserPresenceStatus } from "@/lib/presence";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function DMPage({ params }: Props) {
  const { userId } = await params;
  const session = await auth();

  const otherUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
    columns: { id: true, name: true, email: true, avatar: true, status: true, jobTitle: true, department: true, unit: true },
  });

  if (!otherUser) return notFound();

  const liveStatus = getUserPresenceStatus(userId);
  const dmUser = { ...otherUser, status: liveStatus };

  return (
    <ChatArea
      dmUserId={userId}
      dmUser={dmUser as any}
      currentUserId={session?.user?.id || ""}
      currentUserName={session?.user?.name || "Unknown"}
    />
  );
}
