-- =============================================
-- Admin System Migration - מערכת ניהול מתקדמת
-- =============================================

-- 1. Module Access Control - ניהול גישה למודולים
CREATE TABLE IF NOT EXISTS module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name TEXT NOT NULL,           -- 'ai_assistant', 'ai_analytics', etc.
  access_type TEXT NOT NULL DEFAULT 'disabled', -- 'disabled', 'all_users', 'specific_users'
  enabled BOOLEAN NOT NULL DEFAULT false,
  starts_at TIMESTAMPTZ,               -- NULL = immediate
  expires_at TIMESTAMPTZ,              -- NULL = no expiry
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_name)
);

-- 2. Per-user module access overrides
CREATE TABLE IF NOT EXISTS user_module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_name)
);

-- 3. AI Conversations log - לוג שיחות AI
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT,                        -- 'gemini', 'xai', 'perplexity'
  user_message TEXT NOT NULL,
  ai_response TEXT,
  task_type TEXT DEFAULT 'chat',        -- 'chat', 'analysis', 'research'
  tokens_used INTEGER DEFAULT 0,
  cost_estimate NUMERIC(10,6) DEFAULT 0,
  flagged BOOLEAN DEFAULT false,        -- flagged for admin review
  flag_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Health Alerts - התראות בריאות
CREATE TABLE IF NOT EXISTS health_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,             -- 'critical_high', 'critical_low', 'trend_worsening', 'no_data', 'irregular_pattern'
  severity TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
  title TEXT NOT NULL,
  description TEXT,
  measurement_value NUMERIC,
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Admin Activity Log
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,                 -- 'module_toggle', 'user_access_change', 'alert_resolve', 'view_conversation'
  target_user_id UUID REFERENCES auth.users(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created ON ai_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_flagged ON ai_conversations(flagged) WHERE flagged = true;
CREATE INDEX IF NOT EXISTS idx_health_alerts_user ON health_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_health_alerts_unresolved ON health_alerts(is_resolved, severity) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_user_module_access_user ON user_module_access(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin ON admin_activity_log(admin_id);

-- RLS Policies
ALTER TABLE module_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_module_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Module access: anyone can read (to check access), only service role can write
DROP POLICY IF EXISTS "Anyone can read module access" ON module_access;
CREATE POLICY "Anyone can read module access" ON module_access FOR SELECT USING (true);

-- User module access: users can read their own
DROP POLICY IF EXISTS "Users can read own module access" ON user_module_access;
CREATE POLICY "Users can read own module access" ON user_module_access FOR SELECT USING (auth.uid() = user_id);

-- AI conversations: users can read/insert their own
DROP POLICY IF EXISTS "Users can read own conversations" ON ai_conversations;
CREATE POLICY "Users can read own conversations" ON ai_conversations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own conversations" ON ai_conversations;
CREATE POLICY "Users can insert own conversations" ON ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Health alerts: users can read their own
DROP POLICY IF EXISTS "Users can read own alerts" ON health_alerts;
CREATE POLICY "Users can read own alerts" ON health_alerts FOR SELECT USING (auth.uid() = user_id);

-- Admin activity log: only admins (via service role)
DROP POLICY IF EXISTS "No direct access to admin log" ON admin_activity_log;
CREATE POLICY "No direct access to admin log" ON admin_activity_log FOR SELECT USING (false);

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_module_access_updated_at ON module_access;
CREATE TRIGGER update_module_access_updated_at
  BEFORE UPDATE ON module_access
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
