import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { channels, channelMembers } from "@/lib/schema";
import ChatArea from "@/components/chat/ChatArea";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GroupPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  const channel = await db.query.channels.findFirst({
    where: (ch, { eq }) => eq(ch.id, id),
    with: { members: true },
  });

  if (!channel || !channel.isGroup) return notFound();

  // Must be a member to view group chat
  const isMember = channel.members.some(m => m.userId === session?.user?.id);
  if (!isMember) return notFound();

  return (
    <ChatArea
      channelId={channel.id}
      channelName={channel.name.split('##')[0]}
      isGroupChat={true}
      groupAvatar={channel.avatar}
      currentUserId={session?.user?.id || ""}
      currentUserName={session?.user?.name || "Unknown"}
    />
  );
}
