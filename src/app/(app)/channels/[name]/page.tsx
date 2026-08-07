import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { channels, channelMembers } from "@/lib/schema";
import ChatArea from "@/components/chat/ChatArea";

interface Props {
  params: Promise<{ name: string }>;
}

export default async function ChannelPage({ params }: Props) {
  const { name } = await params;
  const session = await auth();

  const channel = await db.query.channels.findFirst({
    where: (ch, { eq, and }) => and(eq(ch.name, name), eq(ch.isGroup, false)),
    with: { members: true },
  });

  if (!channel) return notFound();

  // Auto-join if not a member
  const isMember = channel.members.some(m => m.userId === session?.user?.id);
  if (!isMember && !channel.isPrivate && session?.user?.id) {
    await db.insert(channelMembers).values({
      channelId: channel.id,
      userId: session.user.id
    });
  }

  return (
    <ChatArea
      channelId={channel.id}
      channelName={channel.name}
      currentUserId={session?.user?.id || ""}
      currentUserName={session?.user?.name || "Unknown"}
    />
  );
}
