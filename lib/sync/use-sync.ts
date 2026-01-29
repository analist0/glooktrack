/**
 * @fileoverview React hooks לשימוש במנוע הסנכרון
 * React hooks for using the sync engine
 */

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getSyncEngine, SyncEngine } from "./sync-engine";
import {
  SyncStatus,
  SyncEventType,
  SyncOperation,
  type SyncConfig,
  type SyncStatusDetails,
  type SyncEvent,
  type PendingChange,
  SYNC_STATUS_LABELS,
} from "./sync-types";

/**
 * תוצאה מה-hook useSyncStatus
 * Result from useSyncStatus hook
 */
interface UseSyncStatusResult {
  /** סטטוס מפורט */
  status: SyncStatusDetails;
  /** תווית סטטוס בעברית */
  statusLabel: string;
  /** האם הסנכרון פעיל */
  isSyncing: boolean;
  /** האם יש שגיאה */
  hasError: boolean;
  /** האם המכשיר מקוון */
  isOnline: boolean;
  /** האם יש שינויים בהמתנה */
  hasPendingChanges: boolean;
  /** זמן מאז סנכרון אחרון (טקסט) */
  lastSyncText: string | null;
}

/**
 * תוצאה מה-hook useSync
 * Result from useSync hook
 */
interface UseSyncResult extends UseSyncStatusResult {
  /** הפעלת סנכרון ידני */
  sync: () => Promise<boolean>;
  /** הוספת שינוי לתור */
  queueChange: <T>(
    operation: SyncOperation,
    entityType: string,
    itemId: string,
    data?: T
  ) => void;
  /** קבלת תור השינויים */
  getPendingQueue: () => PendingChange[];
  /** ניקוי תור השינויים */
  clearQueue: () => void;
  /** עדכון הגדרות */
  updateConfig: (config: Partial<SyncConfig>) => void;
  /** קבלת הגדרות נוכחיות */
  getConfig: () => SyncConfig;
  /** הפעלה/כיבוי סנכרון אוטומטי */
  toggleAutoSync: (enabled?: boolean) => void;
}

/**
 * תוצאה מה-hook useSyncEvents
 * Result from useSyncEvents hook
 */
interface UseSyncEventsResult {
  /** אירועים אחרונים */
  events: SyncEvent[];
  /** האירוע האחרון */
  lastEvent: SyncEvent | null;
  /** ניקוי היסטוריית אירועים */
  clearEvents: () => void;
}

/**
 * מחשב זמן יחסי מסנכרון אחרון
 * Calculate relative time from last sync
 */
function getRelativeTimeText(timestamp: number | null): string | null {
  if (!timestamp) return null;

  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "לפני רגע";
  } else if (minutes < 60) {
    return `לפני ${minutes} דקות`;
  } else if (hours < 24) {
    return `לפני ${hours} שעות`;
  } else if (days < 7) {
    return `לפני ${days} ימים`;
  } else {
    const date = new Date(timestamp);
    return date.toLocaleDateString("he-IL");
  }
}

