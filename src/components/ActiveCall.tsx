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

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!localStream.getAudioTracks()[0].enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setIsVideoOff(!localStream.getVideoTracks()[0]?.enabled);
    }
  };

  if (!activeCall && !isCalling) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: '#000',
      zIndex: 99997,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      
      {/* Remote Video (Full Screen) */}
      {remoteStream && activeCall?.type === 'video' ? (
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white' }}>
          <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#333', marginBottom: 24, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {activeCall?.user.avatar ? (
              <Image src={activeCall.user.avatar} alt={activeCall.user.name} width={120} height={120} style={{ objectFit: 'cover' }} unoptimized />
            ) : (
              <span style={{ fontSize: 48, fontWeight: 'bold' }}>{activeCall?.user.name.charAt(0)}</span>
            )}
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 24 }}>{activeCall?.user.name}</h2>
          <p style={{ margin: 0, opacity: 0.7 }}>
            {!remoteStream ? "Calling..." : "Audio Call Connected"}
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
          style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: 'var(--danger)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <PhoneOff size={20} />
        </button>
      </div>

    </div>
  );
}
