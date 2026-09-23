"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare, AtSign, Compass, Calendar, LayoutDashboard } from "lucide-react";
import { useUI } from "@/components/UIProvider";
import styles from "./MobileBottomNav.module.css";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleMobileSidebar, setMobileSidebarOpen } = useUI();

  // Hide mobile bottom nav when inside an active chat (e.g. /channels/*, /dm/*, /group/*)
  // This ensures 100% unblocked visibility for the chat input box, attachment buttons, and keyboard
  const isChatActive = pathname.startsWith("/channels/") || pathname.startsWith("/dm/") || pathname.startsWith("/group/");
  if (isChatActive) return null;

  return (
    <nav className={styles.mobileNav}>
      <button
        className={`${styles.navItem} ${pathname === "/dashboard" ? styles.active : ""}`}
        onClick={() => {
          setMobileSidebarOpen(false);
          router.push("/dashboard");
        }}
        aria-label="Chats"
      >
        <MessageSquare size={20} />
        <span>Chats</span>
      </button>

      <Link
        href="/mentions"
        className={`${styles.navItem} ${pathname === "/mentions" ? styles.active : ""}`}
        onClick={() => setMobileSidebarOpen(false)}
      >
        <AtSign size={20} />
        <span>Mentions</span>
      </Link>

      <Link
        href="/people"
        className={`${styles.navItem} ${pathname === "/people" ? styles.active : ""}`}
        onClick={() => setMobileSidebarOpen(false)}
      >
        <Compass size={20} />
        <span>People</span>
      </Link>

      <Link
        href="/calendar"
        className={`${styles.navItem} ${pathname === "/calendar" ? styles.active : ""}`}
        onClick={() => setMobileSidebarOpen(false)}
      >
        <Calendar size={20} />
        <span>Calendar</span>
      </Link>

      <Link
        href="/dashboard"
        className={`${styles.navItem} ${pathname === "/dashboard" ? styles.active : ""}`}
        onClick={() => setMobileSidebarOpen(false)}
      >
        <LayoutDashboard size={20} />
        <span>Dashboard</span>
      </Link>
    </nav>
  );
}
