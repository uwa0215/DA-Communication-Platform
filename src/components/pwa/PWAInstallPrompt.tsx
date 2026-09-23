"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Download, X, Share, PlusSquare, Smartphone, Check } from "lucide-react";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check all standalone display modes & local storage flags
    const checkStandalone = () => {
      if (typeof window === "undefined") return false;
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: window-controls-overlay)").matches ||
        window.matchMedia("(display-mode: minimal-ui)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://")
      );
    };

    const isInstalledStorage = localStorage.getItem("pwa_installed") === "true";
    const isDismissedStorage = localStorage.getItem("pwa_prompt_dismissed") === "true";

    const currentlyStandalone = checkStandalone();

    if (currentlyStandalone || isInstalledStorage) {
      setIsStandalone(true);
      setShowPrompt(false);
      localStorage.setItem("pwa_installed", "true");
      return;
    }

    if (isDismissedStorage) {
      setShowPrompt(false);
      return;
    }

    // Listen for standalone display-mode changes
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
        setShowPrompt(false);
        localStorage.setItem("pwa_installed", "true");
      }
    };
    mediaQuery.addEventListener("change", handleMediaChange);

    // Listen for native PWA installation event
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setShowPrompt(false);
      localStorage.setItem("pwa_installed", "true");
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    // Listen for install prompt on Android / Chromium / Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      if (!checkStandalone() && localStorage.getItem("pwa_installed") !== "true") {
        setDeferredPrompt(e);
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // On iOS, show custom banner if not installed
    if (iosDevice && !currentlyStandalone && !isInstalledStorage) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setShowPrompt(false);
      localStorage.setItem("pwa_installed", "true");
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa_prompt_dismissed", "true");
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <>
      {/* Floating Install App Banner */}
      <div className="fixed bottom-20 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:w-96 z-50 animate-in slide-in-from-bottom-5 duration-300">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-emerald-500/30 text-white rounded-2xl p-4 shadow-2xl shadow-emerald-950/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-800 border border-white/10 shrink-0 flex items-center justify-center">
              <Image src="/New Logo.png" alt="Trellis Logo" width={48} height={48} className="object-contain p-1" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                Trellis App
                <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-semibold">
                  Messenger
                </span>
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                {isIOS ? "Tap to install on iPhone/iPad home screen" : "Install as mobile & desktop app"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-medium text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-900/30"
            >
              <Download className="w-3.5 h-3.5" />
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
              aria-label="Dismiss app install prompt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Installation Helper Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base">Install on iPhone / iPad</h3>
                <p className="text-xs text-slate-400">Add Trellis to your home screen</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300 my-5 bg-slate-950/50 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                  1
                </div>
                <span>Tap the <Share className="w-4 h-4 inline text-blue-400 mx-1" /> <strong>Share</strong> button in Safari's toolbar.</span>
              </div>
              <div className="h-px bg-slate-800" />
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                  2
                </div>
                <span>Scroll down and tap <PlusSquare className="w-4 h-4 inline text-white mx-1" /> <strong>Add to Home Screen</strong>.</span>
              </div>
              <div className="h-px bg-slate-800" />
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                  3
                </div>
                <span>Tap <strong>Add</strong> in the top right corner. Done!</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl transition flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
