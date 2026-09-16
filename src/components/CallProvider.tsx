"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useSocket, getSocket } from "@/hooks/useSocket";
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

  const callMetaRef = useRef<{
    user: Caller;
    type: 'video' | 'audio';
    isInitiator: boolean;
    startTime: number;
    connectTime: number | null;
    status: 'missed' | 'declined' | 'completed';
    logged: boolean;
  } | null>(null);

  const sendCallLogMessage = async (statusOverride?: 'missed' | 'declined' | 'completed') => {
    const meta = callMetaRef.current;
    if (!meta || meta.logged) return;
    meta.logged = true;

    if (!meta.isInitiator) return;

    const finalStatus = statusOverride || meta.status;
    let durationSec = 0;
    if (finalStatus === 'completed' && meta.connectTime) {
      durationSec = Math.max(1, Math.round((Date.now() - meta.connectTime) / 1000));
    }

    let formattedDuration = "";
    if (durationSec > 0) {
      const hrs = Math.floor(durationSec / 3600);
      const mins = Math.floor((durationSec % 3600) / 60);
      const secs = durationSec % 60;
      if (hrs > 0) formattedDuration = `${hrs}h ${mins}m ${secs}s`;
      else if (mins > 0) formattedDuration = `${mins}m ${secs}s`;
      else formattedDuration = `${secs}s`;
    }

    const contentText = finalStatus === 'missed'
      ? (meta.type === 'video' ? 'Missed video call' : 'Missed audio call')
      : finalStatus === 'declined'
      ? 'Call declined'
      : (meta.type === 'video' ? `Video call ended ${formattedDuration ? '• ' + formattedDuration : ''}` : `Audio call ended ${formattedDuration ? '• ' + formattedDuration : ''}`);

    const fileName = `call_log:${meta.type}:${finalStatus}:${durationSec}`;

    try {
      await fetch(`/api/dm/${meta.user.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: contentText,
          fileName: fileName,
          fileType: "call_log"
        })
      });
    } catch (e) {
      console.error("Failed to post call log to chat:", e);
    }
  };

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

  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);

  const processIceQueue = async (pc: RTCPeerConnection) => {
    while (iceCandidatesQueueRef.current.length > 0) {
      const cand = iceCandidatesQueueRef.current.shift();
      if (cand) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.error("Error adding queued ice candidate:", e);
        }
      }
    }
  };

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
      callMetaRef.current = {
        user: data.caller,
        type: data.type,
        isInitiator: false,
        startTime: Date.now(),
        connectTime: null,
        status: 'missed',
        logged: false
      };
      ringer.startIncoming();
      startVibration();
    });

    socket.on("answer-made", async (data) => {
      ringer.stop();
      stopVibration();
      if (callMetaRef.current) {
        callMetaRef.current.connectTime = Date.now();
        callMetaRef.current.status = 'completed';
      }
      if (peerConnection.current) {
        try {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          await processIceQueue(peerConnection.current);
        } catch (e) {
          console.error("Failed to set remote description on answer:", e);
        }
        setIsCalling(false);
      }
    });

    socket.on("ice-candidate", async (data) => {
      const pc = peerConnection.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error("Error adding ice candidate:", e);
        }
      } else {
        iceCandidatesQueueRef.current.push(data.candidate);
      }
    });

    socket.on("call-rejected", () => {
      ringer.stop();
      stopVibration();
      sendCallLogMessage('missed');
      cleanupCall();
    });

    socket.on("call-ended", () => {
      ringer.stop();
      stopVibration();
      sendCallLogMessage();
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
    iceCandidatesQueueRef.current = [];
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("ice-candidate", { candidate: event.candidate, to: targetUserId });
      }
    };

    pc.ontrack = (event) => {
      console.log("WebRTC track received:", event.track.kind, event.streams);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else if (event.track) {
        setRemoteStream(prev => {
          const stream = prev ? new MediaStream(prev.getTracks()) : new MediaStream();
          stream.addTrack(event.track);
          return stream;
        });
      }
    };

    peerConnection.current = pc;
    return pc;
  };

  const initiateCall = async (user: Caller, type: 'video' | 'audio') => {
    const activeSocket = socket || getSocket();
    if (!session?.user) {
      alert("Please log in to make calls.");
      return;
    }

    callMetaRef.current = {
      user,
      type,
      isInitiator: true,
      startTime: Date.now(),
      connectTime: null,
      status: 'missed',
      logged: false
    };

    // Activate UI active call screen IMMEDIATELY for instant user feedback
    setActiveCall({ user, type, isInitiator: true });
    setIsCalling(true);
    ringer.startOutgoing();

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera/Microphone access is not supported by your browser or connection.");
      }

      let stream: MediaStream;
      try {
        const constraints = {
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } : false
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err1) {
        if (type === 'video') {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          } catch (err2) {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          }
        } else {
          throw err1;
        }
      }

      setLocalStream(stream);

      const pc = initPeerConnection(user.id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const myId = (session.user as any).id || (session.user as any).email || "me";
      activeSocket.emit("call-user", {
        userToCall: user.id,
        offer,
        type,
        caller: { id: myId, name: session.user.name || "User", avatar: session.user.image }
      });
    } catch (e: any) {
      console.error("Error starting call:", e);
      alert(e?.message || "Could not access camera or microphone. Please check device permissions.");
      cleanupCall();
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;
    const activeSocket = socket || getSocket();
    ringer.stop();
    stopVibration();

    const callToAccept = incomingCall;
    setActiveCall({ user: callToAccept.caller, type: callToAccept.type, isInitiator: false });
    setIncomingCall(null);

    if (callMetaRef.current) {
      callMetaRef.current.connectTime = Date.now();
      callMetaRef.current.status = 'completed';
    }

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera/Microphone access is not supported by your browser.");
      }

      let stream: MediaStream;
      try {
        const constraints = {
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: callToAccept.type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } : false
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err1) {
        if (callToAccept.type === 'video') {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          } catch (err2) {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          }
        } else {
          throw err1;
        }
      }

      setLocalStream(stream);

      const pc = initPeerConnection(callToAccept.caller.id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(callToAccept.offer));
      await processIceQueue(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      activeSocket.emit("make-answer", {
        to: callToAccept.caller.id,
        answer
      });
    } catch (e: any) {
      console.error("Error accepting call:", e);
      rejectCall();
      alert(e?.message || "Could not access camera or microphone.");
      cleanupCall();
    }
  };

  const rejectCall = () => {
    ringer.stop();
    stopVibration();
    if (callMetaRef.current) {
      callMetaRef.current.status = 'declined';
    }
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
    sendCallLogMessage();
    cleanupCall();
  };

  const cleanupCall = () => {
    sendCallLogMessage();
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
    callMetaRef.current = null;
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