/**
 * Hook לקבלת סטטוס סנכרון בזמן אמת
 * Hook for real-time sync status
 *
 * @example
 * ```tsx
 * function SyncIndicator() {
 *   const { statusLabel, isSyncing, isOnline, hasPendingChanges } = useSyncStatus();
 *
 *   return (
 *     <div>
 *       <span>{statusLabel}</span>
 *       {isSyncing && <Spinner />}
 *       {!isOnline && <OfflineIcon />}
 *       {hasPendingChanges && <Badge>יש שינויים בהמתנה</Badge>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSyncStatus(config?: Partial<SyncConfig>): UseSyncStatusResult {
  const [status, setStatus] = useState<SyncStatusDetails>({
    status: SyncStatus.Idle,
    isOnline: true,
    isEnabled: true,
    lastSyncAt: null,
    pendingCount: 0,
    lastError: null,
    progress: 0,
    totalItems: 0,
    syncedItems: 0,
  });

  const engineRef = useRef<SyncEngine | null>(null);

  useEffect(() => {
    // אתחול מנוע סנכרון
    if (typeof window === "undefined") return;

    engineRef.current = getSyncEngine(config);

    // עדכון סטטוס התחלתי
    setStatus(engineRef.current.getStatus());

    // הגדרת מאזינים לאירועים
    const unsubscribers: (() => void)[] = [];

    const updateStatus = () => {
      if (engineRef.current) {
        setStatus(engineRef.current.getStatus());
      }
    };

    // האזנה לכל סוגי האירועים הרלוונטיים
    const eventTypes = [
      SyncEventType.SyncStarted,
      SyncEventType.SyncCompleted,
      SyncEventType.SyncError,
      SyncEventType.ConnectionChanged,
      SyncEventType.ItemQueued,
      SyncEventType.ItemSynced,
    ];

    for (const eventType of eventTypes) {
      const unsub = engineRef.current.on(eventType, updateStatus);
      unsubscribers.push(unsub);
    }

    // עדכון תקופתי של זמן סנכרון אחרון
    const intervalId = setInterval(updateStatus, 60000); // כל דקה

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      clearInterval(intervalId);
    };
  }, [config]);

  const statusLabel = SYNC_STATUS_LABELS[status.status];
  const isSyncing = status.status === SyncStatus.Syncing;
  const hasError = status.status === SyncStatus.Error;
  const isOnline = status.isOnline;
  const hasPendingChanges = status.pendingCount > 0;
  const lastSyncText = getRelativeTimeText(status.lastSyncAt);

  return {
    status,
    statusLabel,
    isSyncing,
    hasError,
    isOnline,
    hasPendingChanges,
    lastSyncText,
  };
}

/**
 * Hook מלא לניהול סנכרון
 * Full sync management hook
 *
 * @example
 * ```tsx
 * function DataForm() {
 *   const { sync, queueChange, isSyncing, hasPendingChanges } = useSync();
 *
 *   const handleSave = async (data: MeasurementData) => {
 *     // הוספה לתור הסנכרון
 *     queueChange(SyncOperation.Create, 'measurements', data.id, data);
 *
 *     // או סנכרון מיידי
 *     await sync();
 *   };
 *
 *   return (
 *     <form onSubmit={handleSave}>
 *       {hasPendingChanges && <span>יש שינויים שלא נשמרו</span>}
 *       <button disabled={isSyncing}>שמור</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useSync(config?: Partial<SyncConfig>): UseSyncResult {
  const statusResult = useSyncStatus(config);
  const engineRef = useRef<SyncEngine | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    engineRef.current = getSyncEngine(config);
  }, [config]);

  /**
   * הפעלת סנכרון ידני
   * Trigger manual sync
   */
  const sync = useCallback(async (): Promise<boolean> => {
    if (!engineRef.current) return false;
    return engineRef.current.sync();
  }, []);

  /**
   * הוספת שינוי לתור
   * Queue a change for sync
   */
  const queueChange = useCallback(
    <T,>(
      operation: SyncOperation,
      entityType: string,
      itemId: string,
      data?: T
    ): void => {
      if (!engineRef.current) return;
      engineRef.current.queueChange(operation, entityType, itemId, data);
    },
    []
  );

  /**
   * קבלת תור השינויים
   * Get pending changes queue
   */
  const getPendingQueue = useCallback((): PendingChange[] => {
    if (!engineRef.current) return [];
    return engineRef.current.getPendingQueue();
  }, []);

  /**
   * ניקוי תור השינויים
   * Clear pending changes queue
   */
  const clearQueue = useCallback((): void => {
    if (!engineRef.current) return;
    engineRef.current.clearPendingQueue();
  }, []);

  /**
   * עדכון הגדרות
   * Update configuration
   */
  const updateConfig = useCallback((newConfig: Partial<SyncConfig>): void => {
    if (!engineRef.current) return;
    engineRef.current.updateConfig(newConfig);
  }, []);

  /**
   * קבלת הגדרות נוכחיות
   * Get current configuration
   */
  const getConfig = useCallback((): SyncConfig => {
    if (!engineRef.current) {
      return {} as SyncConfig;
    }
    return engineRef.current.getConfig();
  }, []);

  /**
   * הפעלה/כיבוי סנכרון אוטומטי
   * Toggle auto sync
   */
  const toggleAutoSync = useCallback((enabled?: boolean): void => {
    if (!engineRef.current) return;

    const currentConfig = engineRef.current.getConfig();
    const newEnabled = enabled !== undefined ? enabled : !currentConfig.autoSync;

    engineRef.current.updateConfig({ autoSync: newEnabled });

    if (newEnabled) {
      engineRef.current.startAutoSync();
    } else {
      engineRef.current.stopAutoSync();
    }
  }, []);

  return {
    ...statusResult,
    sync,
    queueChange,
    getPendingQueue,
    clearQueue,
    updateConfig,
    getConfig,
    toggleAutoSync,
  };
}

