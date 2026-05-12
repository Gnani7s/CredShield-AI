-- CredShield AI — Complete Schema
-- Paste this entire file into Supabase SQL Editor and click Run

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user','admin')),
  risk_score INTEGER DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  risk_level VARCHAR(20) DEFAULT 'safe',
  blocked BOOLEAN DEFAULT FALSE,
  fraud_reasons TEXT[] DEFAULT '{}',
  ip_address VARCHAR(45),
  country VARCHAR(100),
  vpn_detected BOOLEAN DEFAULT FALSE,
  tor_detected BOOLEAN DEFAULT FALSE,
  fingerprint_hash VARCHAR(64),
  linked_accounts INTEGER DEFAULT 0,
  credits_allocated INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device Fingerprints
CREATE TABLE IF NOT EXISTS device_fingerprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  fingerprint_hash VARCHAR(64) NOT NULL,
  canvas_hash VARCHAR(64),
  audio_hash VARCHAR(64),
  fonts_hash VARCHAR(64),
  browser_name VARCHAR(50),
  browser_version VARCHAR(20),
  os_name VARCHAR(50),
  os_version VARCHAR(20),
  screen_resolution VARCHAR(20),
  color_depth INTEGER,
  cpu_cores INTEGER,
  device_memory FLOAT,
  touch_support BOOLEAN DEFAULT FALSE,
  webgl_renderer TEXT,
  webgl_vendor VARCHAR(100),
  timezone VARCHAR(50),
  language VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fraud Logs
CREATE TABLE IF NOT EXISTS fraud_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  fraud_score INTEGER NOT NULL,
  risk_level VARCHAR(20),
  reasons TEXT[] DEFAULT '{}',
  blocked BOOLEAN DEFAULT FALSE,
  action VARCHAR(20) DEFAULT 'allowed' CHECK (action IN ('allowed','flagged','blocked')),
  ip_address VARCHAR(45),
  country VARCHAR(100),
  device_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Behavior Profiles
CREATE TABLE IF NOT EXISTS behavior_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  typing_speed_avg FLOAT DEFAULT 0,
  keystroke_dwell_avg FLOAT DEFAULT 0,
  keystroke_flight_avg FLOAT DEFAULT 0,
  scroll_depth FLOAT DEFAULT 0,
  session_duration INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  is_fraud BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- IP Logs
CREATE TABLE IF NOT EXISTS ip_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address VARCHAR(45) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  country VARCHAR(100),
  org VARCHAR(200),
  is_vpn BOOLEAN DEFAULT FALSE,
  is_tor BOOLEAN DEFAULT FALSE,
  is_proxy BOOLEAN DEFAULT FALSE,
  is_hosting BOOLEAN DEFAULT FALSE,
  threat_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_ip ON users(ip_address);
CREATE INDEX IF NOT EXISTS idx_users_fp ON users(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_users_blocked ON users(blocked);
CREATE INDEX IF NOT EXISTS idx_users_risk ON users(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_df_hash ON device_fingerprints(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_df_canvas ON device_fingerprints(canvas_hash);
CREATE INDEX IF NOT EXISTS idx_df_audio ON device_fingerprints(audio_hash);
CREATE INDEX IF NOT EXISTS idx_df_webgl ON device_fingerprints(webgl_renderer, webgl_vendor);
CREATE INDEX IF NOT EXISTS idx_fl_user ON fraud_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_fl_action ON fraud_logs(action);
CREATE INDEX IF NOT EXISTS idx_fl_created ON fraud_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_addr ON ip_logs(ip_address);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_df_updated_at BEFORE UPDATE ON device_fingerprints FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_bp_updated_at BEFORE UPDATE ON behavior_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Disable RLS for service role access (our API uses service role key which bypasses RLS)
-- Users cannot access this table directly from the browser
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_logs ENABLE ROW LEVEL SECURITY;

-- Admin user — default password is literally: password
-- Change it immediately after first login via Supabase SQL Editor
-- To generate a new hash: https://bcrypt-generator.com (rounds=12)
INSERT INTO users (email, password_hash, role, risk_score, risk_level, blocked)
VALUES (
  'admin@credshield.ai',
  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin', 0, 'safe', false
) ON CONFLICT (email) DO NOTHING;
