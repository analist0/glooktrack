/**
 * useAdmin Hook - התחברות למערכת ניהול
 */

"use client";

import { useState, useCallback } from "react";
import type {
  ModuleAccess,
  UserSummary,
  UserDetail,
  AIConversation,
  HealthAlert,
  AIAnalyticsSummary,
  ModuleName,
  AccessType,
  AdminAction,
} from "./types";

const ADMIN_KEY_STORAGE = "glooktrack_admin_key";

function getAdminKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ADMIN_KEY_STORAGE) || "";
}

export function setAdminKey(key: string) {
  localStorage.setItem(ADMIN_KEY_STORAGE, key);
}

async function adminFetch(
  action: string,
  params?: Record<string, string>
): Promise<unknown> {
  const url = new URL("/api/admin", window.location.origin);
  url.searchParams.set("action", action);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    headers: { "x-admin-key": getAdminKey() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "API Error");
  }
  return res.json();
}

async function adminPost(body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": getAdminKey(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "API Error");
  }
  return res.json();
}

// ===== Hooks =====

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAdminKey());
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (key: string) => {
    setAdminKey(key);
    try {
      await adminFetch("modules");
      setIsAuthenticated(true);
      setError(null);
      return true;
    } catch {
      localStorage.removeItem(ADMIN_KEY_STORAGE);
      setIsAuthenticated(false);
      setError("מפתח ניהול שגוי");
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, error, login, logout };
}

export function useModules() {
  const [modules, setModules] = useState<ModuleAccess[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchModules = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await adminFetch("modules")) as ModuleAccess[];
      setModules(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateModule = useCallback(
    async (
      moduleName: ModuleName,
      accessType: AccessType,
      enabled: boolean,
      options?: { startsAt?: string; expiresAt?: string }
    ) => {
      await adminPost({
        action: "set_module_access",
        moduleName,
        accessType,
        enabled,
        ...options,
      });
      await fetchModules();
    },
    [fetchModules]
  );

  const updateUserAccess = useCallback(
    async (
      userId: string,
      moduleName: ModuleName,
      enabled: boolean,
      options?: { startsAt?: string; expiresAt?: string }
    ) => {
      await adminPost({
        action: "set_user_module_access",
        userId,
        moduleName,
        enabled,
        ...options,
      });
    },
    []
  );

  return { modules, loading, fetchModules, updateModule, updateUserAccess };
}

export function useUsers() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await adminFetch("users")) as UserSummary[];
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserDetail = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const data = (await adminFetch("user", { userId })) as UserDetail;
      setSelectedUser(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return { users, selectedUser, loading, fetchUsers, fetchUserDetail, setSelectedUser };
}

export function useConversations() {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchConversations = useCallback(
    async (options?: {
      userId?: string;
      flaggedOnly?: boolean;
      limit?: number;
      offset?: number;
    }) => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (options?.userId) params.userId = options.userId;
        if (options?.flaggedOnly) params.flaggedOnly = "true";
        if (options?.limit) params.limit = String(options.limit);
        if (options?.offset) params.offset = String(options.offset);
        const result = (await adminFetch("conversations", params)) as {
          data: AIConversation[];
          total: number;
        };
        setConversations(result.data);
        setTotal(result.total);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const toggleFlag = useCallback(
    async (conversationId: string, flagged: boolean, reason?: string) => {
      await adminPost({
        action: "flag_conversation",
        conversationId,
        flagged,
        reason,
      });
    },
    []
  );

  return { conversations, total, loading, fetchConversations, toggleFlag };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = useCallback(
    async (options?: { unresolvedOnly?: boolean; severity?: string }) => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (options?.unresolvedOnly !== undefined)
          params.unresolvedOnly = String(options.unresolvedOnly);
        if (options?.severity) params.severity = options.severity;
        const data = (await adminFetch("alerts", params)) as HealthAlert[];
        setAlerts(data);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const resolve = useCallback(async (alertId: string) => {
    await adminPost({ action: "resolve_alert", alertId });
  }, []);

  const generateAlerts = useCallback(async () => {
    const result = (await adminPost({
      action: "generate_alerts",
    })) as { alerts_created: number };
    return result.alerts_created;
  }, []);

  return { alerts, loading, fetchAlerts, resolve, generateAlerts };
}

export function useAIAnalytics() {
  const [analytics, setAnalytics] = useState<AIAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await adminFetch("ai-analytics")) as AIAnalyticsSummary;
      setAnalytics(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return { analytics, loading, fetchAnalytics };
}

export function useAdminLog() {
  const [log, setLog] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLog = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await adminFetch("admin-log")) as AdminAction[];
      setLog(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return { log, loading, fetchLog };
}