/**
 * Hook להאזנה לאירועי סנכרון
 * Hook for listening to sync events
 *
 * @param maxEvents מספר מקסימלי של אירועים לשמור (ברירת מחדל: 50)
 *
 * @example
 * ```tsx
 * function SyncLog() {
 *   const { events, lastEvent, clearEvents } = useSyncEvents();
 *
 *   return (
 *     <div>
 *       <h3>היסטוריית סנכרון</h3>
 *       <button onClick={clearEvents}>נקה היסטוריה</button>
 *       <ul>
 *         {events.map((event, i) => (
 *           <li key={i}>
 *             {new Date(event.timestamp).toLocaleTimeString('he-IL')} - {event.type}
 *           </li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSyncEvents(maxEvents: number = 50): UseSyncEventsResult {
  const [events, setEvents] = useState<SyncEvent[]>([]);
  const engineRef = useRef<SyncEngine | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    engineRef.current = getSyncEngine();

    const unsubscribers: (() => void)[] = [];

    // האזנה לכל סוגי האירועים
    const allEventTypes = Object.values(SyncEventType);

    const handleEvent = (event: SyncEvent) => {
      setEvents((prev) => {
        const updated = [event, ...prev];
        return updated.slice(0, maxEvents);
      });
    };

    for (const eventType of allEventTypes) {
      const unsub = engineRef.current.on(eventType, handleEvent);
      unsubscribers.push(unsub);
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [maxEvents]);

  const lastEvent = useMemo(() => (events.length > 0 ? events[0] : null), [events]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    lastEvent,
    clearEvents,
  };
}

/**
 * Hook לסנכרון אוטומטי בעת שינויים
 * Hook for auto-syncing on data changes
 *
 * @param entityType סוג הישות
 * @param data הנתונים לסנכרון
 * @param options אפשרויות
 *
 * @example
 * ```tsx
 * function MeasurementEditor({ measurement }: { measurement: Measurement }) {
 *   const [data, setData] = useState(measurement);
 *
 *   // סנכרון אוטומטי כשהנתונים משתנים
 *   useSyncOnChange('measurements', data, {
 *     debounceMs: 1000,
 *     enabled: true
 *   });
 *
 *   return <input value={data.value} onChange={e => setData({...data, value: e.target.value})} />;
 * }
 * ```
 */
