"use client";

import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from "lucide-react";
import { useNetworkStatus, useSyncStatus, SyncStatus } from "@/lib/sync";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SyncStatusIndicator() {
  const { isOnline } = useNetworkStatus();
  const { status, statusLabel, hasPendingChanges, lastSyncText } = useSyncStatus();

  const getStatusIcon = () => {
    if (!isOnline) {
      return <CloudOff className="w-4 h-4 text-orange-500" />;
    }

    const currentStatus = status.status;

    switch (currentStatus) {
      case SyncStatus.Syncing:
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case SyncStatus.Error:
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case SyncStatus.Idle:
        return hasPendingChanges
          ? <Cloud className="w-4 h-4 text-amber-500" />
          : <Check className="w-4 h-4 text-emerald-500" />;
      default:
        return <Cloud className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return "bg-orange-100 dark:bg-orange-900/30";

    const currentStatus = status.status;

    switch (currentStatus) {
      case SyncStatus.Syncing:
        return "bg-blue-100 dark:bg-blue-900/30";
      case SyncStatus.Error:
        return "bg-red-100 dark:bg-red-900/30";
      case SyncStatus.Idle:
        return hasPendingChanges
          ? "bg-amber-100 dark:bg-amber-900/30"
          : "bg-emerald-100 dark:bg-emerald-900/30";
      default:
        return "bg-muted";
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${getStatusColor()}`}
            role="status"
            aria-label={`סטטוס סנכרון: ${statusLabel}`}
          >
            {getStatusIcon()}
            <span className="hidden sm:inline text-foreground/80">
              {!isOnline ? "אופליין" : statusLabel}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-sm">
          <div className="text-right">
            <p className="font-semibold">{!isOnline ? "מצב אופליין" : statusLabel}</p>
            {lastSyncText && (
              <p className="text-muted-foreground text-xs">
                סנכרון אחרון: {lastSyncText}
              </p>
            )}
            {hasPendingChanges && (
              <p className="text-amber-600 dark:text-amber-400 text-xs">
                יש שינויים בהמתנה לסנכרון
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
