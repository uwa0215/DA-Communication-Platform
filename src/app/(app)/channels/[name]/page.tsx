import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ChatArea from "@/components/chat/ChatArea";

interface Props {
  params: Promise<{ name: string }>;
}

export default async function ChannelPage({ params }: Props) {
  const { name } = await params;
  const session = await auth();

  const channel = await prisma.channel.findFirst({
    where: { name, isGroup: false },
    include: { members: true },
  });

  if (!channel) return notFound();

  // Auto-join if not a member
  const isMember = channel.members.some(m => m.userId === session?.user?.id);
  if (!isMember && !channel.isPrivate && session?.user?.id) {
    await prisma.channelMember.create({
      data: { channelId: channel.id, userId: session.user.id },
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
