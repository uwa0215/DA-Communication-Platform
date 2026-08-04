import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ChatArea from "@/components/chat/ChatArea";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function DMPage({ params }: Props) {
  const { userId } = await params;
  const session = await auth();

  const otherUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, avatar: true, status: true, jobTitle: true, department: true, unit: true },
  });

  if (!otherUser) return notFound();

  return (
    <ChatArea
      dmUserId={userId}
      dmUser={otherUser as any}
      currentUserId={session?.user?.id || ""}
      currentUserName={session?.user?.name || "Unknown"}
    />
  );
}
