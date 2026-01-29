"use client";

import { useState } from "react";
import { Mail, Lock, User, LogIn, UserPlus, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/supabase/use-auth";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AuthMode = "login" | "register" | "reset";

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error: err } = await signInWithEmail(email, password);
        if (err) {
          setError(err);
        } else {
          onOpenChange(false);
        }
      } else if (mode === "register") {
        const { error: err } = await signUpWithEmail(email, password, fullName);
        if (err) {
          setError(err);
        } else {
          setSuccessMessage("נרשמת בהצלחה! בדוק את המייל שלך לאימות החשבון.");
        }
      } else if (mode === "reset") {
        const { error: err } = await resetPassword(email);
        if (err) {
          setError(err);
        } else {
          setSuccessMessage("נשלח קישור לאיפוס סיסמה למייל שלך.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    const { error: err } = await signInWithGoogle();
    if (err) {
      setError(err);
      setLoading(false);
    }
  };

  const titles: Record<AuthMode, string> = {
    login: "התחברות",
    register: "הרשמה",
    reset: "איפוס סיסמה",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl text-right">{titles[mode]}</DialogTitle>
          <DialogDescription className="text-right">
            {mode === "login" && "התחבר כדי לסנכרן את הנתונים שלך בין מכשירים"}
            {mode === "register" && "צור חשבון חדש לגישה מכל מכשיר"}
            {mode === "reset" && "הזן את כתובת המייל שלך לאיפוס הסיסמה"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-right flex-1">{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm text-right">
              {successMessage}
            </div>
          )}

          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-right block">שם מלא</Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="השם שלך"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pr-10 text-right"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
              <Label htmlFor="email" className="text-right block">אימייל</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-10"
                  dir="ltr"
                  required
                />
              </div>
          </div>

          {mode !== "reset" && (
            <div className="space-y-2">
              <Label htmlFor="password" className="text-right block">סיסמה</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  dir="ltr"
                  required
                  minLength={6}
                />
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base font-bold bg-gradient-to-l from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : mode === "login" ? (
              <span className="flex items-center gap-2">
                <LogIn className="w-5 h-5" />
                התחבר
              </span>
            ) : mode === "register" ? (
              <span className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                הרשם
              </span>
            ) : (
              "שלח קישור איפוס"
            )}
          </Button>

          {mode !== "reset" && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-muted-foreground">או</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                התחבר עם Google
              </Button>
            </>
          )}

          <div className="flex justify-center gap-4 text-sm">
            {mode === "login" && (
              <>
                <button
                  type="button"
                  onClick={() => { setMode("register"); setError(null); setSuccessMessage(null); }}
                  className="text-teal-600 hover:underline"
                >
                  צור חשבון חדש
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("reset"); setError(null); setSuccessMessage(null); }}
                  className="text-muted-foreground hover:underline"
                >
                  שכחתי סיסמה
                </button>
              </>
            )}
            {(mode === "register" || mode === "reset") && (
              <button
                type="button"
                onClick={() => { setMode("login"); setError(null); setSuccessMessage(null); }}
                className="text-teal-600 hover:underline"
              >
                חזור להתחברות
              </button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
