"use client";

import { Info, Heart, Droplet, Settings, BarChart3, LogIn, LogOut, Cloud } from "lucide-react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProfileImage } from "./profile-image";
import { ThemeToggle } from "@/components/theme-toggle";

interface HeaderProps {
  onOpenSettings?: () => void;
  onOpenAuth?: () => void;
  isAuthenticated?: boolean;
  onSignOut?: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
}

export function Header({ onOpenSettings, onOpenAuth, isAuthenticated, onSignOut, onSync, isSyncing }: HeaderProps) {
  return (
    <header className="bg-gradient-to-l from-teal-600 via-teal-500 to-emerald-500 text-white sticky top-0 z-10 shadow-xl overflow-hidden">
      <TooltipProvider>
        <div className="w-full px-1.5 py-1.5 sm:px-4 sm:py-3">
          {/* Flexbox עם גודל קבוע לכל אלמנט */}
          <div className="flex items-center justify-between gap-0.5 sm:gap-2">
            {/* כפתורי פעולה - צד שמאל - גודל קבוע */}
            <div className="flex-shrink-0 flex items-center gap-0.5 sm:gap-1">
              {/* כפתור מצב כהה/בהיר */}
              <ThemeToggle />

              {/* כפתור מידע */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-center w-7 h-7 sm:w-10 sm:h-10 rounded-xl text-white/90 hover:bg-white/20 transition-colors"
                    aria-label="מידע על טווחי סוכר בריאים"
                  >
                    <Info className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="start"
                  className="max-w-xs p-4 text-sm bg-card text-card-foreground border shadow-xl"
                >
                  <p className="font-semibold mb-3 text-right text-base">הנחיות רמת סוכר בדם:</p>
                  <ul className="space-y-3 text-right">
                    <li className="flex items-center gap-3 justify-end">
                      <span className="text-sm">{"נמוך: מתחת ל-70 מ\"ג/ד\"ל"}</span>
                      <span className="w-4 h-4 rounded-full bg-blue-500 flex-shrink-0" />
                    </li>
                    <li className="flex items-center gap-3 justify-end">
                      <span className="text-sm">{"תקין: 70-180 מ\"ג/ד\"ל"}</span>
                      <span className="w-4 h-4 rounded-full bg-emerald-500 flex-shrink-0" />
                    </li>
                    <li className="flex items-center gap-3 justify-end">
                      <span className="text-sm">{"גבוה: מעל 180 מ\"ג/ד\"ל"}</span>
                      <span className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0" />
                    </li>
                  </ul>
                </TooltipContent>
              </Tooltip>

              {/* כפתור הגדרות */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="flex items-center justify-center w-7 h-7 sm:w-10 sm:h-10 rounded-xl text-white/90 hover:bg-white/20 transition-colors"
                    aria-label="הגדרות מערכת"
                  >
                    <Settings className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="start"
                  className="text-sm"
                >
                  הגדרות מערכת
                </TooltipContent>
              </Tooltip>

              {/* כפתור לוח בקרה */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin"
                    className="flex items-center justify-center w-7 h-7 sm:w-10 sm:h-10 rounded-xl text-white/90 hover:bg-white/20 transition-colors"
                    aria-label="לוח בקרה"
                  >
                    <BarChart3 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="start"
                  className="text-sm"
                >
                  לוח בקרה
                </TooltipContent>
              </Tooltip>
            </div>

            {/* לוגו - מרכז - flex-1 */}
            <div className="flex items-center justify-center gap-0.5 sm:gap-2 flex-1 min-w-0">
              <div className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm flex-shrink-0">
                <Droplet className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="text-center min-w-0">
                <div className="flex items-center gap-0.5 justify-center">
                  <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-300 animate-pulse flex-shrink-0" />
                  <h1 className="text-xs sm:text-lg font-bold tracking-tight truncate">
                    גלוקוטרק
                  </h1>
                </div>
              </div>
            </div>

            {/* פרופיל וכניסה - צד ימין */}
            <div className="flex-shrink-0 flex items-center gap-0.5 sm:gap-1">
              {isAuthenticated ? (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={onSync}
                        disabled={isSyncing}
                        className="flex items-center justify-center w-7 h-7 sm:w-10 sm:h-10 rounded-xl text-white/90 hover:bg-white/20 transition-colors disabled:opacity-50"
                        aria-label="סנכרון נתונים"
                      >
                        <Cloud className={`w-3.5 h-3.5 sm:w-5 sm:h-5 ${isSyncing ? "animate-pulse" : ""}`} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-sm">
                      {isSyncing ? "מסנכרן..." : "סנכרון נתונים"}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={onSignOut}
                        className="flex items-center justify-center w-7 h-7 sm:w-10 sm:h-10 rounded-xl text-white/90 hover:bg-white/20 transition-colors"
                        aria-label="התנתק"
                      >
                        <LogOut className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-sm">
                      התנתק
                    </TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={onOpenAuth}
                      className="flex items-center justify-center w-7 h-7 sm:w-10 sm:h-10 rounded-xl text-white/90 hover:bg-white/20 transition-colors"
                      aria-label="התחבר"
                    >
                      <LogIn className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-sm">
                    התחבר לסנכרון
                  </TooltipContent>
                </Tooltip>
              )}
              <ProfileImage />
            </div>
          </div>
        </div>
      </TooltipProvider>
    </header>
  );
}
