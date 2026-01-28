"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  Sparkles,
  Loader2,
  MessageCircle,
  X,
  Lightbulb,
  TrendingUp,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { BloodSugarMeasurement } from "@/lib/diabetes-types";

interface AIAssistantProps {
  measurements: BloodSugarMeasurement[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  provider?: string;
}

const QUICK_PROMPTS = [
  {
    icon: TrendingUp,
    text: "נתח את המגמות שלי",
    prompt: "נתח את מגמות הסוכר שלי ותן לי תובנות על הדפוסים שאתה רואה",
  },
  {
    icon: Lightbulb,
    text: "מה אני יכול לשפר?",
    prompt: "על סמך הנתונים שלי, מה אני יכול לעשות כדי לשפר את איזון הסוכר?",
  },
  {
    icon: AlertCircle,
    text: "האם יש משהו מדאיג?",
    prompt: "האם יש משהו בנתונים שלי שצריך לשים אליו לב או להתייעץ עם רופא?",
  },
];

export function AIAssistant({ measurements }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check AI availability on mount
  useEffect(() => {
    checkAvailability();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const checkAvailability = async () => {
    try {
      const response = await fetch("/api/ai");
      const data = await response.json();
      setIsAvailable(data.ok && data.availableProviders?.length > 0);
    } catch {
      setIsAvailable(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: content,
          measurements: measurements.slice(0, 50).map(m => ({
            value: m.value,
            date: m.date,
            time: m.time,
            context: m.context,
          })),
          taskType: "analysis",
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "שגיאה בשירות ה-AI");
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.result,
        timestamp: new Date(),
        provider: data.provider,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה לא צפויה");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // If AI is not available, show a teaser card
  if (isAvailable === false) {
    return (
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/80">
        <CardHeader className="bg-gradient-to-l from-violet-500/10 to-transparent pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/10 dark:bg-violet-500/20">
              <Bot className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="text-right">
              <CardTitle className="text-xl">עוזר AI חכם</CardTitle>
              <CardDescription>בקרוב - ניתוח מתקדם עם בינה מלאכותית</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm">
            <Sparkles className="w-4 h-4" />
            <span>פיצ'ר פרימיום - בקרוב</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            קבל תובנות מתקדמות, ניתוח דפוסים והמלצות מותאמות אישית
          </p>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isAvailable === null) {
    return (
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/80">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/80">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="bg-gradient-to-l from-violet-500/10 to-transparent pb-4 cursor-pointer hover:bg-violet-500/5 transition-colors">
            <div className="flex items-center justify-between">
              <ChevronDown
                className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <CardTitle className="text-xl flex items-center gap-2 justify-end">
                    גלוקו-AI
                    <Sparkles className="w-4 h-4 text-violet-500" />
                  </CardTitle>
                  <CardDescription>
                    שאל שאלות על נתוני הסוכר שלך
                  </CardDescription>
                </div>
                <div className="p-2 rounded-xl bg-violet-500/10 dark:bg-violet-500/20">
                  <Bot className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Messages Area */}
            <div className="h-72 overflow-y-auto mb-4 space-y-3 p-3 bg-muted/30 rounded-xl">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <MessageCircle className="w-10 h-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    שלום! אני גלוקו-AI. אני יכול לעזור לך להבין את נתוני הסוכר שלך.
                  </p>
                  {/* Quick prompts */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {QUICK_PROMPTS.map((qp, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5 bg-background"
                        onClick={() => sendMessage(qp.prompt)}
                        disabled={isLoading || measurements.length === 0}
                      >
                        <qp.icon className="w-3.5 h-3.5" />
                        {qp.text}
                      </Button>
                    ))}
                  </div>
                  {measurements.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
                      הוסף מדידות כדי להתחיל לשוחח
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === "user" ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                          message.role === "user"
                            ? "bg-violet-500 text-white rounded-br-md"
                            : "bg-background border rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                        {message.provider && (
                          <p className="text-[10px] mt-1 opacity-60">
                            via {message.provider}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-end">
                      <div className="bg-background border rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                          <span className="text-sm text-muted-foreground">
                            חושב...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 mr-auto"
                  onClick={() => setError(null)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* Input Area */}
            <div className="flex gap-2">
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading || measurements.length === 0}
                className="h-12 w-12 rounded-xl bg-violet-500 hover:bg-violet-600"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  measurements.length === 0
                    ? "הוסף מדידות כדי להתחיל..."
                    : "שאל שאלה על נתוני הסוכר שלך..."
                }
                disabled={isLoading || measurements.length === 0}
                className="flex-1 h-12 px-4 py-3 text-right text-sm rounded-xl border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                dir="rtl"
                rows={1}
              />
            </div>

            {/* Disclaimer */}
            <p className="text-[10px] text-muted-foreground text-center mt-3">
              ⚠️ המידע אינו מהווה ייעוץ רפואי. יש להתייעץ עם רופא.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