export function useSyncOnChange<T extends { id: string }>(
  entityType: string,
  data: T | null,
  options: {
    /** האם לסנכרן אוטומטית */
    enabled?: boolean;
    /** זמן המתנה לפני סנכרון (מילישניות) */
    debounceMs?: number;
    /** האם זו פעולת יצירה או עדכון */
    operation?: SyncOperation.Create | SyncOperation.Update;
  } = {}
): void {
  const { enabled = true, debounceMs = 500, operation = SyncOperation.Update } = options;
  const engineRef = useRef<SyncEngine | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousDataRef = useRef<T | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    engineRef.current = getSyncEngine();
  }, []);

  useEffect(() => {
    if (!enabled || !data || !engineRef.current) return;

    // בדיקה אם הנתונים השתנו
    if (JSON.stringify(data) === JSON.stringify(previousDataRef.current)) {
      return;
    }

    // ביטול timeout קודם
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // הגדרת timeout חדש
    timeoutRef.current = setTimeout(() => {
      if (engineRef.current && data) {
        engineRef.current.queueChange(operation, entityType, data.id, data);
      }
      previousDataRef.current = data;
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, entityType, enabled, debounceMs, operation]);
}

/**
 * Hook לטיפול בסטטוס רשת
 * Hook for network status handling
 *
 * @example
 * ```tsx
 * function NetworkBanner() {
 *   const { isOnline, wasOffline } = useNetworkStatus();
 *
 *   if (!isOnline) {
 *     return <Banner type="warning">אתה לא מחובר לאינטרנט</Banner>;
 *   }
 *
 *   if (wasOffline) {
 *     return <Banner type="success">החיבור חזר! הנתונים מסתנכרנים...</Banner>;
 *   }
 *
 *   return null;
 * }
 * ```
 */
export function useNetworkStatus(): {
  isOnline: boolean;
  wasOffline: boolean;
} {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const wasOfflineTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);

      // נקה את wasOffline אחרי כמה שניות
      if (wasOfflineTimeoutRef.current) {
        clearTimeout(wasOfflineTimeoutRef.current);
      }
      wasOfflineTimeoutRef.current = setTimeout(() => {
        setWasOffline(false);
      }, 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (wasOfflineTimeoutRef.current) {
        clearTimeout(wasOfflineTimeoutRef.current);
      }
    };
  }, []);

  return { isOnline, wasOffline };
}

/**
 * Hook לסנכרון עם שמירה אוטומטית
 * Hook for sync with auto-save functionality
 *
 * @param entityType סוג הישות
 * @param initialData נתונים התחלתיים
 *
 * @example
 * ```tsx
 * function SettingsEditor() {
 *   const {
 *     data,
 *     setData,
 *     save,
 *     isSaving,
 *     isDirty,
 *     reset
 *   } = useAutoSave('settings', defaultSettings);
 *
 *   return (
 *     <form>
 *       <input
 *         value={data.name}
 *         onChange={e => setData(prev => ({...prev, name: e.target.value}))}
 *       />
 *       {isDirty && <span>יש שינויים שלא נשמרו</span>}
 *       <button onClick={save} disabled={isSaving || !isDirty}>
 *         {isSaving ? 'שומר...' : 'שמור'}
 *       </button>
 *       <button onClick={reset} disabled={!isDirty}>בטל שינויים</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useAutoSave<T extends { id: string }>(
  entityType: string,
  initialData: T
): {
  data: T;
  setData: React.Dispatch<React.SetStateAction<T>>;
  save: () => Promise<boolean>;
  isSaving: boolean;
  isDirty: boolean;
  reset: () => void;
  lastSavedAt: number | null;
} {
  const [data, setData] = useState<T>(initialData);
  const [originalData, setOriginalData] = useState<T>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const engineRef = useRef<SyncEngine | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    engineRef.current = getSyncEngine();
  }, []);

  // עדכון נתונים התחלתיים כשהם משתנים מבחוץ
  useEffect(() => {
    setData(initialData);
    setOriginalData(initialData);
  }, [initialData]);

  const isDirty = useMemo(
    () => JSON.stringify(data) !== JSON.stringify(originalData),
    [data, originalData]
  );

  const save = useCallback(async (): Promise<boolean> => {
    if (!engineRef.current || !isDirty) return false;

    setIsSaving(true);
    try {
      // בדיקה אם זו יצירה או עדכון
      const operation = lastSavedAt ? SyncOperation.Update : SyncOperation.Create;

      engineRef.current.queueChange(operation, entityType, data.id, data);
      const result = await engineRef.current.sync();

      if (result) {
        setOriginalData(data);
        setLastSavedAt(Date.now());
      }

      return result;
    } finally {
      setIsSaving(false);
    }
  }, [data, entityType, isDirty, lastSavedAt]);

  const reset = useCallback(() => {
    setData(originalData);
  }, [originalData]);

  return {
    data,
    setData,
    save,
    isSaving,
    isDirty,
    reset,
    lastSavedAt,
  };
}

// ייצוא סוגים וקבועים נוספים
export { SyncStatus, SyncEventType, SyncOperation, SYNC_STATUS_LABELS };
export type { SyncEvent, SyncConfig, SyncStatusDetails, PendingChange };
