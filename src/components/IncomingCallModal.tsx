"use client";

import { useCall } from "./CallProvider";
import { Phone, PhoneOff, Video } from "lucide-react";
import Image from "next/image";

export default function IncomingCallModal() {
  const { state, acceptCall, rejectCall } = useCall();
  const { incomingCall } = state;

  if (!incomingCall) return null;

  return (
    <>
      <div className="modal-overlay" style={{ zIndex: 99998, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)' }} />
      <div className="modal-content" style={{ zIndex: 99999, width: 320, textAlign: 'center', padding: '32px 24px', background: 'var(--bg-card)', borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-hover)', margin: '0 auto 16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {incomingCall.caller.avatar ? (
              <Image src={incomingCall.caller.avatar} alt={incomingCall.caller.name} width={80} height={80} style={{ objectFit: 'cover' }} unoptimized />
            ) : (
              <span style={{ fontSize: 32, fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                {incomingCall.caller.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>{incomingCall.caller.name}</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
            Incoming {incomingCall.type === 'video' ? 'video' : 'audio'} call...
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
          <button 
            onClick={rejectCall}
            style={{ 
              width: 56, height: 56, borderRadius: '50%', border: 'none',
              background: 'var(--danger)', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
            }}
          >
            <PhoneOff size={24} />
          </button>
          
          <button 
            onClick={acceptCall}
            style={{ 
              width: 56, height: 56, borderRadius: '50%', border: 'none',
              background: '#22c55e', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)',
              animation: 'pulse 1.5s infinite'
            }}
          >
            {incomingCall.type === 'video' ? <Video size={24} /> : <Phone size={24} />}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
      `}</style>
    </>
  );
}
