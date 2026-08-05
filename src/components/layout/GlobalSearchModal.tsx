"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Search, User, Hash, MessageSquare, X } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./GlobalSearchModal.module.css";

export default function GlobalSearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    users: any[];
    channels: any[];
    messages: any[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery("");
      setResults(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  function handleNavigate(url: string) {
    setIsOpen(false);
    router.push(url);
  }

  function stripHtml(html: string) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  }

  return (
    <div className={styles.overlay} onClick={() => setIsOpen(false)}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.searchHeader}>
          <Search size={20} className={styles.searchIcon} />
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Search people, channels, and messages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
            <X size={16} />
            <span className={styles.escBadge}>ESC</span>
          </button>
        </div>

        <div className={styles.resultsArea}>
          {loading && <div className={styles.loading}>Searching...</div>}
          
          {!loading && results && (
            <>
              {results.users.length > 0 && (
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>People</h4>
                  {results.users.map(user => (
                    <div key={user.id} className={styles.resultItem} onClick={() => handleNavigate(`/dm/${user.id}`)}>
                      <div className={`avatar avatar-sm status-${user.status}`}>
                        {user.avatar ? <Image src={user.avatar} alt="Avatar" width={32} height={32} style={{ borderRadius: "50%", objectFit: "cover" }} /> : user.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className={styles.resultText}>
                        <span className={styles.resultName}>{user.name}</span>
                        {user.jobTitle && <span className={styles.resultSub}>{user.jobTitle}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.channels.length > 0 && (
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>Channels</h4>
                  {results.channels.map(channel => (
                    <div key={channel.id} className={styles.resultItem} onClick={() => handleNavigate(`/channels/${channel.id}`)}>
                      <Hash size={18} className={styles.resultIcon} />
                      <div className={styles.resultText}>
                        <span className={styles.resultName}>{channel.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.messages.length > 0 && (
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>Messages</h4>
                  {results.messages.map(msg => (
                    <div key={msg.id} className={styles.resultItem} onClick={() => {
                      if (msg.type === 'channel') handleNavigate(`/channels/${msg.channel.id}`);
                      else handleNavigate(`/dm/${msg.otherUser.id}`);
                    }}>
                      <MessageSquare size={18} className={styles.resultIcon} />
                      <div className={styles.resultText}>
                        <span className={styles.resultName}>
                          {msg.sender.name} {msg.type === 'channel' ? `in #${msg.channel.name}` : 'in DM'}
                        </span>
                        <span className={styles.resultPreview}>{stripHtml(msg.content)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {results.users.length === 0 && results.channels.length === 0 && results.messages.length === 0 && (
                <div className={styles.emptyState}>No results found for "{query}"</div>
              )}
            </>
          )}

          {!query && (
            <div className={styles.emptyState}>
              <Search size={32} className={styles.emptyIcon} />
              <p>Type to search across your workspace</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
