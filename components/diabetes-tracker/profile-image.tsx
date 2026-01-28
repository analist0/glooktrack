"use client";

import React, { useState, useEffect, useRef } from "react";
import { Camera, User, X, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const IMAGE_STORAGE_KEY = "diabetesProfileImage";
const NAME_STORAGE_KEY = "diabetesPatientName";

export function ProfileImage() {
  const [image, setImage] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string>("החולה שלי");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedImage = localStorage.getItem(IMAGE_STORAGE_KEY);
    const storedName = localStorage.getItem(NAME_STORAGE_KEY);
    if (storedImage) {
      setImage(storedImage);
    }
    if (storedName) {
      setPatientName(storedName);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("הקובץ גדול מדי. גודל מקסימלי: 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImage(base64);
      localStorage.setItem(IMAGE_STORAGE_KEY, base64);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImage(null);
    localStorage.removeItem(IMAGE_STORAGE_KEY);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startEditingName = () => {
    setTempName(patientName);
    setIsEditingName(true);
  };

  const saveName = () => {
    const newName = tempName.trim() || "החולה שלי";
    setPatientName(newName);
    localStorage.setItem(NAME_STORAGE_KEY, newName);
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveName();
    } else if (e.key === "Escape") {
      setIsEditingName(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-1 sm:gap-2">
        <div className="text-right">
          <div className="h-3 w-10 sm:w-16 bg-white/20 rounded animate-pulse" />
          <div className="h-2 w-6 sm:w-10 bg-white/10 rounded animate-pulse mt-1" />
        </div>
        <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-white/20 animate-pulse flex-shrink-0" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {/* שם החולה */}
      <div className="text-right max-w-[60px] sm:max-w-[100px]">
        {isEditingName ? (
          <Input
            ref={nameInputRef}
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={saveName}
            onKeyDown={handleNameKeyDown}
            className="h-6 w-full text-[10px] sm:text-xs bg-white/10 border-white/30 text-white placeholder:text-white/50 text-right px-1.5"
            placeholder="שם"
          />
        ) : (
          <button
            type="button"
            onClick={startEditingName}
            className="group/name flex flex-col items-end text-white/90 hover:text-white transition-colors w-full"
          >
            <span className="text-[10px] sm:text-sm font-medium truncate max-w-full leading-tight">
              {patientName}
            </span>
            <span className="text-[7px] sm:text-[10px] text-white/50 flex items-center gap-0.5">
              <Edit2 className="w-2 h-2 opacity-0 group-hover/name:opacity-100" />
              לחץ לעריכה
            </span>
          </button>
        )}
      </div>

      {/* תמונה - גודל קבוע */}
      <div className="relative group flex-shrink-0">
        <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full overflow-hidden bg-white/10 border-2 border-white/30 shadow-lg">
          {image ? (
            <img
              src={image || "/placeholder.svg"}
              alt="תמונת פרופיל"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-white/70" />
            </div>
          )}
        </div>

        <Button
          type="button"
          size="icon"
          className="absolute -bottom-0.5 -start-0.5 w-4 h-4 sm:w-6 sm:h-6 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity bg-white text-teal-600 hover:bg-white/90"
          onClick={() => fileInputRef.current?.click()}
          aria-label="העלה תמונת פרופיל"
        >
          <Camera className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
        </Button>

        {image && (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute -top-0.5 -start-0.5 w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={removeImage}
            aria-label="הסר תמונת פרופיל"
          >
            <X className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
          </Button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          aria-label="בחר תמונת פרופיל"
        />
      </div>
    </div>
  );
}
