/**
 * @fileoverview מנוע סנכרון הנתונים - מנהל סנכרון מקומי וענן
 * Data Synchronization Engine - Manages local and cloud sync
 */

import {
  SyncStatus,
  SyncEventType,
  SyncOperation,
  ConflictResolution,
  type SyncEvent,
  type SyncConfig,
  type SyncStatusDetails,
  type VersionedData,
  type PendingChange,
  type ConflictDetails,
  type CloudProviderConfig,
  DEFAULT_SYNC_CONFIG,
  SYNC_STORAGE_KEYS,
  generateDeviceId,
  generateQueueId,
} from "./sync-types";

/**
 * סוג פונקציית מאזין לאירועים
 * Event listener function type
 */
type SyncEventListener = (event: SyncEvent) => void;

/**
 * ממשק לספק סנכרון ענן
 * Cloud sync provider interface
 */
interface CloudSyncProvider {
  /** התחברות לשירות */
  connect(): Promise<boolean>;
  /** ניתוק מהשירות */
  disconnect(): Promise<void>;
  /** קבלת כל הנתונים מהשרת */
  fetchAll(entityType: string): Promise<VersionedData[]>;
  /** קבלת שינויים מאז חותמת זמן מסוימת */
  fetchChanges(entityType: string, since: number): Promise<VersionedData[]>;
  /** שליחת שינויים לשרת */
  pushChanges(entityType: string, items: VersionedData[]): Promise<boolean>;
  /** מחיקת פריט מהשרת */
  deleteItem(entityType: string, itemId: string): Promise<boolean>;
}

/**
 * מנוע סנכרון נתונים
 * מנהל סנכרון בין אחסון מקומי לשירותי ענן
 *
 * @example
 * ```typescript
 * const syncEngine = new SyncEngine({
 *   autoSync: true,
 *   conflictResolution: ConflictResolution.LastWriteWins
 * });
 *
 * syncEngine.on(SyncEventType.SyncCompleted, (event) => {
 *   console.log('סנכרון הושלם!', event);
 * });
 *
 * await syncEngine.sync();
 * ```
 */
export class SyncEngine {
  private config: SyncConfig;
  private status: SyncStatus = SyncStatus.Idle;
  private isOnline: boolean = true;
  private pendingQueue: PendingChange[] = [];
  private versionMeta: Map<string, Map<string, number>> = new Map();
  private listeners: Map<SyncEventType, Set<SyncEventListener>> = new Map();
  private autoSyncTimer: ReturnType<typeof setInterval> | null = null;
  private cloudProvider: CloudSyncProvider | null = null;
  private lastSyncAt: number | null = null;
  private lastError: string | null = null;
  private syncInProgress: boolean = false;
  private currentProgress: { total: number; synced: number } = { total: 0, synced: 0 };

  /**
   * יוצר מופע חדש של מנוע הסנכרון
   * @param partialConfig הגדרות חלקיות (ימוזגו עם ברירות המחדל)
   */
  constructor(partialConfig: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...partialConfig };

    // אתחול במצב בטוח (לא בדפדפן)
    if (typeof window === "undefined") {
      return;
    }

    this.initializeDeviceId();
    this.loadPersistedState();
    this.setupNetworkListeners();

    if (this.config.autoSync) {
      this.startAutoSync();
    }

