"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Hash, Phone, PhoneOff, Video, Send, File, Image as ImageIcon, Smile, MoreVertical, Search, Edit2, LogOut, Check, FileText, Info, Users, Bold, Italic, List, Code, Paperclip, BellOff, Bell, Edit3, Trash2, X, Briefcase, AtSign, Plus, Building, Clock, Mail, MessageCircle, Download, Mic, Square, MessageSquare, Settings, Menu, ArrowLeft, Copy, Share2, Pin, User as UserIcon, Camera, RefreshCw, RotateCcw, ChevronDown, ChevronUp, Link2, ExternalLink, ShieldAlert, Lock } from "lucide-react";
import dynamic from "next/dynamic";
import { useSocket } from "@/hooks/useSocket";
import { useUI } from "@/components/UIProvider";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import Image from 'next/image';
import getSuggestion from './suggestion';
import useSWR from "swr";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });
const UserProfileModal = dynamic(() => import("./UserProfileModal"), { ssr: false });
const ChannelSettingsModal = dynamic(() => import("./ChannelSettingsModal"), { ssr: false });
const ThreadPanel = dynamic(() => import("./ThreadPanel"), { ssr: false });
import GifPicker from "./GifPicker";
import LinkPreview from "./LinkPreview";
import { fetcher } from "@/lib/fetcher";
import { loadSettings } from "@/lib/settingsStore";
import { playMessageChime } from "@/lib/audioEffects";
import { useCall } from "@/components/CallProvider";
import { getClientCachedMessages, setClientCachedMessages } from "@/lib/clientMessageCache";
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
  const router = useRouter();
  const { socket } = useSocket();
  const { toggleMobileSidebar } = useUI();
  const { initiateCall } = useCall();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string, name: string, type: string } | null>(null);
  const [showInputEmoji, setShowInputEmoji] = useState(false);
  const [expressionMode, setExpressionMode] = useState<'emoji' | 'gif'>('emoji');
  const [hoverMsgId, setHoverMsgId] = useState<string | null>(null);
  const [activeActionsMsgId, setActiveActionsMsgId] = useState<string | null>(null);

  const activeMsg = useMemo(() => {
    if (!activeActionsMsgId) return null;
    return messages.find(m => m.id === activeActionsMsgId) || null;
  }, [activeActionsMsgId, messages]);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const [popoverTargetRect, setPopoverTargetRect] = useState<{ top: number; left: number; width: number; height: number; bottom: number; right: number } | null>(null);

  const openMessageMenuWithRect = (msgId: string, rect: DOMRect | { top: number; left: number; width: number; height: number; bottom: number; right: number }) => {
    setPopoverTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      right: rect.right,
    });
    setActiveActionsMsgId(msgId);
    setShowEmoji(false);
  };

  const openMessageMenu = (msgId: string, element?: HTMLElement | null) => {
    if (element) {
      openMessageMenuWithRect(msgId, element.getBoundingClientRect());
    } else if (typeof document !== "undefined") {
      const el = document.querySelector(`[data-msg-bubble="${msgId}"]`) || document.querySelector(`[data-msg-id="${msgId}"]`);
      if (el) {
        openMessageMenuWithRect(msgId, el.getBoundingClientRect());
      } else {
        setActiveActionsMsgId(msgId);
        setShowEmoji(false);
      }
    } else {
      setActiveActionsMsgId(msgId);
      setShowEmoji(false);
    }
  };

  const handleTouchStart = (msgId: string, e?: React.TouchEvent | React.MouseEvent) => {
    isLongPressRef.current = false;
    const targetEl = e?.currentTarget as HTMLElement | undefined;
    const rect = targetEl ? targetEl.getBoundingClientRect() : null;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try { navigator.vibrate(40); } catch (e) {}
      }
      if (rect && rect.width > 0) {
        openMessageMenuWithRect(msgId, rect);
      } else {
        openMessageMenu(msgId, targetEl);
      }
    }, 350);
  };

  const handleTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (isLongPressRef.current) {
      e.preventDefault();
    }
  };

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
  const [forwardingMsg, setForwardingMsg] = useState<Message | null>(null);
  const [forwardSearch, setForwardSearch] = useState("");
  const [forwardDestinations, setForwardDestinations] = useState<{ id: string; name: string; type: 'channel' | 'dm' }[]>([]);
  const [forwardingSending, setForwardingSending] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pinnedMessageIds, setPinnedMessageIds] = useState<string[]>([]);

  // Details Panel State (Meta Messenger style)
  const [detailsTab, setDetailsTab] = useState<'media' | 'files' | 'links'>('media');
  const [accordionOpen, setAccordionOpen] = useState<Record<string, boolean>>({
    about: true,
    customization: false,
    shared: true,
    privacy: false
  });
  const [isMutedDetails, setIsMutedDetails] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      if (typeof window !== "undefined") {
        setCurrentTimeStr(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleAccordion = (key: string) => {
    setAccordionOpen(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Dynamic shared media extraction (Images and Videos from current conversation)
  const sharedMedia = useMemo(() => {
    return messages.filter(m => {
      if (!m.fileUrl) return false;
      const type = (m.fileType || "").toLowerCase();
      const url = m.fileUrl.toLowerCase();
      return type.startsWith("image/") || type.startsWith("video/") ||
        /\.(png|jpe?g|gif|webp|mp4|webm|mov)(\?.*)?$/i.test(url);
    });
  }, [messages]);

  // Dynamic shared files extraction (PDFs, Docs, Spreadsheets, Archives, etc.)
  const sharedFiles = useMemo(() => {
    return messages.filter(m => {
      if (!m.fileUrl) return false;
      const type = (m.fileType || "").toLowerCase();
      const url = m.fileUrl.toLowerCase();
      const isMedia = type.startsWith("image/") || type.startsWith("video/") ||
        /\.(png|jpe?g|gif|webp|mp4|webm|mov)(\?.*)?$/i.test(url);
      return !isMedia;
    });
  }, [messages]);

  // Dynamic shared links extraction (URLs in content text)
  const sharedLinks = useMemo(() => {
    const urlRegex = /(https?:\/\/[^\s<"']+)/gi;
    const links: { id: string; url: string; domain: string; date: string }[] = [];
    
    messages.forEach(m => {
      if (!m.content) return;
      const matches = m.content.match(urlRegex);
      if (matches) {
        matches.forEach(url => {
          try {
            const parsed = new URL(url);
            links.push({
              id: `${m.id}-${url}`,
              url,
              domain: parsed.hostname.replace(/^www\./, ''),
              date: m.createdAt,
            });
          } catch (e) {
            // ignore invalid URL strings
          }
        });
      }
    });
    return links;
  }, [messages]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("companychat_pinned_msgs");
      if (saved) {
        try { setPinnedMessageIds(JSON.parse(saved)); } catch (e) {}
      }
    }
  }, []);

  const togglePinMessage = (msgId: string) => {
    setPinnedMessageIds(prev => {
      const isPinned = prev.includes(msgId);
      const updated = isPinned ? prev.filter(id => id !== msgId) : [...prev, msgId];
      if (typeof window !== "undefined") {
        localStorage.setItem("companychat_pinned_msgs", JSON.stringify(updated));
      }
      setToastMessage(isPinned ? "Message unpinned" : "Message pinned");
      setTimeout(() => setToastMessage(null), 2500);
      return updated;
    });
  };

  const handleCopyMessageText = (msg: Message) => {
    try {
      let plainText = msg.content || "";
      if (typeof document !== "undefined") {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = plainText;
        plainText = tempDiv.textContent || tempDiv.innerText || "";
      } else {
        plainText = plainText.replace(/<[^>]+>/g, "");
      }
      if (navigator.clipboard) {
        navigator.clipboard.writeText(plainText);
        setToastMessage("Copied text to clipboard");
        setTimeout(() => setToastMessage(null), 2500);
      }
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  useEffect(() => {
    if (!forwardingMsg) return;
    const loadDestinations = async () => {
      try {
        const [channelsRes, usersRes] = await Promise.all([
          fetcher("/api/channels").catch(() => ({ channels: [] })),
          fetcher("/api/users").catch(() => ({ users: [] }))
        ]);
        const channelsList = Array.isArray(channelsRes) ? channelsRes : (channelsRes?.channels || []);
        const usersList = Array.isArray(usersRes) ? usersRes : (usersRes?.users || []);

        const list: { id: string; name: string; type: 'channel' | 'dm' }[] = [];
        
        channelsList.forEach((c: any) => {
          list.push({ id: c.id, name: c.name || "Channel", type: 'channel' });
        });
        
        usersList.forEach((u: any) => {
          if (u.id !== currentUserId) {
            list.push({ id: u.id, name: u.name || u.email || "User", type: 'dm' });
          }
        });
        
        setForwardDestinations(list);
      } catch (e) {
        console.error("Failed to load forward destinations:", e);
      }
    };
    loadDestinations();
  }, [forwardingMsg, currentUserId]);

  const handleSendForward = async (dest: { id: string; name: string; type: 'channel' | 'dm' }) => {
    if (!forwardingMsg) return;
    setForwardingSending(dest.id);
    try {
      const url = dest.type === 'channel' ? `/api/channels/${dest.id}/messages` : `/api/dm/${dest.id}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: forwardingMsg.content,
          fileUrl: forwardingMsg.fileUrl,
          fileName: forwardingMsg.fileName,
          fileType: forwardingMsg.fileType,
        })
      });
      if (res.ok) {
        setToastMessage(`Forwarded to ${dest.name}`);
        setTimeout(() => setToastMessage(null), 3000);
        setForwardingMsg(null);
      }
    } catch (err) {
      console.error("Forward error:", err);
    } finally {
      setForwardingSending(null);
    }
  };

  const filteredForwardDestinations = useMemo(() => {
    if (!forwardSearch.trim()) return forwardDestinations;
    const q = forwardSearch.toLowerCase();
    return forwardDestinations.filter(d => d.name.toLowerCase().includes(q));
  }, [forwardDestinations, forwardSearch]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
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

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhotoBlob, setCapturedPhotoBlob] = useState<Blob | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const startCamera = async (mode: 'user' | 'environment' = 'user') => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setCameraStream(stream);
      setFacingMode(mode);
      setCapturedPhotoBlob(null);
      setCapturedPhotoUrl(null);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch (err) {
      console.error("Camera access error:", err);
      cameraInputRef.current?.click();
      setShowCameraModal(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedPhotoBlob(blob);
        setCapturedPhotoUrl(URL.createObjectURL(blob));
        if (cameraStream) {
          cameraStream.getTracks().forEach(track => track.stop());
        }
      }
    }, 'image/jpeg', 0.92);
  };

  const closeCameraModal = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (capturedPhotoUrl) {
      URL.revokeObjectURL(capturedPhotoUrl);
    }
    setCapturedPhotoBlob(null);
    setCapturedPhotoUrl(null);
    setShowCameraModal(false);
    setUploadingPhoto(false);
  };

  const handleSendCapturedPhoto = async () => {
    if (!capturedPhotoBlob || uploadingPhoto) return;
    setUploadingPhoto(true);

    const file = new (globalThis as any).File([capturedPhotoBlob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
    const fakeEvent = {
      target: { files: [file] }
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await handleFileUpload(fakeEvent);
    closeCameraModal();
  };

  const extensions = useMemo(() => [
    StarterKit,
    Placeholder.configure({
      placeholder: `Message ${channelName ? "#" + channelName : dmUser?.name || "someone"}`,
    }),
    Link.configure({ openOnClick: false }),
    Mention.configure({
      HTMLAttributes: { class: 'mention-tag' },
      suggestion: getSuggestion(),
    }),
  ], [channelName, dmUser?.name]);

  const editor = useEditor({
    extensions,
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
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowInputEmoji(false);
      }
      if (activeActionsMsgId) {
        const target = event.target as HTMLElement;
        if (
          !target.closest(`.${styles.msgActions}`) &&
          !target.closest(`.${styles.msgMenuBtn}`) &&
          !target.closest(`.${styles.emojiPicker}`) &&
          !target.closest(`.${styles.longPressModalOverlay}`) &&
          !target.closest(`.${styles.longPressCardContainer}`) &&
          !target.closest(`.${styles.messengerQuickReactions}`) &&
          !target.closest(`.${styles.messengerActionMenu}`)
        ) {
          setActiveActionsMsgId(null);
          setShowEmoji(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showInputEmoji, activeActionsMsgId]);

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

  useEffect(() => {
    if (!apiBase) return;

    // 1. Instant load from client-side memory cache if available
    const cached = getClientCachedMessages(apiBase);
    if (cached) {
      setMessages(cached.messages);
      setHasMore(cached.hasMore);
      setLoading(false); // INSTANT RENDER! ZERO SKELETON FLASH!
    } else {
      setMessages([]);
      setLoading(true);
    }

    // 2. Background revalidation (SWR pattern)
    let isSubscribed = true;
    fetch(apiBase)
      .then(res => res.json())
      .then(data => {
        if (!isSubscribed) return;
        const fetchedMsgs = data.messages || [];
        const hasMoreVal = fetchedMsgs.length === 50;
        setMessages(fetchedMsgs);
        setHasMore(hasMoreVal);
        setClientCachedMessages(apiBase, fetchedMsgs, hasMoreVal);
        setLoading(false);
      })
      .catch(() => {
        if (!isSubscribed) return;
        setLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [apiBase]);

  // Keep clientMessageCache up-to-date whenever messages array updates
  useEffect(() => {
    if (apiBase && messages.length > 0) {
      setClientCachedMessages(apiBase, messages, hasMore);
    }
  }, [apiBase, messages, hasMore]);

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
    const scrollContainer = messageListRef.current;
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

  const scrollToBottom = useCallback((instant = false) => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: instant ? "auto" : "smooth" });
    }
  }, []);


  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom(true);
      const t1 = setTimeout(() => scrollToBottom(true), 50);
      const t2 = setTimeout(() => scrollToBottom(true), 250);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [channelId, dmUserId, loading, scrollToBottom]);

  useEffect(() => {
    editor?.commands.setContent('');
    setSending(false);
    scrollToBottom(false);
  }, [messages, scrollToBottom]);

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
        socket.off("reaction-update");
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

  const [liveStatus, setLiveStatus] = useState<string>(dmUser?.status || "offline");

  useEffect(() => {
    if (dmUser) {
      setLiveStatus(dmUser.status || "offline");
    }
  }, [dmUser]);

  useEffect(() => {
    if (!socket || !dmUserId) return;

    const handlePresence = ({ userId, status }: { userId: string; status: string }) => {
      if (userId === dmUserId) {
        setLiveStatus(status);
      }
    };

    const handleInitialPresences = (initialMap: Record<string, string>) => {
      setLiveStatus(initialMap[dmUserId] || "offline");
    };

    socket.on("user-presence", handlePresence);
    socket.on("initial-presences", handleInitialPresences);

    return () => {
      socket.off("user-presence", handlePresence);
      socket.off("initial-presences", handleInitialPresences);
    };
  }, [socket, dmUserId]);

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

      const settings = loadSettings();
      if (settings.playSounds) {
        playMessageChime();
      }
    } catch (err) {
      console.error("Error sending message:", err);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(x => x.id !== tempId));
    }
  }

  async function sendGifMessage(gifUrl: string, title?: string) {
    setShowInputEmoji(false);
    
    const tempId = `optimistic-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      content: "",
      fileUrl: gifUrl,
      fileName: title || "GIF",
      fileType: "image/gif",
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
    scrollToBottom(true);
    const parentIdToUse = replyingToMessage?.id;
    setReplyingToMessage(null);

    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "",
          fileUrl: gifUrl,
          fileName: title || "GIF",
          fileType: "image/gif",
          parentId: parentIdToUse
        }),
      });

      if (!res.ok) {
        setMessages(prev => prev.filter(x => x.id !== tempId));
      } else {
        const data = await res.json();
        if (data.message && socket) {
          if (channelId) {
            socket.emit("send-message", data.message);
          } else if (dmUserId) {
            socket.emit("send-dm", { roomId, message: data.message });
          }
        }
        const settings = loadSettings();
        if (settings.playSounds) {
          playMessageChime();
        }
      }
    } catch (err) {
      console.error("Error sending GIF message:", err);
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
          <button
            className={styles.mobileBackBtn}
            onClick={() => {
              if (typeof window !== "undefined" && window.innerWidth < 768) {
                toggleMobileSidebar();
              } else {
                router.push("/dashboard");
              }
            }}
            title="Go back / Chat list"
            aria-label="Go back / Chat list"
          >
            <ArrowLeft size={20} />
          </button>
          {channelName
            ? <Hash size={20} className={styles.chatHeaderIcon} />
            : <div 
                className={`avatar avatar-sm status-${liveStatus}`}
                style={{ cursor: "pointer" }}
                onClick={() => dmUser && setSelectedUserForProfile({ ...dmUser, status: liveStatus })}
              >
                {dmUser?.avatar ? <Image src={dmUser.avatar} alt={dmUser.name} width={32} height={32} /> : initials(dmUser?.name || "U")}
                <span className="status-dot" />
              </div>
          }
          <div>
            <h2 
              className={styles.chatHeaderTitle}
              style={{ cursor: dmUser ? "pointer" : "default" }}
              onClick={() => dmUser && setSelectedUserForProfile({ ...dmUser, status: liveStatus })}
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
                <span className={`status-${liveStatus}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span className="status-dot" style={{ position: "relative", width: 8, height: 8, border: "none" }} />
                  {liveStatus}
                </span>
              </p>
            )}
          </div>
        </div>
        <div className={styles.chatHeaderActions}>
          <button
            className="btn-icon"
            title="Voice call"
            aria-label="Start voice call"
            onClick={() => {
              const targetId = dmUserId || dmUser?.id || channelId;
              const targetName = dmUser?.name || channelName || 'User';
              const targetAvatar = dmUser?.avatar || (channelId ? (groupAvatar || undefined) : undefined);
              if (targetId) {
                initiateCall({ id: targetId, name: targetName, avatar: targetAvatar }, 'audio');
              }
            }}
          >
            <Phone size={18} />
          </button>
          <button
            className="btn-icon"
            title="Video call"
            aria-label="Start video call"
            onClick={() => {
              const targetId = dmUserId || dmUser?.id || channelId;
              const targetName = dmUser?.name || channelName || 'User';
              const targetAvatar = dmUser?.avatar || (channelId ? (groupAvatar || undefined) : undefined);
              if (targetId) {
                initiateCall({ id: targetId, name: targetName, avatar: targetAvatar }, 'video');
              }
            }}
          >
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
          <div className={styles.messageList} id="message-list" ref={messageListRef}>
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
                  className={`${styles.messageRow} ${!showHeader ? styles.messageRowCompact : ""} ${isMine ? styles.messageRowMine : ""} ${activeActionsMsgId === msg.id ? styles.messageRowActive : ""}`}
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
                          {msg.fileType === "call_log" ? (() => {
                            const parts = (msg.fileName || "").split(":");
                            const callType = parts[1] || (msg.content?.toLowerCase().includes("video") ? "video" : "audio");
                            const callStatus = parts[2] || (msg.content?.toLowerCase().includes("missed") ? "missed" : "completed");
                            const durationSec = parseInt(parts[3] || "0", 10);

                            const isMissed = callStatus === "missed";
                            const isDeclined = callStatus === "declined";

                            let formattedDuration = "";
                            if (durationSec > 0) {
                              const hrs = Math.floor(durationSec / 3600);
                              const mins = Math.floor((durationSec % 3600) / 60);
                              const secs = durationSec % 60;
                              if (hrs > 0) formattedDuration = `${hrs}h ${mins}m ${secs}s`;
                              else if (mins > 0) formattedDuration = `${mins}m ${secs}s`;
                              else formattedDuration = `${secs}s`;
                            }

                            const titleText = isMissed 
                              ? (callType === 'video' ? 'Missed video call' : 'Missed audio call')
                              : isDeclined 
                              ? 'Call declined' 
                              : (callType === 'video' ? `Video call ended ${formattedDuration ? '• ' + formattedDuration : ''}` : `Audio call ended ${formattedDuration ? '• ' + formattedDuration : ''}`);

                            return (
                              <div
                                className={styles.callLogCard}
                                onTouchStart={(e) => handleTouchStart(msg.id, e)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  if (typeof navigator !== "undefined" && navigator.vibrate) {
                                    try { navigator.vibrate(40); } catch (err) {}
                                  }
                                  openMessageMenu(msg.id, e.currentTarget as HTMLElement);
                                }}
                                style={{ alignSelf: isMine ? 'flex-end' : 'flex-start' }}
                              >
                                <div className={`${styles.callLogIcon} ${isMissed || isDeclined ? styles.callLogIconMissed : styles.callLogIconSuccess}`}>
                                  {isMissed || isDeclined ? (
                                    <PhoneOff size={20} />
                                  ) : callType === 'video' ? (
                                    <Video size={20} />
                                  ) : (
                                    <Phone size={20} />
                                  )}
                                </div>

                                <div className={styles.callLogInfo}>
                                  <div className={`${styles.callLogTitle} ${isMissed || isDeclined ? styles.callLogTitleMissed : ''}`}>
                                    {titleText}
                                  </div>
                                  <div className={styles.callLogTime}>
                                    {formatTime(msg.createdAt)}
                                  </div>
                                </div>

                                <button
                                  onClick={() => {
                                    const targetId = msg.sender.id === currentUserId ? (dmUserId || channelId) : msg.sender.id;
                                    if (targetId) {
                                      initiateCall({ id: targetId, name: msg.sender.name, avatar: msg.sender.avatar }, callType as any);
                                    }
                                  }}
                                  className={styles.callLogBtn}
                                  title="Call back"
                                >
                                  {callType === 'video' ? <Video size={13} /> : <Phone size={13} />}
                                  <span>Call back</span>
                                </button>
                              </div>
                            );
                          })() : (msg.content && msg.content !== "Sent a file" && msg.content !== "<p>Sent a file</p>" && (() => {
                            let linkMatch = null;
                            if (msg.content) {
                              linkMatch = msg.content.match(/<a [^>]*href="([^"]+)"/);
                              if (!linkMatch) {
                                linkMatch = msg.content.match(/(https?:\/\/[^\s<]+)/);
                              }
                            }
                            return (
                              <>
                                <div data-msg-id={msg.id} className={styles.msgBubbleRow} style={{ display: 'flex', alignItems: 'center', gap: 6, flexDirection: isMine ? 'row-reverse' : 'row', maxWidth: '100%' }}>
                                  <div
                                    data-msg-bubble={msg.id}
                                    className={`${styles.msgContent} ${isMine ? styles.msgContentMine : styles.msgContentTheirs} ${groupPositionClass}`}
                                    dangerouslySetInnerHTML={{ __html: msg.content }}
                                    onTouchStart={(e) => handleTouchStart(msg.id, e)}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={handleTouchEnd}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      if (typeof navigator !== "undefined" && navigator.vibrate) {
                                        try { navigator.vibrate(40); } catch (err) {}
                                      }
                                      openMessageMenu(msg.id, e.currentTarget as HTMLElement);
                                    }}
                                  />
                                  {!(msg as any).isDeleted && (
                                    <button
                                      className={`${styles.msgMenuBtn} ${activeActionsMsgId === msg.id ? styles.msgMenuBtnActive : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const bubbleEl = e.currentTarget.parentElement?.querySelector(`[data-msg-bubble="${msg.id}"]`) as HTMLElement | null;
                                        openMessageMenu(msg.id, bubbleEl || e.currentTarget);
                                      }}
                                      title="Message options"
                                    >
                                      <Menu size={14} />
                                    </button>
                                  )}
                                </div>
                                {linkMatch && linkMatch[1] && (
                                  <LinkPreview url={linkMatch[1]} />
                                )}
                              </>
                            );
                          })())}
                        </div>

                        {msg.fileUrl && (() => {
                          const isImage = msg.fileType?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)($|\?)/i.test(msg.fileUrl || "");
                          const isAudio = msg.fileType?.startsWith("audio/") || /\.(mp3|wav|webm|ogg)($|\?)/i.test(msg.fileUrl || "");
                          const isVideo = msg.fileType?.startsWith("video/") || /\.(mp4|webm|ogg)($|\?)/i.test(msg.fileUrl || "");
                          return (
                            <div
                              data-msg-bubble={msg.id}
                              className={styles.fileAttachment}
                              onTouchStart={(e) => handleTouchStart(msg.id, e)}
                              onTouchMove={handleTouchMove}
                              onTouchEnd={handleTouchEnd}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                if (typeof navigator !== "undefined" && navigator.vibrate) {
                                  try { navigator.vibrate(40); } catch (err) {}
                                }
                                openMessageMenu(msg.id, e.currentTarget as HTMLElement);
                              }}
                            >
                              {isImage ? (
                                <img 
                                  src={msg.fileUrl} 
                                  alt={msg.fileName || "Uploaded image"} 
                                  className={styles.fileImg} 
                                  onLoad={() => scrollToBottom(true)}
                                  onClick={() => setPreviewFile({ url: msg.fileUrl!, name: msg.fileName || 'file', type: 'image' })}
                                  title="Click to view image"
                                />
                              ) : isAudio ? (
                                <audio controls src={msg.fileUrl} style={{ height: 40, outline: 'none', maxWidth: 250 }} />
                              ) : isVideo ? (
                                <video 
                                  src={msg.fileUrl} 
                                  className={styles.fileImg} 
                                  onClick={() => setPreviewFile({ url: msg.fileUrl!, name: msg.fileName || 'file', type: 'video' })}
                                  title="Click to view video"
                                />
                              ) : (
                                <button onClick={(e) => { e.preventDefault(); setPreviewFile({ url: msg.fileUrl!, name: msg.fileName || 'file', type: 'document' }); }}
                                  className={styles.fileLink} style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}>
                                  📎 {msg.fileName}
                                </button>
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

          <button 
            className={`btn-icon ${styles.toolbarBtn}`} 
            title="Take Photo" 
            onClick={() => {
              setShowCameraModal(true);
              startCamera('user');
            }}
          >
            <Camera size={20} />
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: "none" }} 
          />

          <input 
            type="file" 
            ref={cameraInputRef}
            accept="image/*"
            capture="environment"
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
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 2 }} ref={emojiPickerRef}>
              <button 
                type="button"
                className={`btn-icon ${styles.toolbarBtn} ${showInputEmoji ? styles.toolbarBtnActive : ''}`} 
                title="Emojis & GIFs"
                onClick={() => setShowInputEmoji(!showInputEmoji)}
              >
                <Smile size={20} />
              </button>

              {showInputEmoji && (
                <div style={{ position: "absolute", bottom: "calc(100% + 8px)", right: 0, zIndex: 9999, boxShadow: "0 16px 40px rgba(0, 0, 0, 0.4)", borderRadius: 16, overflow: "hidden", background: "var(--bg-panel, #0f172a)", border: "1px solid rgba(255, 255, 255, 0.12)" }}>
                  {/* Meta Messenger Expression Picker Header */}
                  <div style={{ display: "flex", background: "rgba(0, 0, 0, 0.25)", padding: "4px 8px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setExpressionMode('emoji')}
                      style={{
                        flex: 1,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 10,
                        border: "none",
                        cursor: "pointer",
                        background: expressionMode === 'emoji' ? "var(--brand, #10b981)" : "transparent",
                        color: expressionMode === 'emoji' ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
                        transition: "all 0.2s ease"
                      }}
                    >
                      😃 Emojis
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpressionMode('gif')}
                      style={{
                        flex: 1,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 10,
                        border: "none",
                        cursor: "pointer",
                        background: expressionMode === 'gif' ? "var(--brand, #10b981)" : "transparent",
                        color: expressionMode === 'gif' ? "#ffffff" : "rgba(255, 255, 255, 0.6)",
                        transition: "all 0.2s ease"
                      }}
                    >
                      🎬 GIFs
                    </button>
                  </div>

                  {expressionMode === 'emoji' ? (
                    <EmojiPicker 
                      width={typeof window !== "undefined" && window.innerWidth < 450 ? Math.min(300, window.innerWidth - 32) : 340}
                      height={340}
                      previewConfig={{ showPreview: false }}
                      onEmojiClick={(e) => {
                        editor?.chain().focus().insertContent(e.emoji).run();
                        setShowInputEmoji(false);
                      }} 
                    />
                  ) : (
                    <GifPicker onSelectGif={(gifUrl, title) => sendGifMessage(gifUrl, title)} />
                  )}
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
            onPreviewFile={setPreviewFile}
          />
        );
      })() : showDetailsPanel && (
        <div className={styles.chatDetailsPanel}>
          <div className={styles.detailsHeader}>
            <h3>Details</h3>
            <button className="btn-icon" onClick={() => setShowDetailsPanel(false)} aria-label="Close Details Panel"><X size={16}/></button>
          </div>
          
          <div className={styles.detailsScroll}>
            {dmUser ? (
              // DM User Details (Meta Messenger Style)
              <div className={styles.detailsContent} style={{ padding: '16px 12px' }}>
                <div className={styles.detailsHero} style={{ paddingBottom: 16 }}>
                  <div className={`avatar avatar-xl status-${liveStatus}`} style={{ width: 88, height: 88, fontSize: 36, marginBottom: 12, cursor: 'pointer' }} onClick={() => setSelectedUserForProfile({ ...dmUser, status: liveStatus })}>
                    {dmUser.avatar ? <Image src={dmUser.avatar} alt={dmUser.name} width={88} height={88} /> : initials(dmUser.name)}
                    <span className="status-dot" style={{ width: 18, height: 18, borderWidth: 3 }} />
                  </div>
                  <h3 className={styles.detailsName} style={{ fontSize: 20, fontWeight: 800 }}>{dmUser.name}</h3>
                  <div className={styles.detailsStatusText} style={{ marginTop: 4 }}>
                    <span className={`status-${liveStatus}`}><span className="status-dot" style={{ position: "relative", width: 8, height: 8, border: "none" }} /></span>
                    <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{liveStatus}</span>
                  </div>

                  {/* Messenger Quick Action Buttons */}
                  <div className={styles.detailsQuickActions}>
                    <div className={styles.detailsQuickBtnWrap}>
                      <button className={styles.detailsQuickBtn} onClick={() => setSelectedUserForProfile({ ...dmUser, status: liveStatus })} title="View Profile">
                        <UserIcon size={18} />
                      </button>
                      <span className={styles.detailsQuickLabel}>Profile</span>
                    </div>

                    <div className={styles.detailsQuickBtnWrap}>
                      <button 
                        className={`${styles.detailsQuickBtn} ${isMutedDetails ? styles.detailsQuickBtnActive : ""}`} 
                        onClick={() => {
                          setIsMutedDetails(!isMutedDetails);
                          setToastMessage(isMutedDetails ? "Notifications unmuted" : "Notifications muted");
                          setTimeout(() => setToastMessage(null), 2500);
                        }} 
                        title={isMutedDetails ? "Unmute Notifications" : "Mute Notifications"}
                      >
                        {isMutedDetails ? <BellOff size={18} /> : <Bell size={18} />}
                      </button>
                      <span className={styles.detailsQuickLabel}>{isMutedDetails ? "Unmute" : "Mute"}</span>
                    </div>

                    <div className={styles.detailsQuickBtnWrap}>
                      <button className={styles.detailsQuickBtn} onClick={() => setShowSearch(true)} title="Search in Chat">
                        <Search size={18} />
                      </button>
                      <span className={styles.detailsQuickLabel}>Search</span>
                    </div>

                    <div className={styles.detailsQuickBtnWrap}>
                      <button 
                        className={styles.detailsQuickBtn} 
                        onClick={() => initiateCall({ id: dmUserId || dmUser.id, name: dmUser.name, avatar: dmUser.avatar }, 'audio')} 
                        title="Voice Call"
                      >
                        <Phone size={18} />
                      </button>
                      <span className={styles.detailsQuickLabel}>Call</span>
                    </div>

                    <div className={styles.detailsQuickBtnWrap}>
                      <button 
                        className={styles.detailsQuickBtn} 
                        onClick={() => initiateCall({ id: dmUserId || dmUser.id, name: dmUser.name, avatar: dmUser.avatar }, 'video')} 
                        title="Video Call"
                      >
                        <Video size={18} />
                      </button>
                      <span className={styles.detailsQuickLabel}>Video</span>
                    </div>
                  </div>
                </div>

                {/* Collapsible Section 1: About / Contact Info */}
                <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 8, paddingBottom: 8 }}>
                  <div className={styles.detailsAccordionHeader} onClick={() => toggleAccordion('about')}>
                    <div className={styles.detailsAccordionTitle}>
                      <Info size={16} style={{ color: 'var(--brand)' }} /> About Contact
                    </div>
                    <ChevronDown size={16} className={`${styles.detailsAccordionChevron} ${accordionOpen.about ? styles.detailsAccordionChevronOpen : ''}`} />
                  </div>

                  {accordionOpen.about && (
                    <div className={styles.detailsAccordionContent}>
                      {dmUser.jobTitle && (
                        <div className={styles.detailItem}>
                          <Briefcase size={16} className={styles.detailIcon} />
                          <div>
                            <div className={styles.detailLabel}>Role / Position</div>
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
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className={styles.detailLabel}>Email Address</div>
                          <div className={styles.detailValue} style={{ display: 'flex', alignItems: 'center', gap: 6, wordBreak: 'break-all' }}>
                            <span>{dmUser.email || `${dmUser.name.split(' ')[0].toLowerCase()}@da.gov.ph`}</span>
                            <button 
                              className={styles.copyEmailBtn} 
                              title="Copy Email"
                              onClick={() => {
                                const emailToCopy = dmUser.email || `${dmUser.name.split(' ')[0].toLowerCase()}@da.gov.ph`;
                                navigator.clipboard?.writeText(emailToCopy);
                                setToastMessage("Email copied to clipboard");
                                setTimeout(() => setToastMessage(null), 2500);
                              }}
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className={styles.detailItem}>
                        <Clock size={16} className={styles.detailIcon} />
                        <div>
                          <div className={styles.detailLabel}>Local Time & Status</div>
                          <div className={styles.detailValue}>
                            {currentTimeStr || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (PST) · <span style={{ textTransform: 'capitalize', color: liveStatus === 'online' ? 'var(--status-online)' : 'var(--text-muted)' }}>{liveStatus}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Collapsible Section 2: Shared Media, Files & Links */}
                <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 8, paddingBottom: 8 }}>
                  <div className={styles.detailsAccordionHeader} onClick={() => toggleAccordion('shared')}>
                    <div className={styles.detailsAccordionTitle}>
                      <ImageIcon size={16} style={{ color: 'var(--brand)' }} /> Shared Media, Files & Links
                    </div>
                    <ChevronDown size={16} className={`${styles.detailsAccordionChevron} ${accordionOpen.shared ? styles.detailsAccordionChevronOpen : ''}`} />
                  </div>

                  {accordionOpen.shared && (
                    <div className={styles.detailsAccordionContent}>
                      {/* Tabs */}
                      <div className={styles.mediaTabGroup}>
                        <button 
                          className={`${styles.mediaTabBtn} ${detailsTab === 'media' ? styles.mediaTabBtnActive : ''}`} 
                          onClick={() => setDetailsTab('media')}
                        >
                          Media ({sharedMedia.length})
                        </button>
                        <button 
                          className={`${styles.mediaTabBtn} ${detailsTab === 'files' ? styles.mediaTabBtnActive : ''}`} 
                          onClick={() => setDetailsTab('files')}
                        >
                          Files ({sharedFiles.length})
                        </button>
                        <button 
                          className={`${styles.mediaTabBtn} ${detailsTab === 'links' ? styles.mediaTabBtnActive : ''}`} 
                          onClick={() => setDetailsTab('links')}
                        >
                          Links ({sharedLinks.length})
                        </button>
                      </div>

                      {/* Shared Tab Content */}
                      {detailsTab === 'media' && (
                        sharedMedia.length > 0 ? (
                          <div className={styles.sharedMediaGrid}>
                            {sharedMedia.map(m => (
                              <div 
                                key={m.id} 
                                className={styles.sharedMediaThumb} 
                                onClick={() => setPreviewFile({ url: m.fileUrl!, name: m.fileName || 'Image', type: (m.fileType || '').startsWith('video') ? 'video' : 'image' })}
                                title={m.fileName || 'View media'}
                              >
                                {(m.fileType || '').startsWith('video') || m.fileUrl!.endsWith('.mp4') ? (
                                  <>
                                    <video src={m.fileUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div className={styles.sharedMediaVideoOverlay}><Video size={16} /></div>
                                  </>
                                ) : (
                                  <img src={m.fileUrl} alt={m.fileName || 'Media'} className={styles.sharedMediaImg} />
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={styles.detailsEmptyState}>No shared photos or videos yet.</div>
                        )
                      )}

                      {detailsTab === 'files' && (
                        sharedFiles.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {sharedFiles.map(m => (
                              <div key={m.id} className={styles.sharedFileItem} onClick={() => window.open(m.fileUrl, '_blank')}>
                                <FileText size={16} className={styles.sharedFileIcon} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div className={styles.sharedFileText}>{m.fileName || 'Attachment file'}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(m.createdAt).toLocaleDateString()}</div>
                                </div>
                                <a href={m.fileUrl} download={m.fileName} target="_blank" rel="noopener noreferrer" className="btn-icon" onClick={e => e.stopPropagation()} title="Download">
                                  <Download size={14} />
                                </a>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={styles.detailsEmptyState}>No shared documents or files yet.</div>
                        )
                      )}

                      {detailsTab === 'links' && (
                        sharedLinks.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {sharedLinks.map(link => (
                              <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className={styles.sharedLinkItem}>
                                <div className={styles.sharedLinkIcon}>
                                  <Link2 size={16} />
                                </div>
                                <div className={styles.sharedLinkInfo}>
                                  <div className={styles.sharedLinkUrl}>{link.url}</div>
                                  <div className={styles.sharedLinkDomain}>{link.domain}</div>
                                </div>
                                <ExternalLink size={14} style={{ color: 'var(--text-muted)' }} />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className={styles.detailsEmptyState}>No shared links in this chat yet.</div>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Collapsible Section 3: Privacy & Options */}
                <div>
                  <div className={styles.detailsAccordionHeader} onClick={() => toggleAccordion('privacy')}>
                    <div className={styles.detailsAccordionTitle}>
                      <Lock size={16} style={{ color: 'var(--brand)' }} /> Privacy & Support
                    </div>
                    <ChevronDown size={16} className={`${styles.detailsAccordionChevron} ${accordionOpen.privacy ? styles.detailsAccordionChevronOpen : ''}`} />
                  </div>

                  {accordionOpen.privacy && (
                    <div className={styles.detailsAccordionContent}>
                      <button 
                        className={styles.messengerMenuItem} 
                        onClick={() => {
                          setIsMutedDetails(!isMutedDetails);
                          setToastMessage(isMutedDetails ? "Notifications unmuted" : "Notifications muted");
                          setTimeout(() => setToastMessage(null), 2500);
                        }}
                      >
                        {isMutedDetails ? <Bell size={16} /> : <BellOff size={16} />}
                        <span>{isMutedDetails ? "Unmute Notifications" : "Mute Notifications"}</span>
                      </button>

                      <button 
                        className={`${styles.messengerMenuItem} ${styles.messengerMenuItemDanger}`} 
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to block ${dmUser.name}?`)) {
                            setToastMessage(`Blocked ${dmUser.name}`);
                            setTimeout(() => setToastMessage(null), 2500);
                          }
                        }}
                      >
                        <ShieldAlert size={16} />
                        <span>Block Contact</span>
                      </button>
                    </div>
                  )}
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

                {/* Group Shared Files */}
                <div className={styles.detailsSection}>
                  <div className={styles.detailsSectionTitle}>Shared Files</div>
                  {sharedFiles.length > 0 ? (
                    sharedFiles.map(m => (
                      <div key={m.id} className={styles.sharedFileItem} onClick={() => window.open(m.fileUrl, '_blank')}>
                        <FileText size={16} className={styles.sharedFileIcon} />
                        <div className={styles.sharedFileText}>{m.fileName || 'Shared file'}</div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.detailsEmptyState}>No shared files in this group yet.</div>
                  )}
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
                </div>

                {/* Channel Shared Files */}
                <div className={styles.detailsSection}>
                  <div className={styles.detailsSectionTitle}>Shared Files</div>
                  {sharedFiles.length > 0 ? (
                    sharedFiles.map(m => (
                      <div key={m.id} className={styles.sharedFileItem} onClick={() => window.open(m.fileUrl, '_blank')}>
                        <FileText size={16} className={styles.sharedFileIcon} />
                        <div className={styles.sharedFileText}>{m.fileName || 'Shared file'}</div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.detailsEmptyState}>No shared files in this channel yet.</div>
                  )}
                </div>
              </div>
            )}
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
      {previewFile && typeof document !== 'undefined' && createPortal(
        <div className={styles.lightboxOverlay} onClick={() => setPreviewFile(null)}>
          <div className={styles.lightboxHeader} onClick={e => e.stopPropagation()}>
            <span style={{ color: 'white', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 16, fontSize: 16, fontWeight: 500 }}>{previewFile.name}</span>
            <a href={previewFile.url} download={previewFile.name} target="_blank" rel="noopener noreferrer" className={styles.lightboxAction} title="Download File">
              <Download size={20} />
            </a>
            <button className={styles.lightboxAction} onClick={() => setPreviewFile(null)} title="Close">
              <X size={20} />
            </button>
          </div>
          <div className={styles.lightboxContent} onClick={e => e.stopPropagation()}>
            {previewFile.type === 'image' ? (
              <img src={previewFile.url} alt="Preview" className={styles.lightboxImg} />
            ) : previewFile.type === 'video' ? (
              <video src={previewFile.url} controls autoPlay style={{ maxWidth: '90%', maxHeight: '80vh', outline: 'none' }} />
            ) : previewFile.url.startsWith('blob:') ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', width: '80vw', background: 'white', borderRadius: 8, color: '#333' }}>
                <div className="spinner" style={{ width: 40, height: 40, marginBottom: 16, borderTopColor: 'var(--brand)' }} />
                <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>Uploading file...</h3>
                <p style={{ margin: 0, color: '#666' }}>Preview will be available once the upload is complete.</p>
              </div>
            ) : (
              <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(previewFile.url)}&embedded=true`} style={{ width: '80vw', height: '80vh', border: 'none', borderRadius: 8, background: 'white' }} />
            )}
          </div>
        </div>,
        document.body
      )}

      {showChannelSettings && channelId && (
        <ChannelSettingsModal
          channelId={channelId}
          currentUserId={currentUserId}
          onClose={() => setShowChannelSettings(false)}
        />
      )}

      {/* Long Press Dimming Backdrop */}
      {activeActionsMsgId && (
        <div
          className={styles.longPressBackdrop}
          onClick={() => {
            setActiveActionsMsgId(null);
            setShowEmoji(false);
          }}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className={styles.toastNotification}>
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Forward Message Modal */}
      {forwardingMsg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }} onClick={() => setForwardingMsg(null)}>
          <div style={{ background: 'var(--bg-panel)', padding: 20, borderRadius: 16, width: '90%', maxWidth: 420, boxShadow: 'var(--shadow-lg)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Forward Message</h3>
              <button className="btn-icon" onClick={() => setForwardingMsg(null)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.forwardPreview}>
              <span className={styles.forwardPreviewLabel}>Selected Message:</span>
              <div dangerouslySetInnerHTML={{ __html: forwardingMsg.content || "Attachment" }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Search channels or people..."
                className="input-field"
                value={forwardSearch}
                onChange={(e) => setForwardSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-hover)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className={styles.forwardList}>
              {filteredForwardDestinations.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px 0', fontSize: 13 }}>
                  No channels or people found
                </div>
              ) : (
                filteredForwardDestinations.map(dest => (
                  <div key={`${dest.type}-${dest.id}`} className={styles.forwardItem}>
                    <div className={styles.forwardItemInfo}>
                      {dest.type === 'channel' ? <Hash size={18} style={{ color: 'var(--brand)' }} /> : <UserIcon size={18} style={{ color: 'var(--text-muted)' }} />}
                      <span>{dest.name}</span>
                    </div>
                    <button
                      className="btn-primary"
                      style={{ padding: '6px 14px', fontSize: 13, borderRadius: 16, background: 'var(--brand)', color: '#fff', border: 'none', cursor: 'pointer' }}
                      disabled={forwardingSending === dest.id}
                      onClick={() => handleSendForward(dest)}
                    >
                      {forwardingSending === dest.id ? "Sending..." : "Send"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Meta Messenger Live Camera Viewfinder Modal */}
      {showCameraModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.94)', zIndex: 999999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '16px', animation: 'fadeIn 0.2s ease', userSelect: 'none' }}>
          {/* Header Bar with Back Button, Title, and Switch Camera */}
          <div style={{ width: '100%', maxWidth: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff', zIndex: 2 }}>
            <button 
              style={{ color: '#fff', background: 'rgba(255,255,255,0.18)', borderRadius: 24, padding: '8px 16px', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }} 
              onClick={closeCameraModal} 
              title="Go back / Cancel"
            >
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>

            <span style={{ fontWeight: 600, fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>
              {capturedPhotoUrl ? "Photo Preview" : (facingMode === 'user' ? "Front Camera" : "Rear Camera")}
            </span>

            {!capturedPhotoUrl ? (
              <button 
                style={{ color: '#fff', background: 'rgba(255,255,255,0.18)', borderRadius: 24, padding: '8px 14px', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }} 
                onClick={() => startCamera(facingMode === 'user' ? 'environment' : 'user')} 
                title="Switch Camera (Front / Rear)"
              >
                <RefreshCw size={16} />
                <span className="hidden-xs">{facingMode === 'user' ? "Rear Cam" : "Front Cam"}</span>
              </button>
            ) : (
              <div style={{ width: 70 }} />
            )}
          </div>

          {/* Viewfinder Video or Snapshot Preview */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 460, flex: 1, margin: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 24, background: '#000', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
            {capturedPhotoUrl ? (
              <img src={capturedPhotoUrl} alt="Captured Photo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} 
              />
            )}
          </div>

          {/* Controls at Bottom */}
          <div style={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, zIndex: 2, paddingBottom: 12 }}>
            {capturedPhotoUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <button 
                  className="btn btn-outline" 
                  style={{ borderRadius: 30, padding: '12px 26px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 15, fontWeight: 500 }}
                  onClick={() => startCamera(facingMode)}
                  disabled={uploadingPhoto}
                >
                  <RotateCcw size={18} /> Retake
                </button>

                <button 
                  className="btn btn-primary" 
                  style={{ borderRadius: 30, padding: '12px 30px', background: 'var(--brand)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15, boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}
                  onClick={handleSendCapturedPhoto}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? <span className="spinner" style={{ width: 18, height: 18 }} /> : <><Send size={18} /> Send Photo</>}
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', width: '100%', maxWidth: 360 }}>
                  {/* Bottom Left Back Button */}
                  <button
                    onClick={closeCameraModal}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.18)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backdropFilter: 'blur(8px)',
                    }}
                    title="Back / Exit Camera"
                  >
                    <ArrowLeft size={22} />
                  </button>

                  {/* Shutter Button */}
                  <button 
                    onClick={capturePhoto}
                    style={{
                      width: 76,
                      height: 76,
                      borderRadius: '50%',
                      background: 'transparent',
                      border: '4px solid #ffffff',
                      padding: 4,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.15s ease',
                      boxShadow: '0 0 20px rgba(255,255,255,0.3)'
                    }}
                    title="Take Photo"
                  >
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#ffffff' }} />
                  </button>

                  {/* Switch Camera Button for Mobile / Rear Camera */}
                  <button
                    onClick={() => startCamera(facingMode === 'user' ? 'environment' : 'user')}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.18)',
                      border: '1px solid rgba(255,255,255,0.3)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backdropFilter: 'blur(8px)',
                    }}
                    title={`Switch to ${facingMode === 'user' ? 'Rear' : 'Front'} Camera`}
                  >
                    <RefreshCw size={22} />
                  </button>
                </div>

                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                  {facingMode === 'user' ? "Using Front Camera — Tap right icon to switch to Rear Camera" : "Using Rear Camera — Tap right icon to switch to Front Camera"}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Meta Messenger Long Press Target-Aligned Portal Modal */}
      {activeActionsMsgId && activeMsg && typeof document !== "undefined" && createPortal(
        (() => {
          const isMineMsg = activeMsg.sender.id === currentUserId;
          const windowW = typeof window !== "undefined" ? window.innerWidth : 800;
          const windowH = typeof window !== "undefined" ? window.innerHeight : 600;

          let targetRect = popoverTargetRect;
          if ((!targetRect || targetRect.width === 0) && typeof document !== "undefined") {
            const domEl = document.querySelector(`[data-msg-bubble="${activeMsg.id}"]`) || document.querySelector(`[data-msg-id="${activeMsg.id}"]`);
            if (domEl) {
              const r = domEl.getBoundingClientRect();
              if (r.width > 0) {
                targetRect = {
                  top: r.top,
                  left: r.left,
                  width: r.width,
                  height: r.height,
                  bottom: r.bottom,
                  right: r.right,
                };
              }
            }
          }

          let popoverStyle: React.CSSProperties = {
            position: 'fixed',
            zIndex: 100000,
          };

          if (targetRect && targetRect.width > 0) {
            const popoverH = isMineMsg ? 350 : 310;
            let topPos = targetRect.top - 46;
            if (topPos + popoverH > windowH - 12) {
              topPos = windowH - popoverH - 12;
            }
            topPos = Math.max(12, topPos);

            popoverStyle = {
              position: 'fixed',
              top: topPos,
              zIndex: 100000,
            };

            if (isMineMsg) {
              const rightVal = Math.max(12, windowW - targetRect.right);
              popoverStyle.right = rightVal;
              popoverStyle.alignItems = 'flex-end';
            } else {
              const leftVal = Math.max(12, targetRect.left);
              popoverStyle.left = leftVal;
              popoverStyle.alignItems = 'flex-start';
            }
          } else {
            popoverStyle = {
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 100000,
              alignItems: 'center',
            };
          }

          return (
            <div 
              className={styles.longPressModalOverlay} 
              onClick={(e) => {
                e.stopPropagation();
                setActiveActionsMsgId(null);
                setShowEmoji(false);
              }}
            >
              <div 
                className={styles.longPressCardContainer}
                style={popoverStyle}
                onClick={(e) => e.stopPropagation()}
              >
                {/* 1. Quick Reaction Bar */}
                <div className={styles.messengerQuickReactions}>
                  {["❤️", "😂", "😮", "😢", "🙏", "👍"].map(e => (
                    <button
                      key={e}
                      className={styles.quickReactionBtn}
                      onClick={(evt) => {
                        evt.stopPropagation();
                        toggleReaction(activeMsg.id, e);
                        setActiveActionsMsgId(null);
                      }}
                    >
                      {e}
                    </button>
                  ))}
                  <button
                    className={styles.quickReactionBtnMore}
                    onClick={(evt) => {
                      evt.stopPropagation();
                      setShowEmoji(prev => !prev);
                    }}
                    title="More reactions"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Expanded Inline Emoji Picker if + clicked */}
                {showEmoji && (
                  <div className={styles.emojiPicker} onClick={(e) => e.stopPropagation()}>
                    {EMOJI_SET.map(e => (
                      <button
                        key={e}
                        className={styles.emojiPickerBtn}
                        onClick={(evt) => {
                          evt.stopPropagation();
                          toggleReaction(activeMsg.id, e);
                          setShowEmoji(false);
                          setActiveActionsMsgId(null);
                        }}
                      >
                        {e}
                      </button>
                    ))}
                    <button className={styles.emojiClose} onClick={() => setShowEmoji(false)}>
                      <X size={12} />
                    </button>
                  </div>
                )}

                {/* 2. Target Message Bubble Preview (Elevated Meta Messenger Style) */}
                <div className={`${styles.popoverMsgPreview} ${isMineMsg ? styles.popoverMsgPreviewMine : styles.popoverMsgPreviewTheirs}`}>
                  <div dangerouslySetInnerHTML={{ __html: activeMsg.content || "" }} />
                  {activeMsg.fileUrl && (
                    <div style={{ marginTop: 4, fontSize: 12, opacity: 0.9 }}>
                      📎 {activeMsg.fileName || "File attachment"}
                    </div>
                  )}
                </div>

                {/* 3. Meta Messenger Context Action Menu */}
                <div className={styles.messengerActionMenu}>
                  <button
                    className={styles.messengerMenuItem}
                    onClick={(e) => {
                      e.stopPropagation();
                      setReplyingToMessage(activeMsg);
                      editor?.commands.focus();
                      setActiveActionsMsgId(null);
                    }}
                  >
                    <MessageCircle size={16} />
                    <span>Reply</span>
                  </button>

                  <button
                    className={styles.messengerMenuItem}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveThreadId(activeMsg.id);
                      setActiveActionsMsgId(null);
                    }}
                  >
                    <MessageSquare size={16} />
                    <span>Reply in thread</span>
                  </button>

                  <button
                    className={styles.messengerMenuItem}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyMessageText(activeMsg);
                      setActiveActionsMsgId(null);
                    }}
                  >
                    <Copy size={16} />
                    <span>Copy text</span>
                  </button>

                  <button
                    className={styles.messengerMenuItem}
                    onClick={(e) => {
                      e.stopPropagation();
                      setForwardingMsg(activeMsg);
                      setActiveActionsMsgId(null);
                    }}
                  >
                    <Share2 size={16} />
                    <span>Forward</span>
                  </button>

                  <button
                    className={styles.messengerMenuItem}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinMessage(activeMsg.id);
                      setActiveActionsMsgId(null);
                    }}
                  >
                    <Pin size={16} />
                    <span>{pinnedMessageIds.includes(activeMsg.id) ? "Unpin message" : "Pin message"}</span>
                  </button>

                  {activeMsg.sender.id === currentUserId && (
                    <button
                      className={styles.messengerMenuItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        editor?.commands.setContent(activeMsg.content);
                        setEditingMessageId(activeMsg.id);
                        editor?.commands.focus();
                        setActiveActionsMsgId(null);
                      }}
                    >
                      <Edit3 size={16} />
                      <span>Edit</span>
                    </button>
                  )}

                  {(activeMsg.sender.id === currentUserId || currentUserRole === "admin" || currentUserRole === "moderator") && (
                    <button
                      className={`${styles.messengerMenuItem} ${styles.messengerMenuItemDanger}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMessageToDelete(activeMsg.id);
                        setActiveActionsMsgId(null);
                      }}
                    >
                      <Trash2 size={16} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
}
