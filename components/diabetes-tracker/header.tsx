"use client";

import { Info, Heart, Droplet } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProfileImage } from "./profile-image";

export function Header() {
  return (
    <header className="bg-gradient-to-l from-teal-600 via-teal-500 to-emerald-500 text-white sticky top-0 z-10 shadow-xl">
      <TooltipProvider>
        <div className="w-full px-2 py-2 sm:px-4 sm:py-3">
          {/* Flexbox עם גודל קבוע לכל אלמנט */}
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {/* כפתור מידע - צד שמאל - גודל קבוע */}
            <div className="flex-shrink-0 w-10 sm:w-12">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl text-white/90 hover:bg-white/20 transition-colors"
                    aria-label="מידע על טווחי סוכר בריאים"
                  >
                    <Info className="w-4 h-4 sm:w-5 sm:h-5" />
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
            </div>

            {/* לוגו - מרכז - flex-1 */}
            <div className="flex items-center justify-center gap-1 sm:gap-2 flex-1">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm flex-shrink-0">
                <Droplet className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="text-center flex-shrink-0">
                <div className="flex items-center gap-1 justify-center">
                  <Heart className="w-3 h-3 text-red-300 animate-pulse" />
                  <h1 className="text-sm sm:text-lg font-bold tracking-tight">
                    גלוקוטרק
                  </h1>
                </div>
              </div>
            </div>

            {/* פרופיל - צד ימין - גודל קבוע */}
            <div className="flex-shrink-0">
              <ProfileImage />
            </div>
          </div>
        </div>
      </TooltipProvider>
    </header>
  );
}
