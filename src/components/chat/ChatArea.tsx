"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Hash, Phone, Video, Send, File, Image as ImageIcon, Smile, MoreVertical, Search, Edit2, LogOut, Check, FileText, Info, Users, Bold, Italic, List, Code, Paperclip, BellOff, Edit3, Trash2, X, Briefcase, AtSign, Plus, Building, Clock, Mail, MessageCircle, Download, Mic, Square, MessageSquare, Settings } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import EmojiPicker from "emoji-picker-react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import Image from 'next/image';
import getSuggestion from './suggestion';
import UserProfileModal from "./UserProfileModal";
import ChannelSettingsModal from "./ChannelSettingsModal";
import ThreadPanel from "./ThreadPanel";
import useSWR from "swr";
import LinkPreview from "./LinkPreview";
import { fetcher } from "@/lib/fetcher";
import styles from "./ChatArea.module.css";

const EMOJI_SET = ["👍","❤️","😂","😮","😢","🔥","🎉","✅","👏","🚀"];

interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  status: string;
  jobTitle?: string;
  department?: string;
  unit?: string;
}

interface Reaction {
  emoji: string;
  user: { id: string; name: string };
}

interface Message {
  id: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  sender: User;
  createdAt: string;
  reactions?: Reaction[];
  edited?: boolean;
  parentId?: string;
  parent?: { content?: string; sender?: { name: string } } | null;
  isDeleted?: boolean;
  _count?: { replies: number };
}

interface ChatAreaProps {
  channelId?: string;
  channelName?: string;
  isGroupChat?: boolean;
  groupAvatar?: string | null;
  dmUserId?: string;
  dmUser?: User;
  currentUserId: string;
  currentUserName: string;
  currentUserRole?: string;
}

