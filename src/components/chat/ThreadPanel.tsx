"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { X, Send } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import styles from "./ThreadPanel.module.css";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Mention from '@tiptap/extension-mention';
import getSuggestion from './suggestion';

interface User {
  id: string;
  name: string;
  avatar?: string;
  status: string;
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
}

interface ThreadPanelProps {
  activeThreadId: string;
  parentMessage: Message;
  channelId?: string;
  dmUserId?: string;
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
}

export default function ThreadPanel({
  activeThreadId,
  parentMessage,
  channelId,
  dmUserId,
  currentUserId,
  currentUserName,
  onClose
}: ThreadPanelProps) {
  const { socket } = useSocket();
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const apiBase = channelId ? `/api/channels/${channelId}/messages` : `/api/dm/${dmUserId}`;
  const roomId = dmUserId ? [currentUserId, dmUserId].sort().join(":") : null;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Reply..." }),
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
          document.getElementById('send-reply-btn')?.click();
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    async function fetchReplies() {
      setLoading(true);
      const res = await fetch(`${apiBase}?parentId=${activeThreadId}`);
      if (res.ok) {
        const data = await res.json();
        setReplies(data.messages || []);
      }
      setLoading(false);
    }
    fetchReplies();
  }, [apiBase, activeThreadId]);

  useEffect(() => {
    if (!socket) return;
    
    function handleNewMessage(msg: Message & { parentId?: string }) {
      if (msg.parentId === activeThreadId) {
        setReplies(prev => [...prev, msg]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    }

    if (channelId) {
      socket.on("new-message", handleNewMessage);
    } else if (roomId) {
      socket.on("new-dm", handleNewMessage);
    }

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("new-dm", handleNewMessage);
    };
  }, [socket, channelId, roomId, activeThreadId]);

  async function sendReply(e?: any) {
    if (e && e.preventDefault) e.preventDefault();
    if (!editor || isEditorEmpty || sending) return;
    try {
      setSending(true);
      const content = editor.getHTML();

      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parentId: activeThreadId }),
      });

      if (res.ok) {
        editor.commands.setContent('');
        setIsEditorEmpty(true);
        const data = await res.json();
        // Socket should handle appending, or we can manually append here
        // if socket event is too slow
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function initials(name: string) {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  }

  return (
    <div className={styles.threadPanel}>
      <div className={styles.header}>
        <h3>Thread</h3>
        <button className="btn-icon" onClick={onClose}><X size={16} /></button>
      </div>
      
      <div className={styles.scrollArea}>
        {/* Parent Message */}
        <div className={styles.parentMessage}>
          <div className={styles.msgHeader}>
            <div className={`avatar avatar-sm status-${parentMessage.sender.status}`}>
              {parentMessage.sender.avatar ? <Image src={parentMessage.sender.avatar} alt="Avatar" width={32} height={32} style={{ borderRadius: "50%", objectFit: "cover" }} /> : initials(parentMessage.sender.name)}
            </div>
            <span className={styles.senderName}>{parentMessage.sender.name}</span>
            <span className={styles.msgTime}>{formatTime(parentMessage.createdAt)}</span>
          </div>
          <div className={styles.msgContent} dangerouslySetInnerHTML={{ __html: parentMessage.content }} />
          {parentMessage.fileUrl && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
              {parentMessage.fileType?.startsWith("image/") ? (
                <>
                  <a href={parentMessage.fileUrl} target="_blank" rel="noopener noreferrer" title="Click to view full image">
                    <img src={parentMessage.fileUrl} alt={parentMessage.fileName} style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px", objectFit: "contain", cursor: "pointer" }} />
                  </a>
                  <a href={parentMessage.fileUrl} download={parentMessage.fileName} 
                     style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", color: "var(--brand)", textDecoration: "none", fontSize: "12px" }}>
                    📥 Download {parentMessage.fileName}
                  </a>
                </>
              ) : (
                <a href={parentMessage.fileUrl} download={parentMessage.fileName} target="_blank" rel="noopener noreferrer"
                   style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", color: "var(--brand)", textDecoration: "none", fontSize: "12px" }}>
                  📎 {parentMessage.fileName}
                </a>
              )}
            </div>
          )}
        </div>
        
        <div className={styles.divider}>
          <span>{replies.length} replies</span>
        </div>

        {/* Replies */}
        <div className={styles.repliesList}>
          {loading ? (
            <div className={styles.loading}>Loading replies...</div>
          ) : replies.map(msg => (
            <div key={msg.id} className={styles.replyMsg}>
              <div className={styles.msgHeader}>
                <div className={`avatar avatar-xs status-${msg.sender.status}`}>
                  {msg.sender.avatar ? <Image src={msg.sender.avatar} alt="Avatar" width={32} height={32} style={{ borderRadius: "50%", objectFit: "cover" }} /> : initials(msg.sender.name)}
                </div>
                <span className={styles.senderName}>{msg.sender.name}</span>
                <span className={styles.msgTime}>{formatTime(msg.createdAt)}</span>
              </div>
              <div className={styles.msgContent} dangerouslySetInnerHTML={{ __html: msg.content }} />
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className={styles.inputArea}>
        <div className={styles.inputWrap}>
          <div className={`tiptap-wrapper ${styles.editor}`} onClick={() => editor?.commands.focus()}>
            <EditorContent editor={editor} />
          </div>
          <button 
            id="send-reply-btn"
            className={styles.sendBtn} 
            onClick={sendReply}
            disabled={isEditorEmpty || sending}
          >
            {sending ? <span className="spinner" style={{width: 14, height: 14}} /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