    // אתחול ספק ענן אם הוגדר
    if (this.config.cloudProvider?.enabled) {
      this.initializeCloudProvider(this.config.cloudProvider);
    }
  }

  // ============================================
  // אתחול ותצורה / Initialization & Configuration
  // ============================================

  /**
   * מאתחל מזהה מכשיר ייחודי
   * Initialize unique device ID
   */
  private initializeDeviceId(): void {
    let deviceId = localStorage.getItem(SYNC_STORAGE_KEYS.DEVICE_ID);
    if (!deviceId) {
      deviceId = generateDeviceId();
      localStorage.setItem(SYNC_STORAGE_KEYS.DEVICE_ID, deviceId);
    }
    this.config.deviceId = deviceId;
  }

  /**
   * טוען מצב שנשמר מאחסון מקומי
   * Load persisted state from local storage
   */
  private loadPersistedState(): void {
    try {
      // טעינת תור שינויים בהמתנה
      const pendingData = localStorage.getItem(SYNC_STORAGE_KEYS.PENDING_QUEUE);
      if (pendingData) {
        this.pendingQueue = JSON.parse(pendingData);
      }

      // טעינת חותמת סנכרון אחרון
      const lastSync = localStorage.getItem(SYNC_STORAGE_KEYS.LAST_SYNC);
      if (lastSync) {
        this.lastSyncAt = parseInt(lastSync, 10);
      }

      // טעינת מטא-דאטא של גירסאות
      const versionData = localStorage.getItem(SYNC_STORAGE_KEYS.VERSION_META);
      if (versionData) {
        const parsed = JSON.parse(versionData);
        for (const [entityType, versions] of Object.entries(parsed)) {
          this.versionMeta.set(entityType, new Map(Object.entries(versions as Record<string, number>)));
        }
      }
    } catch (error) {
      this.log("Error loading persisted state:", error);
    }
  }

  /**
   * שומר מצב לאחסון מקומי
   * Persist state to local storage
   */
  private persistState(): void {
    if (typeof window === "undefined") return;

    try {
      // שמירת תור שינויים בהמתנה
      localStorage.setItem(SYNC_STORAGE_KEYS.PENDING_QUEUE, JSON.stringify(this.pendingQueue));

      // שמירת חותמת סנכרון אחרון
      if (this.lastSyncAt) {
        localStorage.setItem(SYNC_STORAGE_KEYS.LAST_SYNC, String(this.lastSyncAt));
      }

      // שמירת מטא-דאטא של גירסאות
      const versionObj: Record<string, Record<string, number>> = {};
      for (const [entityType, versions] of this.versionMeta.entries()) {
        versionObj[entityType] = Object.fromEntries(versions);
      }
      localStorage.setItem(SYNC_STORAGE_KEYS.VERSION_META, JSON.stringify(versionObj));
    } catch (error) {
      this.log("Error persisting state:", error);
    }
  }

  /**
   * מגדיר מאזינים למצב רשת
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    if (typeof window === "undefined") return;

    this.isOnline = navigator.onLine;

    window.addEventListener("online", () => {
      this.isOnline = true;
      this.updateStatus(SyncStatus.Idle);
      this.emit(SyncEventType.ConnectionChanged, { isOnline: true });

      // סנכרון אוטומטי כשחוזרים לרשת
      if (this.config.autoSync && this.pendingQueue.length > 0) {
        this.sync();
      }
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      this.updateStatus(SyncStatus.Offline);
      this.emit(SyncEventType.ConnectionChanged, { isOnline: false });
    });
  }

  /**
   * מאתחל ספק סנכרון ענן
   * Initialize cloud sync provider
   */
  private async initializeCloudProvider(providerConfig: CloudProviderConfig): Promise<void> {
    this.updateStatus(SyncStatus.Initializing);

    try {
      // Placeholder לאתחול ספקים שונים
      switch (providerConfig.type) {
        case "firebase":
          this.cloudProvider = this.createFirebaseProvider(providerConfig);
          break;
        case "supabase":
          this.cloudProvider = this.createSupabaseProvider(providerConfig);
          break;
        case "custom":
          this.cloudProvider = this.createCustomProvider(providerConfig);
          break;
      }

      if (this.cloudProvider) {
        const connected = await this.cloudProvider.connect();
        if (connected) {
          this.updateStatus(SyncStatus.Idle);
          this.log("Cloud provider connected successfully");
        } else {
          this.updateStatus(SyncStatus.Error);
          this.lastError = "Failed to connect to cloud provider";
        }
      }
    } catch (error) {
      this.updateStatus(SyncStatus.Error);
      this.lastError = error instanceof Error ? error.message : "Unknown error connecting to cloud";
      this.log("Error initializing cloud provider:", error);
    }
  }

  // ============================================
  // יצירת ספקי ענן / Cloud Provider Factories
  // ============================================

  /**
   * יוצר ספק Firebase (placeholder)
   * Create Firebase provider (placeholder for future implementation)
   */
  private createFirebaseProvider(_config: CloudProviderConfig): CloudSyncProvider {
    // TODO: התקנת firebase והחלפה עם implementation אמיתי
    return {
      async connect() {
        console.log("[Firebase] Connecting...");
        // יש לבצע: firebase.initializeApp(config.credentials)
        return true;
      },
      async disconnect() {
        console.log("[Firebase] Disconnecting...");
      },
      async fetchAll(entityType: string) {
        console.log(`[Firebase] Fetching all ${entityType}...`);
        // יש לבצע: firebase.firestore().collection(entityType).get()
        return [];
      },
      async fetchChanges(entityType: string, since: number) {
        console.log(`[Firebase] Fetching changes for ${entityType} since ${since}...`);
        // יש לבצע: query with updatedAt > since
        return [];
      },
      async pushChanges(entityType: string, items: VersionedData[]) {
        console.log(`[Firebase] Pushing ${items.length} items to ${entityType}...`);
        // יש לבצע: batch write to firestore
        return true;
      },
      async deleteItem(entityType: string, itemId: string) {
        console.log(`[Firebase] Deleting ${itemId} from ${entityType}...`);
        // יש לבצע: firebase.firestore().collection(entityType).doc(itemId).delete()
        return true;
      },
    };
  }

  /**
   * יוצר ספק Supabase (placeholder)
   * Create Supabase provider (placeholder for future implementation)
   */
  private createSupabaseProvider(_config: CloudProviderConfig): CloudSyncProvider {
    // TODO: התקנת @supabase/supabase-js והחלפה עם implementation אמיתי
    return {
      async connect() {
        console.log("[Supabase] Connecting...");
        // יש לבצע: createClient(url, anonKey)
        return true;
      },
      async disconnect() {
        console.log("[Supabase] Disconnecting...");
      },
      async fetchAll(entityType: string) {
        console.log(`[Supabase] Fetching all ${entityType}...`);
        // יש לבצע: supabase.from(entityType).select('*')
        return [];
      },
      async fetchChanges(entityType: string, since: number) {
        console.log(`[Supabase] Fetching changes for ${entityType} since ${since}...`);
        // יש לבצע: supabase.from(entityType).select('*').gt('updated_at', since)
        return [];
      },
      async pushChanges(entityType: string, items: VersionedData[]) {
        console.log(`[Supabase] Upserting ${items.length} items to ${entityType}...`);
        // יש לבצע: supabase.from(entityType).upsert(items)
        return true;
      },
      async deleteItem(entityType: string, itemId: string) {
        console.log(`[Supabase] Deleting ${itemId} from ${entityType}...`);
        // יש לבצע: supabase.from(entityType).delete().eq('id', itemId)
        return true;
      },
    };
  }

  /**
   * יוצר ספק API מותאם אישית
   * Create custom API provider
   */
  private createCustomProvider(config: CloudProviderConfig): CloudSyncProvider {
    const baseUrl = config.customApiUrl || "";
    const headers = {
      "Content-Type": "application/json",
      ...config.headers,
    };

    return {
      async connect() {
        try {
          const response = await fetch(`${baseUrl}/health`, { headers });
          return response.ok;
        } catch {
          return false;
        }
      },
      async disconnect() {
        // No-op for REST API
      },
      async fetchAll(entityType: string) {
        const response = await fetch(`${baseUrl}/${entityType}`, { headers });
        if (!response.ok) throw new Error(`Failed to fetch ${entityType}`);
        return response.json();
      },
      async fetchChanges(entityType: string, since: number) {
        const response = await fetch(`${baseUrl}/${entityType}?since=${since}`, { headers });
        if (!response.ok) throw new Error(`Failed to fetch changes for ${entityType}`);
        return response.json();
      },
      async pushChanges(entityType: string, items: VersionedData[]) {
        const response = await fetch(`${baseUrl}/${entityType}/batch`, {
          method: "POST",
          headers,
          body: JSON.stringify(items),
        });
        return response.ok;
      },
      async deleteItem(entityType: string, itemId: string) {
        const response = await fetch(`${baseUrl}/${entityType}/${itemId}`, {
          method: "DELETE",
          headers,
        });
        return response.ok;
      },
    };
  }

  // ============================================
  // ניהול סנכרון אוטומטי / Auto-sync Management
  // ============================================

  /**
   * מתחיל סנכרון אוטומטי
   * Start automatic sync interval
   */
  public startAutoSync(): void {
    if (this.autoSyncTimer) {
      this.stopAutoSync();
    }

    this.autoSyncTimer = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.sync();
      }
    }, this.config.autoSyncInterval);

    this.log(`Auto-sync started with interval ${this.config.autoSyncInterval}ms`);
  }

  /**
   * עוצר סנכרון אוטומטי
   * Stop automatic sync interval
   */
  public stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
      this.log("Auto-sync stopped");
    }
  }

  // ============================================
  // ניהול גירסאות / Version Management
  // ============================================

  /**
   * עוטף נתונים עם מידע גירסה
   * Wrap data with version information
   */
  public wrapWithVersion<T>(id: string, data: T, entityType: string): VersionedData<T> {
    const now = Date.now();
    const currentVersion = this.getItemVersion(entityType, id);

    return {
      id,
      data,
      version: currentVersion + 1,
      createdAt: currentVersion === 0 ? now : this.getItemCreatedAt(entityType, id) || now,
      updatedAt: now,
      deviceId: this.config.deviceId,
    };
  }

  /**
   * מקבל גירסה נוכחית של פריט
   * Get current version of an item
   */
  private getItemVersion(entityType: string, itemId: string): number {
    return this.versionMeta.get(entityType)?.get(itemId) || 0;
  }

  /**
   * מקבל חותמת יצירה של פריט
   * Get creation timestamp of an item
   */
  private getItemCreatedAt(entityType: string, itemId: string): number | null {
    const key = `${this.config.storagePrefix}${entityType}_${itemId}_createdAt`;
    const value = localStorage.getItem(key);
    return value ? parseInt(value, 10) : null;
  }

  /**
   * מעדכן גירסת פריט
   * Update item version
   */
  private updateItemVersion(entityType: string, itemId: string, version: number): void {
    if (!this.versionMeta.has(entityType)) {
      this.versionMeta.set(entityType, new Map());
    }
    this.versionMeta.get(entityType)!.set(itemId, version);
  }

  // ============================================
  // ניהול תור שינויים / Change Queue Management
  // ============================================

  /**
   * מוסיף שינוי לתור ההמתנה
   * Add a change to the pending queue
   */
  public queueChange<T>(
    operation: SyncOperation,
    entityType: string,
    itemId: string,
    data?: T
  ): void {
    // בדיקה אם כבר קיים שינוי בהמתנה לאותו פריט
    const existingIndex = this.pendingQueue.findIndex(
      (item) => item.entityType === entityType && item.itemId === itemId
    );

    const versionedData = data ? this.wrapWithVersion(itemId, data, entityType) : undefined;

    const change: PendingChange<T> = {
      queueId: generateQueueId(),
      operation,
      entityType,
      itemId,
      data: versionedData as VersionedData<T> | undefined,
      queuedAt: Date.now(),
      retryCount: 0,
    };

    if (existingIndex !== -1) {
      // אם מחיקה - נחליף כל פעולה קודמת
      // אחרת - נעדכן את הפעולה הקיימת
      if (operation === SyncOperation.Delete) {
        this.pendingQueue[existingIndex] = change;
      } else {
        this.pendingQueue[existingIndex] = {
          ...this.pendingQueue[existingIndex],
          operation,
          data: versionedData as VersionedData | undefined,
          queuedAt: Date.now(),
        };
      }
    } else {
      this.pendingQueue.push(change);
    }

    this.persistState();
    this.emit(SyncEventType.ItemQueued, {
      itemId,
      entityType,
      pendingCount: this.pendingQueue.length,
    });

    // נסה לסנכרן אם מחובר
    if (this.isOnline && this.config.autoSync && !this.syncInProgress) {
      this.sync();
    }
  }

  /**
   * מסיר פריט מתור ההמתנה
   * Remove item from pending queue
   */
  private dequeueChange(queueId: string): void {
    this.pendingQueue = this.pendingQueue.filter((item) => item.queueId !== queueId);
    this.persistState();
  }

  /**
   * מחזיר את תור השינויים בהמתנה
   * Get pending changes queue
   */
  public getPendingQueue(): PendingChange[] {
    return [...this.pendingQueue];
  }

  /**
   * מנקה את כל תור ההמתנה
   * Clear all pending changes
   */
  public clearPendingQueue(): void {
    this.pendingQueue = [];
    this.persistState();
  }

  // ============================================
  // סנכרון נתונים / Data Synchronization
  // ============================================

  /**
   * מבצע סנכרון מלא
   * Perform full sync
   */
  public async sync(): Promise<boolean> {
    if (this.syncInProgress) {
      this.log("Sync already in progress, skipping...");
      return false;
    }

    if (!this.isOnline) {
      this.updateStatus(SyncStatus.Offline);
      return false;
    }

    this.syncInProgress = true;
    this.updateStatus(SyncStatus.Syncing);
    this.emit(SyncEventType.SyncStarted);
    this.currentProgress = { total: this.pendingQueue.length, synced: 0 };

    try {
      // סנכרון מקומי
      await this.syncLocal();

      // סנכרון ענן אם מופעל
      if (this.cloudProvider) {
        await this.syncCloud();
      }

      this.lastSyncAt = Date.now();
      this.lastError = null;
      this.updateStatus(SyncStatus.Idle);
      this.persistState();

      this.emit(SyncEventType.SyncCompleted, {
        syncedCount: this.currentProgress.synced,
        pendingCount: this.pendingQueue.length,
      });

      return true;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Unknown sync error";
      this.updateStatus(SyncStatus.Error);
      this.emit(SyncEventType.SyncError, { error: this.lastError });
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * סנכרון מקומי - מעדכן localStorage
   * Local sync - updates localStorage
   */
  private async syncLocal(): Promise<void> {
    for (const entityType of this.config.entityTypes) {
      const key = `${this.config.storagePrefix}${entityType}`;
      const existingData = localStorage.getItem(key);
      const items: VersionedData[] = existingData ? JSON.parse(existingData) : [];

      // מיון לפי פריטים שהשתנו
      const changes = this.pendingQueue.filter(
        (change) => change.entityType === entityType
      );

      for (const change of changes) {
        const existingIndex = items.findIndex((item) => item.id === change.itemId);

        switch (change.operation) {
          case SyncOperation.Create:
          case SyncOperation.Update:
            if (change.data) {
              if (existingIndex !== -1) {
                items[existingIndex] = change.data;
              } else {
                items.push(change.data);
              }
              this.updateItemVersion(entityType, change.itemId, change.data.version);
            }
            break;

          case SyncOperation.Delete:
            if (existingIndex !== -1) {
              items.splice(existingIndex, 1);
            }
            break;
        }

        this.dequeueChange(change.queueId);
        this.currentProgress.synced++;
        this.emit(SyncEventType.ItemSynced, {
          itemId: change.itemId,
          entityType,
          pendingCount: this.pendingQueue.length,
        });
      }

      localStorage.setItem(key, JSON.stringify(items));
    }
  }

  /**
   * סנכרון ענן
   * Cloud sync
   */
  private async syncCloud(): Promise<void> {
    if (!this.cloudProvider) return;

    for (const entityType of this.config.entityTypes) {
      try {
        // קבלת שינויים מהשרת
        const since = this.lastSyncAt || 0;
        const remoteChanges = await this.cloudProvider.fetchChanges(entityType, since);

        // עיבוד שינויים מהשרת
        for (const remoteItem of remoteChanges) {
          const localData = this.getLocalItem(entityType, remoteItem.id);

          if (localData) {
            // בדיקת התנגשות
            if (localData.updatedAt > since && remoteItem.updatedAt > since) {
              // התנגשות!
              await this.resolveConflict(entityType, localData, remoteItem);
            } else if (remoteItem.updatedAt > localData.updatedAt) {
              // הנתון מהשרת חדש יותר
              this.saveLocalItem(entityType, remoteItem);
            }
          } else {
            // פריט חדש מהשרת
            this.saveLocalItem(entityType, remoteItem);
          }
        }

        // שליחת שינויים מקומיים לשרת
        const localItems = this.getLocalItems(entityType);
        const itemsToSync = localItems.filter(
          (item) => item.updatedAt > since && item.deviceId === this.config.deviceId
        );

        if (itemsToSync.length > 0) {
          await this.cloudProvider.pushChanges(entityType, itemsToSync);
        }
      } catch (error) {
        this.log(`Error syncing ${entityType}:`, error);
        throw error;
      }
    }
  }

  // ============================================
  // פתרון התנגשויות / Conflict Resolution
  // ============================================

  /**
   * פותר התנגשות בין גרסאות
   * Resolve conflict between versions
   */
  private async resolveConflict(
    entityType: string,
    localItem: VersionedData,
    remoteItem: VersionedData
  ): Promise<void> {
    const conflict: ConflictDetails = {
      itemId: localItem.id,
      entityType,
      localVersion: localItem,
      remoteVersion: remoteItem,
    };

    this.emit(SyncEventType.ConflictDetected, { conflict });

    let resolvedItem: VersionedData;

    switch (this.config.conflictResolution) {
      case ConflictResolution.LocalWins:
        resolvedItem = localItem;
        break;

      case ConflictResolution.RemoteWins:
        resolvedItem = remoteItem;
        break;

      case ConflictResolution.LastWriteWins:
        resolvedItem = localItem.updatedAt > remoteItem.updatedAt ? localItem : remoteItem;
        break;

      case ConflictResolution.KeepBoth: {
        // שמור את שני הגרסאות עם מזהים שונים
        const newId = `${localItem.id}_conflict_${Date.now()}`;
        const duplicateItem: VersionedData = {
          ...localItem,
          id: newId,
          version: 1,
        };
        this.saveLocalItem(entityType, duplicateItem);
        resolvedItem = remoteItem;
        break;
      }

      case ConflictResolution.Manual:
        // שמור את שתי הגרסאות זמנית ופלוט אירוע לטיפול ידני
        // בינתיים, השתמש ב-LastWriteWins כברירת מחדל
        resolvedItem = localItem.updatedAt > remoteItem.updatedAt ? localItem : remoteItem;
        break;

      default:
        resolvedItem = remoteItem;
    }

    this.saveLocalItem(entityType, resolvedItem);
    conflict.resolvedWith = this.config.conflictResolution;

    this.emit(SyncEventType.ConflictResolved, { conflict });
  }

  // ============================================
  // ניהול אחסון מקומי / Local Storage Management
  // ============================================

  /**
   * מקבל פריט מאחסון מקומי
   * Get item from local storage
   */
  private getLocalItem(entityType: string, itemId: string): VersionedData | null {
    const items = this.getLocalItems(entityType);
    return items.find((item) => item.id === itemId) || null;
  }

  /**
   * מקבל את כל הפריטים מאחסון מקומי
   * Get all items from local storage
   */
  private getLocalItems(entityType: string): VersionedData[] {
    const key = `${this.config.storagePrefix}${entityType}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  /**
   * שומר פריט לאחסון מקומי
   * Save item to local storage
   */
  private saveLocalItem(entityType: string, item: VersionedData): void {
    const items = this.getLocalItems(entityType);
    const existingIndex = items.findIndex((i) => i.id === item.id);

    if (existingIndex !== -1) {
      items[existingIndex] = item;
    } else {
      items.push(item);
    }

    const key = `${this.config.storagePrefix}${entityType}`;
    localStorage.setItem(key, JSON.stringify(items));
    this.updateItemVersion(entityType, item.id, item.version);
  }

  // ============================================
  // מערכת אירועים / Event System
  // ============================================

  /**
   * מוסיף מאזין לאירוע
   * Add event listener
   */
  public on(eventType: SyncEventType, listener: SyncEventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    // מחזיר פונקציית ביטול
    return () => this.off(eventType, listener);
  }

  /**
   * מסיר מאזין מאירוע
   * Remove event listener
   */
  public off(eventType: SyncEventType, listener: SyncEventListener): void {
    this.listeners.get(eventType)?.delete(listener);
  }

  /**
   * פולט אירוע
   * Emit event
   */
  private emit(eventType: SyncEventType, payload?: SyncEvent["payload"]): void {
    const event: SyncEvent = {
      type: eventType,
      timestamp: Date.now(),
      payload,
    };

    this.listeners.get(eventType)?.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        this.log("Error in event listener:", error);
      }
    });
  }

  // ============================================
  // ניהול סטטוס / Status Management
  // ============================================

  /**
   * מעדכן את סטטוס הסנכרון
   * Update sync status
   */
  private updateStatus(status: SyncStatus): void {
    this.status = status;
  }

  /**
   * מחזיר סטטוס סנכרון מפורט
   * Get detailed sync status
   */
  public getStatus(): SyncStatusDetails {
    return {
      status: this.status,
      isOnline: this.isOnline,
      isEnabled: this.config.autoSync,
      lastSyncAt: this.lastSyncAt,
      pendingCount: this.pendingQueue.length,
      lastError: this.lastError,
      progress: this.currentProgress.total > 0
        ? Math.round((this.currentProgress.synced / this.currentProgress.total) * 100)
        : 0,
      totalItems: this.currentProgress.total,
      syncedItems: this.currentProgress.synced,
    };
  }

  // ============================================
  // הגדרות / Configuration
  // ============================================

  /**
   * מעדכן הגדרות
   * Update configuration
   */
  public updateConfig(partialConfig: Partial<SyncConfig>): void {
    const oldAutoSync = this.config.autoSync;
    this.config = { ...this.config, ...partialConfig };

    // עדכון סנכרון אוטומטי אם השתנה
    if (partialConfig.autoSync !== undefined && partialConfig.autoSync !== oldAutoSync) {
      if (partialConfig.autoSync) {
        this.startAutoSync();
      } else {
        this.stopAutoSync();
      }
    }

    // עדכון ספק ענן אם השתנה
    if (partialConfig.cloudProvider) {
      this.initializeCloudProvider(partialConfig.cloudProvider);
    }

    this.persistState();
  }

  /**
   * מחזיר הגדרות נוכחיות
   * Get current configuration
   */
  public getConfig(): SyncConfig {
    return { ...this.config };
  }

  // ============================================
  // ניקוי ושחרור / Cleanup
  // ============================================

  /**
   * משחרר משאבים ומנקה מאזינים
   * Release resources and cleanup listeners
   */
  public destroy(): void {
    this.stopAutoSync();
    this.listeners.clear();

    if (this.cloudProvider) {
      this.cloudProvider.disconnect();
    }

    this.log("SyncEngine destroyed");
  }

  // ============================================
  // עזר / Utilities
  // ============================================

  /**
   * רישום הודעות Debug
   * Log debug messages
   */
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log("[SyncEngine]", ...args);
    }
  }
}

// ============================================
// Singleton instance
// ============================================

let syncEngineInstance: SyncEngine | null = null;

/**
 * מחזיר מופע יחיד של מנוע הסנכרון
 * Get singleton instance of sync engine
 */
export function getSyncEngine(config?: Partial<SyncConfig>): SyncEngine {
  if (!syncEngineInstance) {
    syncEngineInstance = new SyncEngine(config);
  } else if (config) {
    syncEngineInstance.updateConfig(config);
  }
  return syncEngineInstance;
}

/**
 * מאפס את מופע הסינגלטון
 * Reset singleton instance
 */
export function resetSyncEngine(): void {
  if (syncEngineInstance) {
    syncEngineInstance.destroy();
    syncEngineInstance = null;
  }
}