export default function ChatArea({
  channelId,
  channelName,
  isGroupChat,
  groupAvatar,
  dmUserId,
  dmUser,
  currentUserId,
  currentUserName,
  currentUserRole = "member",
}: ChatAreaProps) {
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showInputEmoji, setShowInputEmoji] = useState(false);
  const [hoverMsgId, setHoverMsgId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<User | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [newGroupName, setNewGroupName] = useState(channelName || "");
  const [currentGroupAvatar, setCurrentGroupAvatar] = useState(groupAvatar || null);
  const [showAddPeopleModal, setShowAddPeopleModal] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<string[]>([]);
  const [isCalling, setIsCalling] = useState<'video' | 'audio' | null>(null);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const apiBase = channelId ? `/api/channels/${channelId}/messages` : `/api/dm/${dmUserId}`;
  const roomId = dmUserId ? [currentUserId, dmUserId].sort().join(":") : null;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: `Message ${channelName ? "#" + channelName : dmUser?.name}`,
      }),
      Link.configure({ openOnClick: false }),
      Mention.configure({
        HTMLAttributes: { class: 'mention-tag' },
        suggestion: getSuggestion(),
      }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setIsEditorEmpty(editor.isEmpty);
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          document.getElementById('send-btn')?.click();
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowInputEmoji(false);
      }
    }
    if (showInputEmoji) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showInputEmoji]);

  const { data: usersData } = useSWR("/api/users", fetcher);

  useEffect(() => {
    if (showAddPeopleModal && allUsers.length === 0 && usersData?.users) {
      setAllUsers(usersData.users);
    }
  }, [showAddPeopleModal, allUsers.length, usersData]);

  async function updateGroupData(updates: any) {
    if (!channelId) return;
    const res = await fetch(`/api/channels/${channelId}/group`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      if (updates.name) {
         setEditingGroupName(false);
         window.location.reload(); 
      }
    }
  }

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    setCurrentGroupAvatar(url);
    updateGroupData({ avatar: url });
  }

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const res = await fetch(apiBase);
    const data = await res.json();
    setMessages(data.messages || []);
    setHasMore((data.messages || []).length === 50);
    setLoading(false);
  }, [apiBase]);

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldestMessage = messages[0];
    if (!oldestMessage) return;
    
    const cursor = oldestMessage.createdAt;
    const url = new URL(apiBase, window.location.origin);
    url.searchParams.append("cursor", cursor);
    
    const res = await fetch(url.toString());
    const data = await res.json();
    const newMessages = data.messages || [];
    
    if (newMessages.length < 50) {
      setHasMore(false);
    }
    
    // Remember scroll position
    const scrollContainer = document.querySelector(`.${styles.messagesScroll}`);
    const scrollHeightBefore = scrollContainer?.scrollHeight || 0;
    
    setMessages(prev => [...newMessages, ...prev]);
    
    // Restore scroll position after React updates
    setTimeout(() => {
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight - scrollHeightBefore;
      }
    }, 0);
    
    setLoadingMore(false);
  };

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    editor?.commands.setContent('');
    setSending(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    if (channelId) {
      socket.emit("join-channel", channelId);
      socket.on("new-message", (msg: Message & { parentId?: string }) => {
        if (msg.parentId) {
          setMessages(m => m.map(x => x.id === msg.parentId ? {
            ...x,
            _count: { replies: ((x as any)._count?.replies || 0) + 1 }
          } : x));
          return;
        }

        if (msg.sender.id !== currentUserId && typeof document !== "undefined" && !document.hasFocus() && "Notification" in window && Notification.permission === "granted") {
          const text = msg.content ? msg.content.replace(/<[^>]*>?/gm, '') : (msg.fileName ? `Attachment: ${msg.fileName}` : 'New message');
          new Notification(`${msg.sender.name} in #${channelName}`, { body: text, icon: msg.sender.avatar || '/favicon.ico' });
        }
        setMessages(m => {
          const filtered = m.filter(x => !(x.id.startsWith("optimistic-") && (x.content === msg.content || x.fileName === msg.fileName) && x.sender.id === msg.sender.id));
          return [...filtered, msg];
        });
      });
      socket.on("user-typing", ({ userId, userName }: any) => {
        if (userId !== currentUserId) {
          setTypingUsers(t => [...new Set([...t, userName])]);
        }
      });
      socket.on("user-stop-typing", ({ userId }: any) => {
        setTypingUsers(t => t.filter(u => u !== userId));
      });
      socket.on("reaction-update", ({ messageId, reactions }: any) => {
        setMessages(msgs =>
          msgs.map(m => m.id === messageId ? { ...m, reactions } : m)
        );
      });
      socket.on("message-updated", (msg: Message) => {
        setMessages(m => m.map(x => x.id === msg.id ? { ...x, content: msg.content, edited: true } : x));
      });
      socket.on("message-deleted", (msg: Message) => {
        setMessages(m => m.map(x => x.id === msg.id ? { ...x, isDeleted: true } : x));
      });
    } else if (roomId) {
      socket.emit("join-dm", roomId);
      socket.on("new-dm", (msg: Message) => {
        if (msg.sender.id !== currentUserId && typeof document !== "undefined" && !document.hasFocus() && "Notification" in window && Notification.permission === "granted") {
          const text = msg.content ? msg.content.replace(/<[^>]*>?/gm, '') : (msg.fileName ? `Attachment: ${msg.fileName}` : 'New message');
          new Notification(msg.sender.name, { body: text, icon: msg.sender.avatar || '/favicon.ico' });
        }
        setMessages(m => {
          const filtered = m.filter(x => !(x.id.startsWith("optimistic-") && (x.content === msg.content || x.fileName === msg.fileName) && x.sender.id === msg.sender.id));
          return [...filtered, msg];
        });
      });
      socket.on("message-updated", (msg: Message) => {
        setMessages(m => m.map(x => x.id === msg.id ? { ...x, content: msg.content, edited: true } : x));
      });
      socket.on("message-deleted", (msg: Message) => {
        setMessages(m => m.map(x => x.id === msg.id ? { ...x, isDeleted: true } : x));
      });
    }

    return () => {
      if (channelId) {
        socket.emit("leave-channel", channelId);
        socket.off("new-message");
        socket.off("user-typing");
        socket.off("user-stop-typing");
        socket.off("reaction-update");
        socket.off("message-updated");
        socket.off("message-deleted");
      } else if (roomId) {
        socket.emit("leave-dm", roomId);
        socket.off("new-dm");
        socket.off("message-updated");
        socket.off("message-deleted");
      }
    };
  }, [socket, channelId, roomId, currentUserId]);

  useEffect(() => {
    if (roomId && dmUser && messages.length > 0) {
      const hasUnread = messages.some(m => !(m as any).read && m.sender.id === dmUser.id);
      if (hasUnread) {
        fetch(`/api/dm/${dmUser.id}/read`, { method: "POST" }).catch(console.error);
        setMessages(msgs => msgs.map(m => m.sender.id === dmUser.id ? { ...m, read: true } : m));
      }
    }
  }, [messages, roomId, dmUser]);

  useEffect(() => {
    if (!socket || !roomId) return;
    socket.on("messages-read", ({ readerId }: { readerId: string }) => {
      if (readerId === dmUser?.id) {
        setMessages(msgs => msgs.map(m => m.sender.id === currentUserId ? { ...m, read: true } : m));
      }
    });
    return () => {
      socket.off("messages-read");
    };
  }, [socket, roomId, dmUser, currentUserId]);

  const lastReadMessageId = useMemo(() => {
    if (!roomId) return null;
    const myReadMessages = messages.filter(m => m.sender.id === currentUserId && (m as any).read);
    return myReadMessages.length > 0 ? myReadMessages[myReadMessages.length - 1].id : null;
  }, [messages, roomId, currentUserId]);

  async function sendMessage(e?: any) {
    if (e && e.preventDefault) e.preventDefault();
    if (!editor || isEditorEmpty || sending) return;
    
    const content = editor.getHTML();
    
    // 1. Create and append optimistic message
    const tempId = `optimistic-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      content: content,
      sender: {
        id: currentUserId,
        name: currentUserName,
        status: "online"
      },
      createdAt: new Date().toISOString(),
      reactions: [],
      parent: replyingToMessage || undefined
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    
    // 2. Clear editor instantly
    editor?.commands.setContent('');
    setIsEditorEmpty(true);
    const parentIdToUse = replyingToMessage?.id;
    setReplyingToMessage(null);
    
    try {
      if (editingMessageId) {
        await fetch(`/api/messages/${editingMessageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, type: channelId ? 'channel' : 'dm' }),
        });
        setEditingMessageId(null);
      } else {
        await fetch(apiBase, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, parentId: parentIdToUse }),
        });
      }
      
      if (channelId && socket) {
        socket.emit("typing-stop", { channelId, userId: currentUserId });
      }
    } catch (err) {
      console.error("Error sending message:", err);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(x => x.id !== tempId));
    }
  }

  async function deleteMessage(messageId: string) {
    await fetch(`/api/messages/${messageId}?type=${channelId ? 'channel' : 'dm'}`, {
      method: "DELETE"
    });
    setMessageToDelete(null);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSending(true);
    
    const formData = new FormData();
    formData.append("file", file);
    
    // 1. Create optimistic attachment message
    const tempId = `optimistic-${Date.now()}`;
    const localUrl = URL.createObjectURL(file);
    
    const optimisticMsg: Message = {
      id: tempId,
      content: "",
      fileUrl: localUrl,
      fileName: file.name,
      fileType: file.type,
      sender: {
        id: currentUserId,
        name: currentUserName,
        status: "online"
      },
      createdAt: new Date().toISOString(),
      reactions: []
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || `Upload failed (status: ${res.status})`);
      }

      const msgRes = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content: "", 
          fileUrl: data.url, 
          fileName: data.fileName, 
          fileType: data.fileType 
        }),
      });

      if (!msgRes.ok) {
        const errData = await msgRes.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to save message (status: ${msgRes.status})`);
      }
    } catch (err: any) {
      console.error("Upload error details:", err);
      alert(`File upload failed: ${err.message || err}`);
      // Remove optimistic message on upload failure
      setMessages(prev => prev.filter(x => x.id !== tempId));
    } finally {
      setSending(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new (globalThis as any).File(audioChunksRef.current, "voice_message.webm", { type: "audio/webm" });
        audioChunksRef.current = [];
        
        const fakeEvent = {
          target: { files: [audioBlob] }
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        
        await handleFileUpload(fakeEvent);
      };

      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      audioChunksRef.current = [];
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };



  async function toggleReaction(messageId: string, emoji: string) {
    const type = channelId ? "channel" : "dm";
    
    // Optimistic Update
    setMessages(msgs => msgs.map(m => {
      if (m.id !== messageId) return m;

      const userReactionIndex = m.reactions?.findIndex(
        r => r.emoji === emoji && r.user.id === currentUserId
      );

      let newReactions = [...(m.reactions || [])];

      if (userReactionIndex !== undefined && userReactionIndex !== -1) {
        // Remove reaction
        newReactions.splice(userReactionIndex, 1);
      } else {
        // Add reaction
        newReactions.push({
          emoji,
          user: { id: currentUserId, name: currentUserName }
        });
      }

      return { ...m, reactions: newReactions };
    }));

    await fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, emoji, type }),
    });
  }

  function groupReactions(reactions?: Reaction[]) {
    const map: Record<string, { count: number; users: string[] }> = {};
    if (!reactions) return map;
    reactions.forEach(r => {
      if (!map[r.emoji]) map[r.emoji] = { count: 0, users: [] };
      map[r.emoji].count++;
      map[r.emoji].users.push(r.user.name);
    });
    return map;
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  }

  function initials(name: string) {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  }

  // Group messages by sender+time (5 min window)
  function shouldShowHeader(i: number, msgList: Message[]) {
    if (i === 0) return true;
    const prev = msgList[i - 1];
    const curr = msgList[i];
    if (prev.sender.id !== curr.sender.id) return true;
    const diff = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
    return diff > 5 * 60 * 1000;
  }

  function shouldShowDate(i: number, msgList: Message[]) {
    if (i === 0) return true;
    const prev = new Date(msgList[i - 1].createdAt).toDateString();
    const curr = new Date(msgList[i].createdAt).toDateString();
    return prev !== curr;
  }

  const title = channelName ? `#${channelName}` : dmUser?.name;

  return (
    <div className={styles.chatArea}>
      {/* Header */}
      <div className={styles.chatHeader}>
        <div className={styles.chatHeaderLeft}>
          {channelName
            ? <Hash size={20} className={styles.chatHeaderIcon} />
            : <div 
                className={`avatar avatar-sm status-${dmUser?.status || "offline"}`}
                style={{ cursor: "pointer" }}
                onClick={() => dmUser && setSelectedUserForProfile(dmUser)}
              >
                {dmUser?.avatar ? <Image src={dmUser.avatar} alt={dmUser.name} width={32} height={32} /> : initials(dmUser?.name || "U")}
                <span className="status-dot" />
              </div>
          }
          <div>
            <h2 
              className={styles.chatHeaderTitle}
              style={{ cursor: dmUser ? "pointer" : "default" }}
              onClick={() => dmUser && setSelectedUserForProfile(dmUser)}
            >
              {title}
            </h2>
            {channelName && <p className={styles.chatHeaderSub}>Company channel</p>}
            {dmUser && (
              <p className={styles.chatHeaderSub} style={{ textTransform: "capitalize" }}>
                {dmUser.jobTitle && (
                  <span style={{ fontWeight: 600, marginRight: 8, color: "var(--text-primary)" }}>
                    {dmUser.jobTitle} {dmUser.department || dmUser.unit ? `(${dmUser.department || dmUser.unit})` : ""}
                  </span>
                )}
                <span className={`status-${dmUser.status}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span className="status-dot" style={{ position: "relative", width: 8, height: 8, border: "none" }} />
                  {dmUser.status}
                </span>
              </p>
            )}
          </div>
        </div>
        <div className={styles.chatHeaderActions}>
          <button className={`btn-icon ${isCalling === 'audio' ? styles.btnIconActive : ""}`} title="Voice call" aria-label="Start voice call" onClick={() => setIsCalling('audio')}>
            <Phone size={18} />
          </button>
          <button className={`btn-icon ${isCalling === 'video' ? styles.btnIconActive : ""}`} title="Video call" aria-label="Start video call" onClick={() => setIsCalling('video')}>
            <Video size={18} />
          </button>
          <button className={`btn-icon ${showSearch ? styles.btnIconActive : ""}`} title="Search" aria-label="Search messages" onClick={() => setShowSearch(!showSearch)}>
            <Search size={18} />
          </button>
          <button 
            className={`btn-icon ${showDetailsPanel ? styles.btnIconActive : ""}`} 
            title="Toggle Details" 
            aria-label="Toggle Details Panel"
            onClick={() => setShowDetailsPanel(!showDetailsPanel)}
          >
            <Info size={18} />
          </button>
          {channelId && (
            <button 
              className={`btn-icon`} 
              title="Channel Settings" 
              aria-label="Channel Settings"
              onClick={() => setShowChannelSettings(true)}
            >
              <Settings size={18} />
            </button>
          )}
        </div>
      </div>

      {isCalling && (
        <div className={styles.callOverlay}>
          <div className={styles.callAvatarWrap}>
            <div className={styles.pulseRing}></div>
            <div className={styles.pulseRing}></div>
            <div className={styles.pulseRing}></div>
            <div className={styles.callAvatar}>
              {dmUser?.avatar || groupAvatar ? (
                <Image src={dmUser?.avatar || groupAvatar || ""} alt="Avatar" width={100} height={100} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                initials(dmUser?.name || channelName || 'U')
              )}
            </div>
          </div>
          
          <h2 className={styles.callTitle}>
            {isCalling === 'video' ? 'Video Calling' : 'Voice Calling'} {title}...
          </h2>
          <p className={styles.callSub}>Ringing...</p>
          
          <div className={styles.callActions}>
            <button className={`${styles.callBtn} ${styles.callBtnAccept}`}>
              {isCalling === 'video' ? <Video size={28} /> : <Phone size={28} />}
            </button>
            <button className={`${styles.callBtn} ${styles.callBtnReject}`} onClick={() => setIsCalling(null)}>
              <Phone size={28} style={{ transform: 'rotate(135deg)' }} />
            </button>
          </div>
        </div>
      )}

      <div className={styles.chatLayoutWrapper}>
        {/* Main Chat Column */}
        <div className={styles.chatMainColumn}>
          {showSearch && (
            <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Search size={16} color="var(--text-muted)" />
              <input 
                autoFocus
                placeholder={`Search in ${title}...`}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 14 }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="btn-icon" onClick={() => { setShowSearch(false); setSearchQuery(""); }}><X size={16} /></button>
            </div>
          )}
          {/* Messages */}
          <div className={styles.messageList} id="message-list">
        {loading ? (
          <div className={styles.loadingWrap}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className={styles.skeletonRow}>
                <div className={`skeleton ${styles.skeletonAvatar}`} />
                <div className={styles.skeletonLines}>
                  <div className={`skeleton ${styles.skeletonName}`} />
                  <div className={`skeleton ${styles.skeletonText}`} />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              {channelName ? <Hash size={40} /> : <AtSign size={40} />}
            </div>
            <h3 className={styles.emptyTitle}>
              {channelName ? `Welcome to #${channelName}!` : `Start a conversation with ${dmUser?.name}`}
            </h3>
            <p className={styles.emptySub}>
              {channelName
                ? "This is the start of the channel. Share ideas, updates, and more!"
                : "Send a message to get started."
              }
            </p>
          </div>
        ) : (
          (() => {
            const displayMessages = searchQuery.trim()
              ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
              : messages;
              
            return displayMessages.length === 0 ? (
              <div className={styles.emptyState} style={{ opacity: 0.7 }}>
                <Search size={40} className={styles.emptyIcon} style={{ background: 'transparent', marginBottom: 16 }} />
                <h3 className={styles.emptyTitle}>No results found</h3>
                <p className={styles.emptySub}>Try searching for something else.</p>
              </div>
            ) : (
              <>
                {hasMore && !searchQuery.trim() && (
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <button 
                      onClick={loadMoreMessages} 
                      disabled={loadingMore}
                      className="btn btn-ghost"
                      style={{ fontSize: 13 }}
                    >
                      {loadingMore ? 'Loading...' : 'Load older messages'}
                    </button>
                  </div>
                )}
                {displayMessages.map((msg, i) => {
              const showHeader = shouldShowHeader(i, displayMessages);
              const isLastInSequence = i === displayMessages.length - 1 || shouldShowHeader(i + 1, displayMessages);
              const showDate = shouldShowDate(i, displayMessages);
              const isMine = msg.sender.id === currentUserId;
              const grouped = groupReactions(msg.reactions);

              let groupPositionClass = "";
              if (showHeader && isLastInSequence) groupPositionClass = styles.msgSingle;
              else if (showHeader) groupPositionClass = styles.msgGroupTop;
              else if (isLastInSequence) groupPositionClass = styles.msgGroupBottom;
              else groupPositionClass = styles.msgGroupMiddle;

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className={styles.dateDivider}>
                      <span>{formatDate(msg.createdAt)}</span>
                    </div>
                  )}
                <div
                  className={`${styles.messageRow} ${!showHeader ? styles.messageRowCompact : ""} ${isMine ? styles.messageRowMine : ""}`}
                  onMouseEnter={() => setHoverMsgId(msg.id)}
                  onMouseLeave={() => setHoverMsgId(null)}
                >
                  {!isMine && isLastInSequence ? (
                    <div 
                      className={`avatar avatar-md ${styles.msgAvatar} status-${msg.sender.status}`}
                      onClick={() => setSelectedUserForProfile(msg.sender)}
                      style={{ alignSelf: 'flex-end', marginBottom: 4 }}
                    >
                      {msg.sender.avatar
                        ? <Image src={msg.sender.avatar} alt={msg.sender.name} width={32} height={32} />
                        : initials(msg.sender.name)
                      }
                    </div>
                  ) : !isMine ? (
                    <div className={styles.msgAvatarPlaceholder}>
                      {hoverMsgId === msg.id && (
                        <span className={styles.msgTime}>{formatTime(msg.createdAt)}</span>
                      )}
                    </div>
                  ) : null}

                  <div className={styles.msgBody}>
                    {showHeader && !isMine && !dmUserId && (
                      <div className={styles.msgHeader}>
                        <span 
                          className={styles.msgSender}
                          style={{ cursor: "pointer", fontSize: 12, marginLeft: 12 }}
                          onClick={() => setSelectedUserForProfile(msg.sender)}
                        >
                          {msg.sender.name}
                        </span>
                      </div>
                    )}

                    {(msg as any).isDeleted ? (
                      <div className={styles.msgContent} style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        This message was deleted
                      </div>
                    ) : (
                      <>
                        <div className={styles.msgContentWrapper} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                          {msg.parent && (
                            <div className={styles.quotePreview} style={{
                              padding: '6px 10px',
                              marginBottom: 4,
                              background: 'var(--bg-hover)',
                              borderRadius: 8,
                              borderLeft: `4px solid ${isMine ? 'var(--primary)' : 'var(--text-muted)'}`,
                              fontSize: 12,
                              color: 'var(--text-secondary)',
                              maxWidth: '100%'
                            }}>
                              <div style={{ fontWeight: 600, marginBottom: 2, fontSize: 11 }}>{msg.parent.sender?.name}</div>
                              <div className="line-clamp-1" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} dangerouslySetInnerHTML={{ __html: msg.parent.content || "Sent an attachment" }} />
                            </div>
                          )}
                          {msg.content && msg.content !== "Sent a file" && msg.content !== "<p>Sent a file</p>" && (() => {
                            let linkMatch = null;
                            if (msg.content) {
                              linkMatch = msg.content.match(/<a [^>]*href="([^"]+)"/);
                              if (!linkMatch) {
                                linkMatch = msg.content.match(/(https?:\/\/[^\s<]+)/);
                              }
                            }
                            return (
                              <>
                                <div className={`${styles.msgContent} ${isMine ? styles.msgContentMine : styles.msgContentTheirs} ${groupPositionClass}`} dangerouslySetInnerHTML={{ __html: msg.content }} />
                                {linkMatch && linkMatch[1] && (
                                  <LinkPreview url={linkMatch[1]} />
                                )}
                              </>
                            );
                          })()}
                          
                          {/* Message Actions (on hover) */}
                          {hoverMsgId === msg.id && !(msg as any).isDeleted && (
                            <div className={styles.msgActions}>
                              <button
                                className={`btn-icon ${styles.msgActionBtn}`}
                                onClick={() => setShowEmoji(true)}
                                title="Add reaction"
                              >
                                <Smile size={15} />
                              </button>
                              <button
                                className={`btn-icon ${styles.msgActionBtn}`}
                                onClick={() => setActiveThreadId(msg.id)}
                                title="Reply in thread"
                              >
                                <MessageSquare size={15} />
                              </button>
                              <button
                                className={`btn-icon ${styles.msgActionBtn}`}
                                onClick={() => { setReplyingToMessage(msg); editor?.commands.focus(); }}
                                title="Quote Reply"
                              >
                                <MessageCircle size={15} />
                              </button>
                              {isMine && (
                                <button
                                  className={`btn-icon ${styles.msgActionBtn}`}
                                  onClick={() => {
                                    editor?.commands.setContent(msg.content);
                                    setEditingMessageId(msg.id);
                                    editor?.commands.focus();
                                  }}
                                  title="Edit message"
                                >
                                  <Edit3 size={15} />
                                </button>
                              )}
                              {(isMine || currentUserRole === "admin" || currentUserRole === "moderator") && (
                                <button
                                  className={`btn-icon ${styles.msgActionBtn}`}
                                  onClick={() => setMessageToDelete(msg.id)}
                                  title="Delete message"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          )}

                          {/* Inline emoji picker */}
                          {showEmoji && hoverMsgId === msg.id && (
                            <div className={styles.emojiPicker}>
                              {EMOJI_SET.map(e => (
                                <button
                                  key={e}
                                  className={styles.emojiPickerBtn}
                                  onClick={() => { toggleReaction(msg.id, e); setShowEmoji(false); }}
                                >
                                  {e}
                                </button>
                              ))}
                              <button className={styles.emojiClose} onClick={() => setShowEmoji(false)}>
                                <X size={12} />
                              </button>
                            </div>
                          )}
                        </div>

                        {msg.fileUrl && (() => {
                          const isImage = msg.fileType?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)($|\?)/i.test(msg.fileUrl || "");
                          const isAudio = msg.fileType?.startsWith("audio/") || /\.(mp3|wav|webm|ogg)($|\?)/i.test(msg.fileUrl || "");
                          return (
                            <div className={styles.fileAttachment}>
                              {isImage ? (
                                <img 
                                  src={msg.fileUrl} 
                                  alt={msg.fileName || "Uploaded image"} 
                                  className={styles.fileImg} 
                                  onClick={() => setLightboxUrl(msg.fileUrl!)}
                                  title="Click to view image"
                                />
                              ) : isAudio ? (
                                <audio controls src={msg.fileUrl} style={{ height: 40, outline: 'none', maxWidth: 250 }} />
                              ) : (
                                <a href={msg.fileUrl} download={msg.fileName} target="_blank" rel="noopener noreferrer"
                                  className={styles.fileLink}>
                                  📎 {msg.fileName}
                                </a>
                              )}
                            </div>
                          );
                        })()}
                        {isMine && (
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', marginTop: 4, marginRight: 4 }}>
                            {formatTime(msg.createdAt)}
                          </div>
                        )}
                      </>
                    )}

                    {/* Reactions */}
                    {Object.keys(grouped).length > 0 && (
                      <div className={styles.reactionsRow}>
                        {Object.entries(grouped).map(([emoji, { count, users }]) => (
                          <button
                            key={emoji}
                            className={styles.reactionBtn}
                            onClick={() => toggleReaction(msg.id, emoji)}
                            title={users.join(", ")}
                          >
                            {emoji} <span>{count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                                 {/* Thread Indicator */}
                    {((msg as any)._count?.replies > 0) && (
                      <div style={{ marginTop: 8 }}>
                        <button
                          className={styles.threadIndicatorBtn}
                          onClick={() => setActiveThreadId(msg.id)}
                        >
                          <MessageSquare size={14} style={{ marginRight: 6 }} />
                          {(msg as any)._count.replies} {(msg as any)._count.replies === 1 ? 'reply' : 'replies'}
                        </button>
                      </div>
                    )}
                    
                    {lastReadMessageId === msg.id && dmUser && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                        <div className={`avatar avatar-sm status-${dmUser.status}`} style={{ width: 14, height: 14, fontSize: 8 }} title={`Seen by ${dmUser.name}`}>
                          {dmUser.avatar ? <Image src={dmUser.avatar} alt={dmUser.name} width={14} height={14} /> : initials(dmUser.name)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </>
          );
        })()
      )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className={`${styles.messageRow}`} style={{ paddingLeft: 12, paddingBottom: 16 }}>
            <div className={`avatar avatar-md ${styles.msgAvatar}`} style={{ alignSelf: 'flex-end', marginBottom: 4, opacity: 0.7 }}>
              {initials(typingUsers[0] || "User")}
            </div>
            <div className={styles.msgBody}>
              <div className={styles.msgHeader}>
                <span className={styles.msgSender} style={{ fontSize: 12, marginLeft: 12, opacity: 0.7 }}>
                  {typingUsers.join(", ")}
                </span>
              </div>
              <div className={`${styles.msgContentWrapper}`}>
                <div className={`${styles.msgContent} ${styles.msgContentTheirs}`} style={{ padding: '8px 12px' }}>
                  <span className={styles.typingDots}>
                    <span /><span /><span />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className={styles.inputArea}>
        {replyingToMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'var(--bg-hover)',
            borderRadius: '8px 8px 0 0',
            borderBottom: '1px solid var(--border)',
            borderLeft: '4px solid var(--primary)',
            fontSize: 12,
            marginBottom: 0,
            zIndex: 1
          }}>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: 2 }}>Replying to {replyingToMessage.sender?.name}</div>
              <div className="line-clamp-1" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} dangerouslySetInnerHTML={{ __html: replyingToMessage.content || "Sent an attachment" }} />
            </div>
            <button className="btn-icon" style={{ marginLeft: 8 }} onClick={() => setReplyingToMessage(null)}>
              <X size={16} />
            </button>
          </div>
        )}
        <div className={styles.inputWrap} style={{ borderTopLeftRadius: replyingToMessage ? 0 : 8, borderTopRightRadius: replyingToMessage ? 0 : 8 }}>
          <button 
            className={`btn-icon ${styles.toolbarBtn}`} 
            title="Attach file" 
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus size={20} />
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: "none" }} 
          />

          {isRecording ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px' }}>
              <div style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--danger)', animation: 'pulse 1.5s infinite' }} />
                Recording ({Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')})
              </div>
              <div style={{ flex: 1 }} />
              <button className="btn-icon" onClick={cancelRecording} title="Cancel" style={{ color: 'var(--text-muted)' }}>
                <Trash2 size={20} />
              </button>
              <button className="btn-icon" onClick={stopRecording} title="Send" style={{ color: 'var(--primary)' }}>
                <Send size={20} />
              </button>
            </div>
          ) : (
            <div className={`${styles.messageInput} tiptap-wrapper`} style={{ cursor: 'text' }} onClick={() => editor?.commands.focus()}>
              <EditorContent editor={editor} />
            </div>
          )}

          {!isRecording && (
            <div style={{ position: "relative", display: "flex", alignItems: "center" }} ref={emojiPickerRef}>
              <button 
                className={`btn-icon ${styles.toolbarBtn} ${showInputEmoji ? styles.toolbarBtnActive : ''}`} 
                title="Emoji"
                onClick={() => setShowInputEmoji(!showInputEmoji)}
              >
                <Smile size={20} />
              </button>
              {showInputEmoji && (
                <div style={{ position: "absolute", bottom: "100%", right: 0, marginBottom: "8px", zIndex: 9999 }}>
                  <EmojiPicker onEmojiClick={(e) => {
                    editor?.chain().focus().insertContent(e.emoji).run();
                    setShowInputEmoji(false);
                  }} />
                </div>
              )}
            </div>
          )}

          {!isRecording && !editingMessageId && (
            <button
              className={`btn-icon ${styles.toolbarBtn}`}
              onClick={startRecording}
              title="Record Voice Message"
            >
              <Mic size={20} />
            </button>
          )}

          {!isRecording && (
            <button
              id="send-btn"
              className={`${styles.sendBtn} ${!isEditorEmpty ? styles.sendBtnActive : ""}`}
              onClick={sendMessage}
              disabled={isEditorEmpty || sending}
              aria-label={editingMessageId ? "Save changes" : "Send message"}
            >
              {sending ? <span className="spinner" style={{ width: 16, height: 16 }} /> : (editingMessageId ? <Check size={18} /> : <Send size={18} />)}
            </button>
          )}
          {editingMessageId && (
            <button
              className={`btn-icon ${styles.toolbarBtn}`}
              onClick={() => { setEditingMessageId(null); editor?.commands.setContent(''); }}
              title="Cancel Edit"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>
      </div> {/* End Main Column */}

      {/* Details or Thread Panel */}
      {activeThreadId ? (() => {
        const parentMsg = messages.find(m => m.id === activeThreadId);
        if (!parentMsg) return null;
        return (
          <ThreadPanel
            activeThreadId={activeThreadId}
            parentMessage={parentMsg}
            channelId={channelId}
            dmUserId={dmUserId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onClose={() => setActiveThreadId(null)}
          />
        );
      })() : showDetailsPanel && (
        <div className={styles.chatDetailsPanel}>
          <div className={styles.detailsHeader}>
            <h3>Details</h3>
            <button className="btn-icon" onClick={() => setShowDetailsPanel(false)}><X size={16}/></button>
          </div>
          
          <div className={styles.detailsScroll}>
            {dmUser ? (
              // DM User Details
              <div className={styles.detailsContent}>
                <div className={styles.detailsHero}>
                  <div className={`avatar avatar-xl status-${dmUser.status}`} style={{ width: 80, height: 80, fontSize: 32, marginBottom: 16 }}>
                    {dmUser.avatar ? <Image src={dmUser.avatar} alt={dmUser.name} width={80} height={80} /> : initials(dmUser.name)}
                    <span className="status-dot" style={{ width: 16, height: 16, borderWidth: 3 }} />
                  </div>
                  <h3 className={styles.detailsName}>{dmUser.name}</h3>
                  <div className={styles.detailsStatusText}>
                    <span className={`status-${dmUser.status}`}><span className="status-dot" style={{ position: "relative", width: 8, height: 8, border: "none" }} /></span>
                    <span style={{ textTransform: 'capitalize' }}>{dmUser.status}</span>
                  </div>
                </div>

                <div className={styles.detailsSection}>
                  <div className={styles.detailsSectionTitle}>About</div>
                  
                  {dmUser.jobTitle && (
                    <div className={styles.detailItem}>
                      <Briefcase size={16} className={styles.detailIcon} />
                      <div>
                        <div className={styles.detailLabel}>Role</div>
                        <div className={styles.detailValue}>{dmUser.jobTitle}</div>
                      </div>
                    </div>
                  )}
                  
                  {(dmUser.department || dmUser.unit) && (
                    <div className={styles.detailItem}>
                      <Building size={16} className={styles.detailIcon} />
                      <div>
                        <div className={styles.detailLabel}>Department</div>
                        <div className={styles.detailValue}>{dmUser.department} {dmUser.unit && `(${dmUser.unit})`}</div>
                      </div>
                    </div>
                  )}

                  <div className={styles.detailItem}>
                    <Mail size={16} className={styles.detailIcon} />
                    <div>
                      <div className={styles.detailLabel}>Email</div>
                      <div className={styles.detailValue}>{dmUser.email || `${dmUser.name.split(' ')[0].toLowerCase()}@da.gov.ph`}</div>
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <Clock size={16} className={styles.detailIcon} />
                    <div>
                      <div className={styles.detailLabel}>Local Time</div>
                      <div className={styles.detailValue}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (PST)</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : isGroupChat ? (
              // Group Chat Details
              <div className={styles.detailsContent}>
                <div className={styles.detailsHero}>
                  <div style={{ position: 'relative' }}>
                    <div className={`avatar avatar-xl`} style={{ width: 80, height: 80, fontSize: 32, marginBottom: 16 }}>
                      {currentGroupAvatar ? <Image src={currentGroupAvatar} alt={channelName || "Group"} width={80} height={80} /> : initials(channelName || "Group")}
                    </div>
                    <button 
                      className="btn-icon" 
                      style={{ position: 'absolute', bottom: 12, right: -8, background: 'var(--brand)', color: 'white', borderRadius: '50%', padding: 4 }}
                      onClick={() => document.getElementById('groupAvatarUpload')?.click()}
                    >
                      <Plus size={12} />
                    </button>
                    <input type="file" id="groupAvatarUpload" style={{ display: 'none' }} onChange={handleAvatarUpload} />
                  </div>
                  
                  {editingGroupName ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input 
                        className="input" 
                        value={newGroupName} 
                        onChange={e => setNewGroupName(e.target.value)}
                        style={{ width: '100%', padding: '4px 8px', fontSize: 16, fontWeight: 'bold' }}
                      />
                      <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={() => updateGroupData({ name: newGroupName })}>Save</button>
                    </div>
                  ) : (
                    <h3 className={styles.detailsName} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {channelName}
                      <button className="btn-icon" onClick={() => setEditingGroupName(true)} title="Edit Name"><MoreVertical size={14} /></button>
                    </h3>
                  )}
                  
                  <div className={styles.detailsStatusText}>Private Group Chat</div>
                </div>

                <div className={styles.detailsSection}>
                   <button 
                      className="btn btn-outline" 
                      style={{ width: '100%', marginBottom: 16, display: 'flex', justifyContent: 'center', gap: 8 }}
                       onClick={() => setShowAddPeopleModal(true)}
                    >
                      <Plus size={16} /> Add People
                   </button>

                   {showAddPeopleModal && (
                     <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <div style={{ background: 'var(--bg-elevated)', padding: 24, borderRadius: 12, width: 400, boxShadow: 'var(--shadow-lg)' }}>
                         <h2 style={{ marginTop: 0, marginBottom: 16 }}>Add People to Group</h2>
                         <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8, marginBottom: 16 }}>
                           {allUsers.filter(u => u.id !== currentUserId).map(u => (
                             <label key={u.id} style={{ display: 'flex', alignItems: 'center', padding: '6px 8px', cursor: 'pointer', borderRadius: 4, transition: 'background 0.2s' }} className={selectedUsersToAdd.includes(u.id) ? 'selected-bg' : ''}>
                               <input 
                                 type="checkbox" 
                                 checked={selectedUsersToAdd.includes(u.id)}
                                 onChange={(e) => {
                                   if (e.target.checked) setSelectedUsersToAdd([...selectedUsersToAdd, u.id]);
                                   else setSelectedUsersToAdd(selectedUsersToAdd.filter(id => id !== u.id));
                                 }}
                                 style={{ marginRight: 12 }}
                               />
                               <span className={`avatar avatar-sm status-${u.status || 'offline'}`} style={{ marginRight: 8, display: 'inline-flex' }}>
                                 {u.avatar ? <Image src={u.avatar} alt={u.name} width={32} height={32} /> : u.name.charAt(0).toUpperCase()}
                               </span>
                               <span>{u.name}</span>
                             </label>
                           ))}
                         </div>
                         <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                           <button className="btn btn-outline" onClick={() => { setShowAddPeopleModal(false); setSelectedUsersToAdd([]); }}>Cancel</button>
                           <button 
                             className="btn btn-primary" 
                             disabled={selectedUsersToAdd.length === 0}
                             onClick={async () => {
                               await updateGroupData({ userIdsToAdd: selectedUsersToAdd });
                               setShowAddPeopleModal(false);
                               setSelectedUsersToAdd([]);
                             }}
                           >
                             Add to Group
                           </button>
                         </div>
                       </div>
                     </div>
                   )}
                   
                   <div className={styles.detailsSectionTitle}>Group Info</div>
                   <div className={styles.detailItem}>
                     <Info size={16} className={styles.detailIcon} />
                     <div>
                       <div className={styles.detailLabel}>Description</div>
                       <div className={styles.detailValue}>This is a private group conversation. Only members can read or send messages here.</div>
                     </div>
                   </div>
                </div>
              </div>
            ) : (
              // Channel Details
              <div className={styles.detailsContent}>
                <div className={styles.detailsHero}>
                  <div className={styles.channelHeroIcon}>
                    <Hash size={40} />
                  </div>
                  <h3 className={styles.detailsName}>#{channelName}</h3>
                  <div className={styles.detailsStatusText}>Company Channel</div>
                </div>

                <div className={styles.detailsSection}>
                  <div className={styles.detailsSectionTitle}>About</div>
                  <div className={styles.detailItem}>
                    <Info size={16} className={styles.detailIcon} />
                    <div>
                      <div className={styles.detailLabel}>Description</div>
                      <div className={styles.detailValue}>This is the main channel for #{channelName}. Use this space for team-wide announcements and collaboration.</div>
                    </div>
                  </div>
                  <div className={styles.detailItem}>
                    <Users size={16} className={styles.detailIcon} />
                    <div>
                      <div className={styles.detailLabel}>Members</div>
                      <div className={styles.detailValue}>24 Members</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Shared Media / Files Section (Mock) */}
            <div className={styles.detailsSection}>
              <div className={styles.detailsSectionTitle}>Shared Files</div>
              <div className={styles.sharedFileItem}>
                <FileText size={16} className={styles.sharedFileIcon} />
                <div className={styles.sharedFileText}>Q3_Report_Final.pdf</div>
              </div>
              <div className={styles.sharedFileItem}>
                <ImageIcon size={16} className={styles.sharedFileIcon} />
                <div className={styles.sharedFileText}>design_mockup_v2.png</div>
              </div>
              <div className={styles.sharedFileItem}>
                <FileText size={16} className={styles.sharedFileIcon} />
                <div className={styles.sharedFileText}>meeting_notes.docx</div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div> {/* End chatLayoutWrapper */}

      {/* Profile Modal */}
      {selectedUserForProfile && (
        <UserProfileModal 
          user={selectedUserForProfile} 
          onClose={() => setSelectedUserForProfile(null)} 
          isCurrentUser={selectedUserForProfile.id === currentUserId}
        />
      )}
      {/* Delete Confirmation Modal */}
      {messageToDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ background: 'var(--bg-panel)', padding: 24, borderRadius: 12, width: 320, boxShadow: 'var(--shadow-lg)', animation: 'scalePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--status-offline)' }}>
              <Trash2 size={20} /> Delete Message
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
              Are you sure you want to delete this message? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => setMessageToDelete(null)}>Cancel</button>
              <button className="btn" style={{ background: 'var(--status-offline)', color: '#fff', border: 'none' }} onClick={() => deleteMessage(messageToDelete)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div className={styles.lightboxOverlay} onClick={() => setLightboxUrl(null)}>
          <div className={styles.lightboxHeader} onClick={e => e.stopPropagation()}>
            <a href={lightboxUrl} download target="_blank" rel="noopener noreferrer" className={styles.lightboxAction} title="Download Image">
              <Download size={20} />
            </a>
            <button className={styles.lightboxAction} onClick={() => setLightboxUrl(null)} title="Close">
              <X size={20} />
            </button>
          </div>
          <div className={styles.lightboxContent} onClick={e => e.stopPropagation()}>
            <img src={lightboxUrl} alt="Preview" className={styles.lightboxImg} />
          </div>
        </div>
      )}

      {showChannelSettings && channelId && (
        <ChannelSettingsModal
          channelId={channelId}
          currentUserId={currentUserId}
          onClose={() => setShowChannelSettings(false)}
        />
      )}
    </div>
  );
}
