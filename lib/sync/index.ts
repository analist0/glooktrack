/**
 * @fileoverview מערכת סנכרון נתונים - ייצוא ראשי
 * Data Synchronization System - Main Exports
 */

// Types
export {
  SyncStatus,
  SyncEventType,
  SyncOperation,
  ConflictResolution,
  DEFAULT_SYNC_CONFIG,
  SYNC_STORAGE_KEYS,
  SYNC_STATUS_LABELS,
  SYNC_OPERATION_LABELS,
  generateDeviceId,
  generateQueueId,
} from "./sync-types";

export type {
  SyncEvent,
  SyncConfig,
  SyncStatusDetails,
  VersionedData,
  PendingChange,
  ConflictDetails,
  CloudProviderConfig,
} from "./sync-types";

// Engine
export { SyncEngine, getSyncEngine, resetSyncEngine } from "./sync-engine";

// Hooks
export {
  useSyncStatus,
  useSync,
  useSyncEvents,
  useSyncOnChange,
  useNetworkStatus,
  useAutoSave,
} from "./use-sync";
