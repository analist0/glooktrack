/**
 * Admin API - ניהול מערכת
 * All operations use service role (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getModules,
  setModuleAccess,
  setUserModuleAccess,
  getUsers,
  getUserDetail,
  getConversations,
  flagConversation,
  getAlerts,
  resolveAlert,
  getAIAnalytics,
  generateHealthAlerts,
  getAdminLog,
} from "@/lib/admin/admin-service";
import type { ModuleName, AccessType } from "@/lib/admin/types";

// Simple admin key check (in production use proper auth)
function isAdmin(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  const adminKey = process.env.ADMIN_SECRET_KEY;
  if (adminKey && key === adminKey) return true;

  // Also allow if service role key is provided
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return !!(serviceKey && key === serviceKey);
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "modules":
        return NextResponse.json(await getModules());

      case "users":
        return NextResponse.json(await getUsers());

      case "user": {
        const userId = searchParams.get("userId");
        if (!userId)
          return NextResponse.json(
            { error: "userId required" },
            { status: 400 }
          );
        return NextResponse.json(await getUserDetail(userId));
      }

      case "conversations": {
        const userId = searchParams.get("userId") || undefined;
        const flaggedOnly = searchParams.get("flaggedOnly") === "true";
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");
        return NextResponse.json(
          await getConversations({ userId, flaggedOnly, limit, offset })
        );
      }

      case "alerts": {
        const unresolvedOnly = searchParams.get("unresolvedOnly") !== "false";
        const severity = searchParams.get("severity") || undefined;
        return NextResponse.json(
          await getAlerts({ unresolvedOnly, severity })
        );
      }

      case "ai-analytics":
        return NextResponse.json(await getAIAnalytics());

      case "admin-log":
        return NextResponse.json(await getAdminLog());

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("Admin API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "set_module_access": {
        const { moduleName, accessType, enabled, startsAt, expiresAt, adminId } = body;
        const result = await setModuleAccess(
          moduleName as ModuleName,
          accessType as AccessType,
          enabled,
          { startsAt, expiresAt, adminId }
        );
        return NextResponse.json(result);
      }

      case "set_user_module_access": {
        const { userId, moduleName, enabled, startsAt, expiresAt, adminId } = body;
        const result = await setUserModuleAccess(
          userId,
          moduleName as ModuleName,
          enabled,
          { startsAt, expiresAt, adminId }
        );
        return NextResponse.json(result);
      }

      case "flag_conversation": {
        const { conversationId, flagged, reason } = body;
        await flagConversation(conversationId, flagged, reason);
        return NextResponse.json({ success: true });
      }

      case "resolve_alert": {
        const { alertId, adminId } = body;
        await resolveAlert(alertId, adminId);
        return NextResponse.json({ success: true });
      }

      case "generate_alerts": {
        const count = await generateHealthAlerts();
        return NextResponse.json({ alerts_created: count });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("Admin API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
