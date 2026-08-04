import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CalendarClient from "@/components/calendar/CalendarClient";
import { redirect } from "next/navigation";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch initial meetings for fast loading
  const meetings = await prisma.meeting.findMany({
    where: {
      participants: {
        some: { userId: session.user.id }
      }
    },
    include: {
      createdBy: { select: { id: true, name: true, avatar: true } },
      participants: {
        include: {
          user: { select: { id: true, name: true, avatar: true, email: true } }
        }
      }
    },
    orderBy: { startTime: 'asc' }
  });

  return <CalendarClient initialMeetings={meetings} currentUserId={session.user.id} />;
}
