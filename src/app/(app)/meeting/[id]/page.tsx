import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MeetingRoomClient from "./MeetingRoomClient";

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  // Fetch meeting details from database if available
  const meeting = await prisma.meeting.findFirst({
    where: {
      OR: [
        { id: id },
        { meetLink: { contains: id } }
      ]
    },
    include: {
      createdBy: { select: { id: true, name: true, avatar: true } }
    }
  });

  return (
    <MeetingRoomClient 
      roomId={id} 
      title={meeting?.title || "Video Meeting"} 
      currentUser={{
        id: session.user.id,
        name: session.user.name || "User",
        avatar: session.user.image || undefined
      }} 
    />
  );
}
