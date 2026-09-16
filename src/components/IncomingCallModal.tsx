"use client";

import { useCall } from "./CallProvider";
import { Phone, PhoneOff, Video } from "lucide-react";
import Image from "next/image";

export default function IncomingCallModal() {
  const { state, acceptCall, rejectCall } = useCall();
  const { incomingCall } = state;

  if (!incomingCall) return null;

  const callerName = incomingCall?.caller?.name || "Caller";
  const callerAvatar = incomingCall?.caller?.avatar;

  return (
    <div 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999, 
        background: 'rgba(0, 0, 0, 0.75)', 
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }} 
    >
      <div 
        style={{ 
          position: 'relative',
          width: 340, 
          maxWidth: '90vw',
          textAlign: 'center', 
          padding: '36px 28px', 
          background: '#1e293b', 
          color: '#ffffff',
          borderRadius: 24, 
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <div style={{ 
            width: 90, 
            height: 90, 
            borderRadius: '50%', 
            background: 'rgba(255,255,255,0.08)', 
            margin: '0 auto 20px', 
            overflow: 'hidden', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 0 24px rgba(34, 197, 94, 0.3)',
            border: '3px solid rgba(255, 255, 255, 0.15)'
          }}>
            {callerAvatar ? (
              <Image src={callerAvatar} alt={callerName} width={90} height={90} style={{ objectFit: 'cover' }} unoptimized />
            ) : (
              <span style={{ fontSize: 36, fontWeight: 'bold', color: '#60a5fa' }}>
                {callerName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#ffffff' }}>{callerName}</h2>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 15, fontWeight: 500 }}>
            Incoming {incomingCall.type === 'video' ? 'video' : 'audio'} call...
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
          <button 
            onClick={rejectCall}
            title="Decline call"
            style={{ 
              width: 60, height: 60, borderRadius: '50%', border: 'none',
              background: '#ef4444', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(239, 68, 68, 0.5)'
            }}
          >
            <PhoneOff size={26} />
          </button>
          
          <button 
            onClick={acceptCall}
            title="Accept call"
            style={{ 
              width: 60, height: 60, borderRadius: '50%', border: 'none',
              background: '#22c55e', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(34, 197, 94, 0.5)',
              animation: 'pulse 1.5s infinite'
            }}
          >
            {incomingCall.type === 'video' ? <Video size={26} /> : <Phone size={26} />}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          70% { transform: scale(1.08); box-shadow: 0 0 0 14px rgba(34, 197, 94, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
      `}</style>
    </div>
  );
}
