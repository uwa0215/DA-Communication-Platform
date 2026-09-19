"use client";

import { useRouter } from "next/navigation";
import MeetingRoomModal from "@/components/calendar/MeetingRoomModal";

interface MeetingRoomClientProps {
  roomId: string;
  title: string;
  currentUser: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export default function MeetingRoomClient({ roomId, title, currentUser }: MeetingRoomClientProps) {
  const router = useRouter();

  return (
    <MeetingRoomModal 
      roomId={roomId}
      title={title}
      currentUser={currentUser}
      onClose={() => router.push("/calendar")}
    />
  );
}
