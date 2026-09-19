"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Users, 
  Copy, MonitorUp, Check, X, Shield, Volume2
} from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import styles from "./MeetingRoomModal.module.css";

interface Participant {
  socketId: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  stream?: MediaStream;
  isMuted?: boolean;
  isVideoOff?: boolean;
}

interface MeetingRoomModalProps {
  roomId: string;
  title?: string;
  currentUser: {
    id: string;
    name: string;
    avatar?: string;
  };
  onClose: () => void;
}

export default function MeetingRoomModal({ roomId, title = "Video Meeting", currentUser, onClose }: MeetingRoomModalProps) {
  const { socket } = useSocket();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showParticipantsList, setShowParticipantsList] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});

  // Duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize Local Media Stream
  useEffect(() => {
    let mounted = true;

    async function setupLocalMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        if (mounted) {
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn("Could not access video/audio camera, trying audio only:", err);
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          if (mounted) {
            setLocalStream(audioStream);
            setIsVideoOff(true);
          }
        } catch (e) {
          console.error("No media devices available:", e);
        }
      }
    }

    setupLocalMedia();

    return () => {
      mounted = false;
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Sync Local Video Ref when localStream, screenStream, isVideoOff, or isSharingScreen changes
  useEffect(() => {
    if (localVideoRef.current) {
      const activeStream = isSharingScreen ? screenStream : localStream;
      if (activeStream && localVideoRef.current.srcObject !== activeStream) {
        localVideoRef.current.srcObject = activeStream;
      }
    }
  }, [localStream, screenStream, isVideoOff, isSharingScreen]);

  // Socket Signaling & WebRTC Peer Management
  useEffect(() => {
    if (!socket || !localStream) return;

    // Join room
    socket.emit("join-meeting-room", { roomId, user: currentUser });

    // Handle existing sockets in room
    const handleExistingParticipants = ({ existingSockets }: { existingSockets: string[] }) => {
      existingSockets.forEach(socketId => {
        createPeerConnection(socketId, true);
      });
    };

    // Handle new user joining room
    const handleUserJoined = ({ socketId, user }: { socketId: string; user: any }) => {
      setParticipants(prev => {
        if (prev.some(p => p.socketId === socketId)) return prev;
        return [...prev, { socketId, user }];
      });
      createPeerConnection(socketId, false);
    };

    // Handle user leaving room
    const handleUserLeft = ({ socketId }: { socketId: string }) => {
      if (peerConnectionsRef.current[socketId]) {
        peerConnectionsRef.current[socketId].close();
        delete peerConnectionsRef.current[socketId];
      }
      setParticipants(prev => prev.filter(p => p.socketId !== socketId));
    };

    // Handle receiving WebRTC signals
    const handleSignalReceive = async ({ senderSocketId, signal, senderUser }: any) => {
      let pc = peerConnectionsRef.current[senderSocketId];
      if (!pc) {
        pc = createPeerConnection(senderSocketId, false, senderUser);
      }

      try {
        if (signal.type === "offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("meeting-signal", {
            targetSocketId: senderSocketId,
            signal: answer,
            senderUser: currentUser
          });
        } else if (signal.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error("Signal handling error:", err);
      }
    };

    const handleMediaUpdated = ({ socketId, isMuted: muted, isVideoOff: videoOff }: any) => {
      setParticipants(prev => prev.map(p => {
        if (p.socketId === socketId) {
          return { ...p, isMuted: muted, isVideoOff: videoOff };
        }
        return p;
      }));
    };

    socket.on("room-existing-participants", handleExistingParticipants);
    socket.on("user-joined-meeting", handleUserJoined);
    socket.on("user-left-meeting", handleUserLeft);
    socket.on("meeting-signal-receive", handleSignalReceive);
    socket.on("user-media-updated", handleMediaUpdated);

    return () => {
      socket.off("room-existing-participants");
      socket.off("user-joined-meeting");
      socket.off("user-left-meeting");
      socket.off("meeting-signal-receive");
      socket.off("user-media-updated");
      socket.emit("leave-meeting-room", { roomId, userId: currentUser.id });
      
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionsRef.current = {};
    };
  }, [socket, localStream, roomId, currentUser]);

  // Create WebRTC Peer Connection for participant
  const createPeerConnection = (targetSocketId: string, isInitiator: boolean, remoteUser?: any) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    });

    peerConnectionsRef.current[targetSocketId] = pc;

    // Add local tracks to peer
    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    // ICE Candidate
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("meeting-signal", {
          targetSocketId,
          signal: { candidate: event.candidate },
          senderUser: currentUser
        });
      }
    };

    // Receive Remote Stream Track
    pc.ontrack = (event) => {
      const [remoteMediaStream] = event.streams;
      setParticipants(prev => {
        const existingIndex = prev.findIndex(p => p.socketId === targetSocketId);
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            stream: remoteMediaStream,
            user: remoteUser || updated[existingIndex].user
          };
          return updated;
        } else {
          return [...prev, {
            socketId: targetSocketId,
            user: remoteUser || { id: targetSocketId, name: "Attendee" },
            stream: remoteMediaStream
          }];
        }
      });
    };

    // Initiator creates Offer
    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          if (socket) {
            socket.emit("meeting-signal", {
              targetSocketId,
              signal: pc.localDescription,
              senderUser: currentUser
            });
          }
        })
        .catch(err => console.error("Create offer error:", err));
    }

    return pc;
  };

  // Media Controls
  const toggleMute = async () => {
    let currentStream = localStream;
    if (!currentStream || currentStream.getAudioTracks().length === 0) {
      try {
        const newAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const newTrack = newAudioStream.getAudioTracks()[0];
        if (newTrack) {
          if (!currentStream) {
            currentStream = new MediaStream([newTrack]);
            setLocalStream(currentStream);
          } else {
            currentStream.addTrack(newTrack);
          }
          Object.values(peerConnectionsRef.current).forEach(pc => pc.addTrack(newTrack, currentStream!));
        }
      } catch (err) {
        console.error("Could not obtain audio track:", err);
      }
    }

    if (currentStream) {
      const newState = !isMuted;
      currentStream.getAudioTracks().forEach(t => (t.enabled = !newState));
      setIsMuted(newState);
      if (socket) {
        socket.emit("meeting-media-update", { roomId, userId: currentUser.id, isMuted: newState, isVideoOff });
      }
    }
  };

  const toggleVideo = async () => {
    let currentStream = localStream;
    const newState = !isVideoOff;

    if (!newState) {
      // Turning camera ON
      if (!currentStream || currentStream.getVideoTracks().length === 0 || currentStream.getVideoTracks().every(t => t.readyState === 'ended')) {
        try {
          const newVideoStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }
          });
          const newTrack = newVideoStream.getVideoTracks()[0];
          if (newTrack) {
            if (!currentStream) {
              currentStream = new MediaStream([newTrack]);
              setLocalStream(currentStream);
            } else {
              currentStream.addTrack(newTrack);
            }
            Object.values(peerConnectionsRef.current).forEach(pc => pc.addTrack(newTrack, currentStream!));
          }
        } catch (err) {
          console.error("Could not obtain video track:", err);
          return;
        }
      }
    }

    if (currentStream) {
      currentStream.getVideoTracks().forEach(t => (t.enabled = !newState));
      setIsVideoOff(newState);
      if (socket) {
        socket.emit("meeting-media-update", { roomId, userId: currentUser.id, isMuted, isVideoOff: newState });
      }
    }
  };

  // Screen Share Handler
  const toggleScreenShare = async () => {
    if (isSharingScreen) {
      if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        setScreenStream(null);
      }
      setIsSharingScreen(false);
      // Revert to camera
      if (localStream && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        setScreenStream(displayStream);
        setIsSharingScreen(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = displayStream;
        }

        // Handle user stopping screen share from browser bar
        displayStream.getVideoTracks()[0].onended = () => {
          setIsSharingScreen(false);
          setScreenStream(null);
          if (localStream && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
          }
        };
      } catch (e) {
        console.error("Screen share error:", e);
      }
    }
  };

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/meeting/${roomId}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalCount = participants.length + 1; // Participants + self

  return (
    <div className={styles.meetingModalOverlay}>
      {/* ===== TOP BAR ===== */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <div className={styles.titleBadge}>
            <span className={styles.liveDot} />
            <h2 className={styles.meetingTitle}>{title}</h2>
          </div>
          <span className={styles.timerBadge}>{formatDuration(callDuration)}</span>
          <span className={styles.countBadge}>
            <Users size={14} /> {totalCount} {totalCount === 1 ? 'Attendee' : 'Attendees'}
          </span>
        </div>

        <div className={styles.topBarRight}>
          <button className={styles.topBtn} onClick={handleCopyLink} title="Copy Meeting Link">
            {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
            <span>{copied ? 'Copied Link' : 'Copy Link'}</span>
          </button>

          <button 
            className={`${styles.topBtn} ${showParticipantsList ? styles.topBtnActive : ''}`} 
            onClick={() => setShowParticipantsList(!showParticipantsList)}
            title="Attendees List"
          >
            <Users size={16} />
          </button>

          <button className={styles.closeBtn} onClick={onClose} title="Leave Meeting">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ===== MAIN VIDEO GRID ===== */}
      <div className={styles.mainCanvas}>
        <div className={`${styles.videoGrid} ${styles[`gridCount${Math.min(totalCount, 9)}`]}`}>
          
          {/* Self Local Tile */}
          <div className={styles.videoTile}>
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className={isSharingScreen ? styles.videoFeedScreenShare : styles.videoFeed}
              style={{ 
                display: (isVideoOff && !isSharingScreen) ? 'none' : 'block',
                transform: isSharingScreen ? 'none' : 'scaleX(-1)' 
              }}
            />
            {isVideoOff && !isSharingScreen && (
              <div className={styles.avatarFallback}>
                <div className={styles.avatarInner}>
                  {currentUser.avatar ? (
                    <Image src={currentUser.avatar} alt={currentUser.name} width={80} height={80} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span>{currentUser.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
              </div>
            )}

            <div className={styles.tileFooter}>
              <span className={styles.participantName}>
                {currentUser.name} (You) {isSharingScreen && '• Presenting'}
              </span>
              {isMuted ? (
                <span className={styles.muteBadgeDanger}><MicOff size={12} /></span>
              ) : (
                <span className={styles.muteBadgeOk}><Mic size={12} /></span>
              )}
            </div>
          </div>

          {/* Remote Participants Tiles */}
          {participants.map((p) => (
            <RemoteVideoTile key={p.socketId} participant={p} />
          ))}

        </div>

        {/* Side Drawer: Attendees List */}
        {showParticipantsList && (
          <div className={styles.participantsDrawer}>
            <div className={styles.drawerHeader}>
              <h3>Participants ({totalCount})</h3>
              <button className="btn-icon" onClick={() => setShowParticipantsList(false)}><X size={16} /></button>
            </div>
            <div className={styles.drawerList}>
              <div className={styles.drawerUserItem}>
                <span className={styles.userAvatarSm}>{currentUser.name.charAt(0)}</span>
                <span className={styles.userNameSm}>{currentUser.name} (Host/You)</span>
                {isMuted ? <MicOff size={14} color="#ef4444" /> : <Mic size={14} color="#10b981" />}
              </div>
              {participants.map((p) => (
                <div key={p.socketId} className={styles.drawerUserItem}>
                  <span className={styles.userAvatarSm}>{p.user.name.charAt(0)}</span>
                  <span className={styles.userNameSm}>{p.user.name}</span>
                  {p.isMuted ? <MicOff size={14} color="#ef4444" /> : <Mic size={14} color="#10b981" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== BOTTOM FLOATING CONTROLS BAR ===== */}
      <div className={styles.controlBar}>
        <button 
          className={`${styles.ctrlBtn} ${isMuted ? styles.ctrlBtnOff : ''}`} 
          onClick={toggleMute}
          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>

        <button 
          className={`${styles.ctrlBtn} ${isVideoOff ? styles.ctrlBtnOff : ''}`} 
          onClick={toggleVideo}
          title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
        >
          {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
        </button>

        <button 
          className={`${styles.ctrlBtn} ${isSharingScreen ? styles.ctrlBtnActive : ''}`} 
          onClick={toggleScreenShare}
          title={isSharingScreen ? "Stop Presenting Screen" : "Share Screen"}
        >
          <MonitorUp size={22} />
        </button>

        <button 
          className={styles.ctrlBtnEndCall} 
          onClick={onClose}
          title="Leave Video Meeting"
        >
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
}

// Sub-component for rendering remote participant video stream
function RemoteVideoTile({ participant }: { participant: Participant }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  const name = participant.user?.name || "Attendee";
  const avatar = participant.user?.avatar;
  const isVideoOff = participant.isVideoOff || !participant.stream || participant.stream.getVideoTracks().length === 0;

  return (
    <div className={styles.videoTile}>
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        className={styles.videoFeed}
        style={{ display: isVideoOff ? 'none' : 'block' }}
      />
      {isVideoOff && (
        <div className={styles.avatarFallback}>
          <div className={styles.avatarInner}>
            {avatar ? (
              <Image src={avatar} alt={name} width={80} height={80} style={{ borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <span>{name.charAt(0).toUpperCase()}</span>
            )}
          </div>
        </div>
      )}

      <div className={styles.tileFooter}>
        <span className={styles.participantName}>{name}</span>
        {participant.isMuted ? (
          <span className={styles.muteBadgeDanger}><MicOff size={12} /></span>
        ) : (
          <span className={styles.muteBadgeOk}><Mic size={12} /></span>
        )}
      </div>
    </div>
  );
}
