/**
 * @fileoverview טיפוסים ומבנים למערכת סנכרון הנתונים
 * Data Synchronization Types and Interfaces
 */

/**
 * סטטוס הסנכרון הנוכחי
 * Current synchronization status
 */
export enum SyncStatus {
  /** מערכת מוכנה אך לא פעילה */
  Idle = "idle",
  /** סנכרון בתהליך */
  Syncing = "syncing",
  /** שגיאה בסנכרון */
  Error = "error",
  /** המכשיר במצב לא מקוון */
  Offline = "offline",
  /** סנכרון ראשוני מהשרת */
  Initializing = "initializing",
}

/**
 * אסטרטגיות לפתרון התנגשויות
 * Conflict resolution strategies
 */
export enum ConflictResolution {
  /** הנתון המקומי גובר */
  LocalWins = "local-wins",
  /** הנתון מהשרת גובר */
  RemoteWins = "remote-wins",
  /** הנתון החדש יותר גובר (לפי timestamp) */
  LastWriteWins = "last-write-wins",
  /** שמור את שני הגרסאות */
  KeepBoth = "keep-both",
  /** בקש מהמשתמש להחליט */
  Manual = "manual",
}

/**
 * סוגי אירועי סנכרון
 * Sync event types
 */
export enum SyncEventType {
  /** התחלת סנכרון */
  SyncStarted = "sync-started",
  /** סנכרון הושלם בהצלחה */
  SyncCompleted = "sync-completed",
  /** שגיאה בסנכרון */
  SyncError = "sync-error",
  /** התגלתה התנגשות */
  ConflictDetected = "conflict-detected",
  /** התנגשות נפתרה */
  ConflictResolved = "conflict-resolved",
  /** שינוי סטטוס חיבור */
  ConnectionChanged = "connection-changed",
  /** פריט נוסף לתור ההמתנה */
  ItemQueued = "item-queued",
  /** פריט סונכרן מהתור */
  ItemSynced = "item-synced",
  /** גירסה חדשה זמינה */
  NewVersionAvailable = "new-version-available",
}

/**
 * סוגי פעולות סנכרון
 * Sync operation types
 */
export enum SyncOperation {
  Create = "create",
  Update = "update",
  Delete = "delete",
}

/**
 * אירוע סנכרון
 * Sync event interface
 */
export interface SyncEvent {
  /** סוג האירוע */
  type: SyncEventType;
  /** חותמת זמן */
  timestamp: number;
  /** מידע נוסף על האירוע */
  payload?: {
    /** מזהה הפריט המושפע */
    itemId?: string;
    /** סוג הישות */
    entityType?: string;
    /** הודעת שגיאה (אם רלוונטי) */
    error?: string;
    /** מספר פריטים שסונכרנו */
    syncedCount?: number;
    /** מספר פריטים בתור */
    pendingCount?: number;
    /** פרטי התנגשות */
    conflict?: ConflictDetails;
    /** האם מחובר */
    isOnline?: boolean;
  };
}

/**
 * פרטי התנגשות בין גרסאות
 * Conflict details interface
 */
export interface ConflictDetails {
  /** מזהה הפריט */
  itemId: string;
  /** סוג הישות */
  entityType: string;
  /** הגירסה המקומית */
  localVersion: VersionedData;
  /** הגירסה מהשרת */
  remoteVersion: VersionedData;
  /** האסטרטגיה שנבחרה לפתרון */
  resolvedWith?: ConflictResolution;
}

/**
 * נתונים עם גירסה
 * Versioned data interface
 */
export interface VersionedData<T = unknown> {
  /** מזהה ייחודי */
  id: string;
  /** הנתונים עצמם */
  data: T;
  /** מספר גירסה */
  version: number;
  /** חותמת זמן יצירה */
  createdAt: number;
  /** חותמת זמן עדכון אחרון */
  updatedAt: number;
  /** מזהה מכשיר שביצע את העדכון האחרון */
  deviceId?: string;
  /** האם נמחק (soft delete) */
  deleted?: boolean;
  /** חותמת זמן מחיקה */
  deletedAt?: number;
}

/**
 * פריט בתור ההמתנה לסנכרון
 * Pending sync queue item
 */
export interface PendingChange<T = unknown> {
  /** מזהה ייחודי לפריט בתור */
  queueId: string;
  /** סוג הפעולה */
  operation: SyncOperation;
  /** סוג הישות */
  entityType: string;
  /** מזהה הפריט */
  itemId: string;
  /** הנתונים (רלוונטי ליצירה/עדכון) */
  data?: VersionedData<T>;
  /** חותמת זמן הוספה לתור */
  queuedAt: number;
  /** מספר ניסיונות סנכרון */
  retryCount: number;
  /** שגיאה אחרונה */
  lastError?: string;
  /** חותמת זמן ניסיון אחרון */
  lastAttemptAt?: number;
}

