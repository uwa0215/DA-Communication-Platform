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
  incomingCall: { caller: Caller; type: 'video' | 'audio'; callerSocket: string; offer: any } | null;
  activeCall: { user: Caller; type: 'video' | 'audio'; isInitiator: boolean } | null;
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

// Web Audio Ringer for incoming & outgoing calls (no external audio assets required)
class CallAudioRinger {
  private ctx: AudioContext | null = null;
  private interval: any = null;

  startIncoming() {
    this.stop();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      
      const playTone = () => {
        if (!this.ctx || this.ctx.state === 'closed') return;
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.8);
        osc2.stop(now + 1.8);
      };

      playTone();
      this.interval = setInterval(playTone, 3000);
    } catch (e) {
      console.error("Audio Context error:", e);
    }
  }

  startOutgoing() {
    this.stop();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      
      const playTone = () => {
        if (!this.ctx || this.ctx.state === 'closed') return;
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.2);
        osc2.stop(now + 1.2);
      };

      playTone();
      this.interval = setInterval(playTone, 4000);
    } catch (e) {}
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.ctx) {
      try { this.ctx.close(); } catch (e) {}
      this.ctx = null;
    }
  }
}

const ringer = new CallAudioRinger();

const startVibration = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate([500, 300, 500, 300, 500, 1000]);
    } catch (e) {}
  }
};

const stopVibration = () => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(0);
    } catch (e) {}
  }
};

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

  // Automatically join socket user room so calls arrive reliably
  useEffect(() => {
    if (!socket || !session?.user) return;
    const userId = (session.user as any).id;
    if (userId) {
      socket.emit("join-user", userId);
      
      const handleConnect = () => {
        socket.emit("join-user", userId);
      };
      socket.on("connect", handleConnect);
      return () => {
        socket.off("connect", handleConnect);
      };
    }
  }, [socket, session]);

  useEffect(() => {
    if (!socket || !session?.user) return;

    socket.on("call-made", async (data) => {
      // data: { offer, callerSocket, caller, type }
      if (activeCall || incomingCall) {
        socket.emit("reject-call", { to: data.caller.id });
        return;
      }
      targetSocketRef.current = data.callerSocket;
      setIncomingCall(data);
      ringer.startIncoming();
      startVibration();
    });

    socket.on("answer-made", async (data) => {
      ringer.stop();
      stopVibration();
      if (peerConnection.current) {
        try {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (e) {
          console.error("Failed to set remote description on answer:", e);
        }
        setIsCalling(false);
      }
    });

    socket.on("ice-candidate", async (data) => {
      if (peerConnection.current) {
        try {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error("Error adding ice candidate:", e);
        }
      }
    });

    socket.on("call-rejected", () => {
      ringer.stop();
      stopVibration();
      cleanupCall();
    });

    socket.on("call-ended", () => {
      ringer.stop();
      stopVibration();
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
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("ice-candidate", { candidate: event.candidate, to: targetUserId });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    peerConnection.current = pc;
    return pc;
  };

  const initiateCall = async (user: Caller, type: 'video' | 'audio') => {
    if (!socket || !session?.user) return;
    try {
      const constraints = {
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      setActiveCall({ user, type, isInitiator: true });
      setIsCalling(true);
      ringer.startOutgoing();

      const pc = initPeerConnection(user.id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const myId = (session.user as any).id;
      socket.emit("call-user", {
        userToCall: user.id,
        offer,
        type,
        caller: { id: myId, name: session.user.name || "User", avatar: session.user.image }
      });
    } catch (e) {
      console.error("Error starting call:", e);
      alert("Could not access camera or microphone. Please check permissions.");
    }
  };

  const acceptCall = async () => {
    if (!incomingCall || !socket) return;
    ringer.stop();
    stopVibration();
    try {
      const constraints = {
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: incomingCall.type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
      console.error("Error accepting call:", e);
      rejectCall();
      alert("Could not access camera or microphone.");
    }
  };

  const rejectCall = () => {
    ringer.stop();
    stopVibration();
    if (incomingCall && socket) {
      socket.emit("reject-call", { to: incomingCall.caller.id });
    }
    setIncomingCall(null);
  };

  const endCall = () => {
    ringer.stop();
    stopVibration();
    if (activeCall && socket) {
      socket.emit("end-call", { to: activeCall.user.id });
    }
    cleanupCall();
  };

  const cleanupCall = () => {
    ringer.stop();
    stopVibration();
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

