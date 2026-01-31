"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X, Smartphone, Wifi, WifiOff } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);

  // Register service worker
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {})
        .catch(() => {});
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show banner after 3 seconds
      setTimeout(() => setShowInstallBanner(true), 3000);
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Online/Offline detection
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineAlert(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineAlert(true);
    };

    setIsOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    } catch {
      // Install prompt failed or was dismissed
    }
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    setShowInstallBanner(false);
    // Don't show again for this session
    sessionStorage.setItem("pwa-banner-dismissed", "true");
  }, []);

  // Don't show if already installed or dismissed
  useEffect(() => {
    if (sessionStorage.getItem("pwa-banner-dismissed")) {
      setShowInstallBanner(false);
    }
  }, []);

  if (isInstalled) return null;

  return (
    <>
      {/* Offline Alert */}
      {showOfflineAlert && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span>אתה במצב אופליין - הנתונים נשמרים במכשיר</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-white hover:bg-amber-600"
            onClick={() => setShowOfflineAlert(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Online indicator (brief) */}
      {isOnline && !showOfflineAlert && (
        <div className="fixed bottom-4 left-4 z-40">
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm">
            <Wifi className="w-3 h-3 text-emerald-500" />
            <span>מחובר</span>
          </div>
        </div>
      )}

      {/* Install Banner */}
      {showInstallBanner && deferredPrompt && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-300">
          <Card className="max-w-lg mx-auto shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <h3 className="font-bold text-foreground mb-1">
                    התקן את גלוקוטרק
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    הוסף לדף הבית לגישה מהירה ועבודה אופליין
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={dismissBanner}
                      className="text-muted-foreground"
                    >
                      לא עכשיו
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleInstall}
                      className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white gap-2"
                    >
                      <Download className="w-4 h-4" />
                      התקן
                    </Button>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0 h-8 w-8 p-0"
                  onClick={dismissBanner}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
