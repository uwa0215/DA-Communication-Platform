"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";
import IncomingCallModal from "./IncomingCallModal";
import ActiveCall from "./ActiveCall";
import { useSession } from "next-auth/react";

interface Caller {
  id: string;
  name: string;
  avatar?: string;
}

interface CallState {
  isCalling: boolean;
  incomingCall: { caller: Caller, type: 'video' | 'audio', callerSocket: string, offer: any } | null;
  activeCall: { user: Caller, type: 'video' | 'audio', isInitiator: boolean } | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

interface CallContextType {
  state: CallState;
  initiateCall: (user: Caller, type: 'video' | 'audio') => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const { data: session } = useSession();
  
  const [incomingCall, setIncomingCall] = useState<CallState['incomingCall']>(null);
  const [activeCall, setActiveCall] = useState<CallState['activeCall']>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const targetSocketRef = useRef<string | null>(null);

  useEffect(() => {
    if (!socket || !session?.user) return;

    socket.on("call-made", async (data) => {
      // data: { offer, callerSocket, caller, type }
      if (activeCall || incomingCall) {
        // Already busy
        socket.emit("reject-call", { to: data.caller.id });
        return;
      }
      targetSocketRef.current = data.callerSocket;
      setIncomingCall(data);
    });

    socket.on("answer-made", async (data) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setIsCalling(false);
      }
    });

    socket.on("ice-candidate", async (data) => {
      if (peerConnection.current) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error("Error adding ice candidate", e);
        }
      }
    });

    socket.on("call-rejected", () => {
      cleanupCall();
      alert("Call was declined.");
    });

    socket.on("call-ended", () => {
      cleanupCall();
    });

    return () => {
      socket.off("call-made");
      socket.off("answer-made");
      socket.off("ice-candidate");
      socket.off("call-rejected");
      socket.off("call-ended");
    };
  }, [socket, session, activeCall, incomingCall]);

  const initPeerConnection = (targetUserId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("ice-candidate", { candidate: event.candidate, to: targetUserId });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    peerConnection.current = pc;
    return pc;
  };

  const initiateCall = async (user: Caller, type: 'video' | 'audio') => {
    if (!socket || !session?.user) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: type === 'video', audio: true });
      setLocalStream(stream);
      setActiveCall({ user, type, isInitiator: true });
      setIsCalling(true);

      const pc = initPeerConnection(user.id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("call-user", {
        userToCall: user.id,
        offer,
        type,
        caller: { id: session.user.id, name: session.user.name, avatar: session.user.image }
      });
    } catch (e) {
      console.error(e);
      alert("Could not access camera/microphone");
    }
  };

  const acceptCall = async () => {
    if (!incomingCall || !socket) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: incomingCall.type === 'video', audio: true });
      setLocalStream(stream);
      setActiveCall({ user: incomingCall.caller, type: incomingCall.type, isInitiator: false });
      
      const pc = initPeerConnection(incomingCall.caller.id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("make-answer", {
        to: incomingCall.caller.id,
        answer
      });
      
      setIncomingCall(null);
    } catch (e) {
      console.error(e);
      rejectCall();
      alert("Could not access camera/microphone");
    }
  };

  const rejectCall = () => {
    if (incomingCall && socket) {
      socket.emit("reject-call", { to: incomingCall.caller.id });
    }
    setIncomingCall(null);
  };

  const endCall = () => {
    if (activeCall && socket) {
      socket.emit("end-call", { to: activeCall.user.id });
    } else if (isCalling && activeCall && socket) {
       socket.emit("end-call", { to: activeCall.user.id });
    }
    cleanupCall();
  };

  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setIncomingCall(null);
    setIsCalling(false);
    targetSocketRef.current = null;
  };

  const state = { isCalling, incomingCall, activeCall, localStream, remoteStream };

  return (
    <CallContext.Provider value={{ state, initiateCall, acceptCall, rejectCall, endCall }}>
      {children}
      {incomingCall && <IncomingCallModal />}
      {(activeCall || isCalling) && <ActiveCall />}
    </CallContext.Provider>
  );
}
