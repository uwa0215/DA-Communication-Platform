"use client";

import { useCall } from "./CallProvider";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export default function ActiveCall() {
  const { state, endCall } = useCall();
  const { activeCall, isCalling, localStream, remoteStream } = state;

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(e => console.log("Local play error:", e));
    }
  }, [localStream, isCalling, activeCall]);

  // Dedicated Audio output for unblocked real-time WebRTC sound
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(e => console.log("Remote audio play error:", e));
    }
  }, [remoteStream, activeCall]);

  // Dedicated Video output for video call stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(e => console.log("Remote video play error:", e));
    }
  }, [remoteStream, activeCall]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!localStream.getAudioTracks()[0]?.enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setIsVideoOff(!localStream.getVideoTracks()[0]?.enabled);
    }
  };

  if (!activeCall && !isCalling) return null;

  const userName = activeCall?.user?.name || "User";
  const userAvatar = activeCall?.user?.avatar;
  const isVideoCall = activeCall?.type === 'video';

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: '#0b132b',
      zIndex: 99997,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      
      {/* Always-mounted Dedicated Audio Element to ensure audio is output through speakers during calls */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Remote Video Element for video call streams */}
      {remoteStream && isVideoCall && (
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover' 
          }} 
        />
      )}

      {/* Voice Call Avatar & Status UI */}
      {(!remoteStream || !isVideoCall) && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white' }}>
          <div style={{ 
            width: 130, height: 130, borderRadius: '50%', background: '#1c2541', marginBottom: 24, 
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)', border: '4px solid rgba(255, 255, 255, 0.1)' 
          }}>
            {userAvatar ? (
              <Image src={userAvatar} alt={userName} width={130} height={130} style={{ objectFit: 'cover' }} unoptimized />
            ) : (
              <span style={{ fontSize: 52, fontWeight: 'bold', color: '#60a5fa' }}>{userName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <h2 style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 600 }}>{userName}</h2>
          <p style={{ margin: 0, opacity: 0.8, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: remoteStream ? '#22c55e' : '#f59e0b', display: 'inline-block' }} />
            {!remoteStream ? "Ringing..." : (isVideoCall ? "Connecting Video..." : "Voice Call Connected")}
          </p>
        </div>
      )}

      {/* Local Video (PIP) */}
      {(localStream && (activeCall?.type === 'video' || isCalling)) && (
        <div style={{
          position: 'absolute',
          bottom: 100,
          right: 24,
          width: 160,
          height: 240,
          background: '#222',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          border: '2px solid rgba(255,255,255,0.1)'
        }}>
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
          />
        </div>
      )}

      {/* Controls */}
      <div style={{
        position: 'absolute',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 16,
        padding: '12px 24px',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(10px)',
        borderRadius: 32,
      }}>
        <button 
          onClick={toggleMute}
          style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: isMuted ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)', color: isMuted ? '#000' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        
        {activeCall?.type === 'video' && (
          <button 
            onClick={toggleVideo}
            style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: isVideoOff ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)', color: isVideoOff ? '#000' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
        )}

        <button 
          onClick={endCall}
          style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <PhoneOff size={20} />
        </button>
      </div>

    </div>
  );
}
