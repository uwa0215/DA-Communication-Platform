"use client";

import React, { useEffect, useState } from "react";
import { Bell, X, CheckCircle } from "lucide-react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [showBanner, setShowBanner] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      return;
    }

    setPermission(Notification.permission);

    const isDismissed = sessionStorage.getItem("push_prompt_dismissed");

    if (Notification.permission === "granted") {
      subscribeUserToPush();
    } else if (Notification.permission === "default" && !isDismissed) {
      // Show prompt banner after 3 seconds on workspace
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const subscribeUserToPush = async () => {
    try {
      if (!("serviceWorker" in navigator)) return;

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BOPDofGoPQCqk6zk0QSOFbSECpX9dDmhUh0dwxPqZZJCTDo9bgQ1_EAR8G_ikeh9dlF8zp4005buCcz6_783yVs";

      if (!vapidKey) return;

      const existingSubscription = await registration.pushManager.getSubscription();
      let subscription = existingSubscription;

      if (!subscription) {
        const convertedVapidKey = urlBase64ToUint8Array(vapidKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      }

      if (subscription) {
        await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription }),
        });
        setSubscribed(true);
      }
    } catch (error) {
      console.error("[PushManager] Error subscribing to push notifications:", error);
    }
  };

  const handleEnableClick = async () => {
    if (!("Notification" in window)) return;

    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === "granted") {
        setShowBanner(false);
        await subscribeUserToPush();
      } else {
        setShowBanner(false);
      }
    } catch (e) {
      console.error("[PushManager] Permission request error:", e);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem("push_prompt_dismissed", "true");
  };

  if (!showBanner || permission !== "default") return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:w-96 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-emerald-500/30 text-white rounded-2xl p-4 shadow-2xl shadow-emerald-950/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Turn on Notifications</h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Get notified on mobile & desktop even when the app is closed.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleEnableClick}
            className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-medium text-xs px-3 py-2 rounded-xl transition shadow-lg shadow-emerald-900/30 whitespace-nowrap"
          >
            Enable
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            aria-label="Dismiss notification request"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
