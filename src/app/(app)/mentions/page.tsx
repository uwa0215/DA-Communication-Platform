"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { AtSign, Hash, MessageCircle, Clock, Bell } from "lucide-react";
import styles from "./mentions.module.css";

interface MentionMessage {
  id: string;
  content: string;
  createdAt: string;
  type: 'channel' | 'dm';
  sender: {
    id: string;
    name: string;
    avatar: string | null;
  };
  channel?: {
    id: string;
    name: string;
  };
  otherUser?: {
    id: string;
    name: string;
  };
  link: string;
}

export default function MentionsPage() {
  const [mentions, setMentions] = useState<MentionMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMentions() {
      try {
        const res = await fetch("/api/mentions");
        const data = await res.json();
        setMentions(data.mentions || []);
      } catch (e) {
        console.error("Failed to fetch mentions", e);
      } finally {
        setLoading(false);
      }
    }
    fetchMentions();
  }, []);

  const initials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const formatTime = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.mentionsPage}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <AtSign size={24} />
          Mentions & Reactions
        </h1>
        <p className={styles.subtitle}>
          Messages where you were mentioned
        </p>
      </div>

      {loading ? (
        <div className={styles.mentionsList}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`skeleton ${styles.skeletonCard}`} />
          ))}
        </div>
      ) : mentions.length === 0 ? (
        <div className={styles.empty}>
          <Bell size={48} />
          <p>You haven't been mentioned yet.</p>
        </div>
      ) : (
        <div className={styles.mentionsList}>
          {mentions.map((m) => (
            <Link href={m.link} key={m.id} className={styles.mentionCard}>
              <div className={styles.mentionContext}>
                {m.type === 'channel' ? (
                  <>
                    <Hash size={14} className={styles.mentionIcon} />
                    In {m.channel?.name}
                  </>
                ) : (
                  <>
                    <MessageCircle size={14} className={styles.mentionIcon} />
                    Direct Message with {m.otherUser?.name}
                  </>
                )}
              </div>
              
              <div className={styles.mentionBody}>
                <div className={`avatar avatar-md`}>
                  {m.sender.avatar ? (
                    <Image src={m.sender.avatar} alt={m.sender.name} width={32} height={32} style={{ borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    initials(m.sender.name)
                  )}
                </div>
                <div className={styles.mentionContent}>
                  <div className={styles.mentionSender}>
                    {m.sender.name}
                    <span className={styles.mentionTime}>
                      <Clock size={12} style={{ marginRight: 4 }} />
                      {formatTime(m.createdAt)}
                    </span>
                  </div>
                  <div 
                    className={styles.mentionMessage}
                    dangerouslySetInnerHTML={{ __html: m.content }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
