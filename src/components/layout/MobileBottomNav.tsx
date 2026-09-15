"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, AtSign, Compass, Calendar, LayoutDashboard } from "lucide-react";
import { useUI } from "@/components/UIProvider";
import styles from "./MobileBottomNav.module.css";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { toggleMobileSidebar } = useUI();

  // Hide mobile bottom nav when inside an active chat (e.g. /channels/*, /dm/*, /group/*)
  const isChatActive = pathname.startsWith("/channels/") || pathname.startsWith("/dm/") || pathname.startsWith("/group/");
  if (isChatActive) return null;

  return (
    <nav className={styles.mobileNav}>
      <button
        className={`${styles.navItem}`}
        onClick={toggleMobileSidebar}
      >
        <MessageSquare size={20} />
        <span>Chats</span>
      </button>

      <Link
        href="/mentions"
        className={`${styles.navItem} ${pathname === "/mentions" ? styles.active : ""}`}
      >
        <AtSign size={20} />
        <span>Mentions</span>
      </Link>

      <Link
        href="/people"
        className={`${styles.navItem} ${pathname === "/people" ? styles.active : ""}`}
      >
        <Compass size={20} />
        <span>People</span>
      </Link>

      <Link
        href="/calendar"
        className={`${styles.navItem} ${pathname === "/calendar" ? styles.active : ""}`}
      >
        <Calendar size={20} />
        <span>Calendar</span>
      </Link>

      <Link
        href="/dashboard"
        className={`${styles.navItem} ${pathname === "/dashboard" ? styles.active : ""}`}
      >
        <LayoutDashboard size={20} />
        <span>Dashboard</span>
      </Link>
    </nav>
  );
}