/**
 * הגדרות ספק סנכרון ענן
 * Cloud sync provider configuration
 */
export interface CloudProviderConfig {
  /** סוג הספק */
  type: "firebase" | "supabase" | "custom";
  /** האם מופעל */
  enabled: boolean;
  /** פרטי התחברות */
  credentials?: {
    apiKey?: string;
    projectId?: string;
    authDomain?: string;
    databaseURL?: string;
    storageBucket?: string;
  };
  /** URL של API מותאם אישית */
  customApiUrl?: string;
  /** כותרות HTTP נוספות */
  headers?: Record<string, string>;
}

/**
 * הגדרות מערכת הסנכרון
 * Sync engine configuration
 */
export interface SyncConfig {
  /** האם סנכרון אוטומטי מופעל */
  autoSync: boolean;
  /** מרווח סנכרון אוטומטי במילישניות (ברירת מחדל: 30 שניות) */
  autoSyncInterval: number;
  /** אסטרטגיית פתרון התנגשויות */
  conflictResolution: ConflictResolution;
  /** מספר מקסימלי של ניסיונות חוזרים */
  maxRetryAttempts: number;
  /** מרווח בין ניסיונות חוזרים במילישניות */
  retryInterval: number;
  /** האם לסנכרן רק ב-WiFi */
  wifiOnly: boolean;
  /** הגדרות ספק ענן */
  cloudProvider?: CloudProviderConfig;
  /** רשימת סוגי ישויות לסנכרון */
  entityTypes: string[];
  /** קידומת מפתח ב-localStorage */
  storagePrefix: string;
  /** מזהה ייחודי למכשיר */
  deviceId: string;
  /** האם להפעיל מצב Debug */
  debug: boolean;
}

/**
 * סטטוס סנכרון מפורט
 * Detailed sync status
 */
export interface SyncStatusDetails {
  /** סטטוס נוכחי */
  status: SyncStatus;
  /** האם מחובר לאינטרנט */
  isOnline: boolean;
  /** האם הסנכרון מופעל */
  isEnabled: boolean;
  /** חותמת זמן סנכרון אחרון מוצלח */
  lastSyncAt: number | null;
  /** מספר פריטים בתור ההמתנה */
  pendingCount: number;
  /** הודעת שגיאה אחרונה */
  lastError: string | null;
  /** אחוז התקדמות (0-100) */
  progress: number;
  /** סה"כ פריטים לסנכרון בפעולה הנוכחית */
  totalItems: number;
  /** פריטים שכבר סונכרנו בפעולה הנוכחית */
  syncedItems: number;
}

/**
 * ערכי ברירת מחדל להגדרות
 * Default configuration values
 */
export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  autoSync: true,
  autoSyncInterval: 30000, // 30 שניות
  conflictResolution: ConflictResolution.LastWriteWins,
  maxRetryAttempts: 3,
  retryInterval: 5000, // 5 שניות
  wifiOnly: false,
  entityTypes: ["measurements", "settings"],
  storagePrefix: "glucotrack_sync_",
  deviceId: "",
  debug: false,
};

/**
 * מפתחות אחסון מקומי
 * Local storage keys
 */
export const SYNC_STORAGE_KEYS = {
  /** הגדרות סנכרון */
  CONFIG: "glucotrack_sync_config",
  /** תור שינויים בהמתנה */
  PENDING_QUEUE: "glucotrack_sync_pending",
  /** מטא-דאטא של גירסאות */
  VERSION_META: "glucotrack_sync_versions",
  /** חותמת סנכרון אחרון */
  LAST_SYNC: "glucotrack_sync_last",
  /** מזהה מכשיר */
  DEVICE_ID: "glucotrack_device_id",
} as const;

/**
 * תוויות סטטוס בעברית
 * Hebrew status labels
 */
export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  [SyncStatus.Idle]: "מוכן",
  [SyncStatus.Syncing]: "מסנכרן...",
  [SyncStatus.Error]: "שגיאה בסנכרון",
  [SyncStatus.Offline]: "לא מקוון",
  [SyncStatus.Initializing]: "מאתחל...",
};

/**
 * תוויות פעולות בעברית
 * Hebrew operation labels
 */
export const SYNC_OPERATION_LABELS: Record<SyncOperation, string> = {
  [SyncOperation.Create]: "יצירה",
  [SyncOperation.Update]: "עדכון",
  [SyncOperation.Delete]: "מחיקה",
};

/**
 * יוצר מזהה ייחודי למכשיר
 * Generate unique device ID
 */
export function generateDeviceId(): string {
  return `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * יוצר מזהה ייחודי לפריט בתור
 * Generate unique queue item ID
 */
export function generateQueueId(): string {
  return `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
