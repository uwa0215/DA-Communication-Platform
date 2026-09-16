"use client";

import { useCall } from "./CallProvider";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";

export default function ActiveCall() {
  const { state, endCall } = useCall();
  const { activeCall, isCalling, localStream, remoteStream } = state;

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Sync Local PIP Video Stream whenever localStream changes
  useEffect(() => {
    const videoEl = localVideoRef.current;
    if (videoEl && localStream) {
      if (videoEl.srcObject !== localStream) {
        videoEl.srcObject = localStream;
      }
      videoEl.play().catch(e => console.log("Local video play error:", e));
    }
  }, [localStream, isCalling, activeCall]);

  // Sync Remote Audio Stream whenever remoteStream changes
  useEffect(() => {
    const audioEl = remoteAudioRef.current;
    if (audioEl && remoteStream) {
      if (audioEl.srcObject !== remoteStream) {
        audioEl.srcObject = remoteStream;
      }
      audioEl.play().catch(e => console.log("Remote audio play error:", e));
    }
  }, [remoteStream, activeCall]);

  // Sync Remote Video Stream whenever remoteStream changes
  useEffect(() => {
    const videoEl = remoteVideoRef.current;
    if (videoEl && remoteStream) {
      if (videoEl.srcObject !== remoteStream) {
        videoEl.srcObject = remoteStream;
      }
      videoEl.play().catch(e => console.log("Remote video play error:", e));
    }
  }, [remoteStream, activeCall]);

  // Initialize high-performance media engine for guaranteed WebRTC connectivity
  useEffect(() => {
    if (!activeCall) return;

    const loadJitsiScript = () => {
      return new Promise<void>((resolve) => {
        if (typeof window === "undefined") return resolve();
        if ((window as any).JitsiMeetExternalAPI) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = "https://meet.jit.si/external_api.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.body.appendChild(script);
      });
    };

    let isSubscribed = true;

    loadJitsiScript().then(() => {
      if (!isSubscribed || !jitsiContainerRef.current || !activeCall) return;

      if (jitsiApiRef.current) {
        try { jitsiApiRef.current.dispose(); } catch (e) {}
      }

      const roomName = `companychat_call_${[activeCall.user.id].sort().join('_')}`;

      try {
        const options = {
          roomName: roomName,
          width: "100%",
          height: "100%",
          parentNode: jitsiContainerRef.current,
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: activeCall.type === 'audio',
            disableDeepLinking: true,
            prejoinPageEnabled: false,
            enableWelcomePage: false,
            toolbarButtons: []
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
            TOOLBAR_BUTTONS: [],
            MOBILE_APP_PROMO: false,
            DEFAULT_BACKGROUND: '#090d16'
          }
        };

        const api = new (window as any).JitsiMeetExternalAPI("meet.jit.si", options);
        jitsiApiRef.current = api;
      } catch (err) {
        console.error("Jitsi init error:", err);
      }
    });

    return () => {
      isSubscribed = false;
      if (jitsiApiRef.current) {
        try { jitsiApiRef.current.dispose(); } catch (e) {}
        jitsiApiRef.current = null;
      }
    };
  }, [activeCall]);

  const toggleMute = () => {
    if (jitsiApiRef.current) {
      try { jitsiApiRef.current.executeCommand('toggleAudio'); } catch (e) {}
    }
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
    }
    setIsMuted(prev => !prev);
  };

  const toggleVideo = () => {
    if (jitsiApiRef.current) {
      try { jitsiApiRef.current.executeCommand('toggleVideo'); } catch (e) {}
    }
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
    }
    setIsVideoOff(prev => !prev);
  };

  const handleEndCall = () => {
    if (jitsiApiRef.current) {
      try { jitsiApiRef.current.executeCommand('hangup'); } catch (e) {}
      try { jitsiApiRef.current.dispose(); } catch (e) {}
      jitsiApiRef.current = null;
    }
    endCall();
  };

  if (!activeCall && !isCalling) return null;

  const userName = activeCall?.user?.name || "User";
  const userAvatar = activeCall?.user?.avatar;
  const isVideoCall = activeCall?.type === 'video';

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: '#090d16',
      zIndex: 99997,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      
      {/* High-Performance WebRTC Media Room Engine Container */}
      <div 
        ref={jitsiContainerRef} 
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          width: '100%', height: '100%',
          zIndex: 1,
          opacity: activeCall && !isCalling ? 1 : 0,
          pointerEvents: 'none'
        }}
      />

      {/* Always-mounted Dedicated Audio Element */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Remote Video Element (Full Screen Fallback) */}
      <video 
        ref={remoteVideoRef} 
        autoPlay 
        playsInline 
        style={{ 
          display: remoteStream && isVideoCall && !isVideoOff ? 'block' : 'none', 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover',
          zIndex: 2
        }} 
      />

      {/* Voice Call / Waiting Avatar & Status UI */}
      {(!remoteStream || !isVideoCall || isVideoOff) && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'white', zIndex: 10 }}>
          <div style={{ 
            width: 140, height: 140, borderRadius: '50%', background: '#1e293b', marginBottom: 24, 
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(59, 130, 246, 0.4)', border: '4px solid rgba(255, 255, 255, 0.15)' 
          }}>
            {userAvatar ? (
              <Image src={userAvatar} alt={userName} width={140} height={140} style={{ objectFit: 'cover' }} unoptimized />
            ) : (
              <span style={{ fontSize: 56, fontWeight: 'bold', color: '#60a5fa' }}>{userName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <h2 style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 700 }}>{userName}</h2>
          <p style={{ margin: 0, opacity: 0.85, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: remoteStream || activeCall ? '#22c55e' : '#f59e0b', display: 'inline-block' }} />
            {!activeCall ? "Calling..." : (isVideoCall ? "Video Call Connected" : "Voice Call Connected")}
          </p>
        </div>
      )}

      {/* Local Video (PIP) */}
      <div style={{
        position: 'absolute',
        bottom: 110,
        right: 24,
        width: 150,
        height: 220,
        background: '#0f172a',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
        border: '2px solid rgba(255,255,255,0.2)',
        zIndex: 20,
        display: localStream && isVideoCall && !isVideoOff ? 'block' : 'none'
      }}>
        <video 
          ref={localVideoRef} 
          autoPlay 
          playsInline 
          muted 
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
        />
      </div>

      {/* Meta Messenger Floating Controls */}
      <div style={{
        position: 'absolute',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 20,
        padding: '14px 28px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 40,
        border: '1px solid rgba(255,255,255,0.1)',
        zIndex: 30
      }}>
        <button 
          onClick={toggleMute}
          title={isMuted ? "Unmute" : "Mute"}
          style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', background: isMuted ? '#ffffff' : 'rgba(255,255,255,0.15)', color: isMuted ? '#000' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        
        {isVideoCall && (
          <button 
            onClick={toggleVideo}
            title={isVideoOff ? "Turn on camera" : "Turn off camera"}
            style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', background: isVideoOff ? '#ffffff' : 'rgba(255,255,255,0.15)', color: isVideoOff ? '#000' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
          >
            {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
          </button>
        )}

        <button 
          onClick={handleEndCall}
          title="End call"
          style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)', transition: 'all 0.2s ease' }}
        >
          <PhoneOff size={22} />
        </button>
      </div>

    </div>
  );
}
