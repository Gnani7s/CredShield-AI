# CredShield AI 🛡️
**One User. One Identity. Zero Credit Abuse.**

AI-powered multi-account credit abuse detection using real device fingerprinting, behavioral biometrics, IP intelligence, and a weighted fraud scoring engine.

---

## 🚀 Deploy in 15 Minutes

### Step 1 — Get Your Free API Keys

#### A) Supabase (Database + Auth) — FREE
1. Go to **https://supabase.com** → Sign up free
2. Click **New Project** → name it `credshield-ai`
3. Wait ~2 minutes for provisioning
4. Go to **Settings → API**
5. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
6. Go to **SQL Editor** → paste the entire contents of `supabase/migrations/001_schema.sql` → **Run**

#### B) JWT Secret — FREE (generate yourself)
Run this in any terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copy the output → `JWT_SECRET`

#### C) IPQualityScore (VPN/Tor/Proxy Detection) — FREE
1. Go to **https://www.ipqualityscore.com/create-account**
2. Sign up free (5,000 lookups/month free)
3. Go to **Dashboard → API Keys**
4. Copy your key → `IPQS_API_KEY`

> **Note:** Even without IPQS, the system still works using ipapi.co (free, no key needed) which handles basic VPN detection from ASN data.

---

### Step 2 — Deploy to Vercel

#### Option A: One-click GitHub deploy (recommended)
1. Push this project to a GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Initial CredShield AI"
   git remote add origin https://github.com/YOUR_USERNAME/credshield-ai.git
   git push -u origin main
   ```
2. Go to **https://vercel.com** → **New Project** → Import your repo
3. Add Environment Variables (Settings → Environment Variables):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `JWT_SECRET` | Your 64-char random hex string |
| `IPQS_API_KEY` | Your IPQualityScore key (optional) |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |

4. Click **Deploy** → Done!

#### Option B: Vercel CLI
```bash
npm i -g vercel
vercel
# Follow prompts, then:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add JWT_SECRET
vercel env add IPQS_API_KEY
vercel --prod
```

---

### Step 3 — Local Development

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/credshield-ai.git
cd credshield-ai
npm install

# Copy env file and fill in your keys
cp .env.example .env.local
# Edit .env.local with your keys

# Run dev server
npm run dev
# Open http://localhost:3000
```

---

## 🔐 Admin Access

Default admin credentials (change after first login!):
- **Email:** `admin@credshield.ai`
- **Password:** `Admin@CredShield2024`

To change the admin password, run this in Supabase SQL Editor:
```sql
-- First generate a new bcrypt hash:
-- node -e "require('bcryptjs').hash('YourNewPassword', 12).then(console.log)"
UPDATE users
SET password_hash = 'YOUR_NEW_BCRYPT_HASH'
WHERE email = 'admin@credshield.ai';
```

---

## 🏗️ Architecture

```
credshield-ai/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── register/route.ts   ← Registration + fraud check
│   │   │   ├── login/route.ts      ← Login + re-fingerprint check
│   │   │   └── logout/route.ts
│   │   └── admin/
│   │       ├── stats/route.ts      ← Live dashboard stats
│   │       ├── users/route.ts      ← Paginated user list
│   │       ├── logs/route.ts       ← Fraud event logs
│   │       └── block/route.ts      ← Block/unblock users
│   ├── page.tsx                    ← Landing page
│   ├── register/page.tsx           ← Registration with live fingerprinting
│   ├── login/page.tsx
│   ├── dashboard/page.tsx          ← User risk profile
│   ├── admin/                      ← Admin dashboard
│   └── blocked/page.tsx            ← Blocked account page
├── lib/
│   ├── fraud-engine.ts             ← Core fraud scoring logic
│   ├── ip-intelligence.ts          ← IP/VPN/Tor lookup
│   ├── auth.ts                     ← JWT + session management
│   └── supabase.ts                 ← DB client
├── hooks/
│   ├── useFingerprint.ts           ← Real device fingerprinting
│   └── useBehavior.ts              ← Keystroke/mouse biometrics
├── middleware.ts                   ← Route protection
├── supabase/migrations/
│   └── 001_schema.sql              ← Complete DB schema
└── types/index.ts
```

---

## 🔬 How Fraud Detection Works

### Scoring Engine (0–100)

| Signal | Weight | Detection Method |
|--------|--------|-----------------|
| Same device fingerprint | +40 | Canvas, audio, WebGL, font hashes combined |
| Same canvas hash | +15 | HTML5 Canvas rendering fingerprint |
| Same audio fingerprint | +10 | Web Audio API oscillator analysis |
| Tor exit node | +30 | IPQualityScore / ASN analysis |
| VPN detected | +15 | IPQualityScore + known VPN ASNs |
| Proxy/anonymizer | +12 | IPQualityScore |
| Hosting/datacenter IP | +6 | ASN keyword matching |
| High threat IP (score≥75) | +25 | IPQualityScore fraud_score |
| Rapid registration (4+ in 24h) | +20 | Supabase query on ip_address + created_at |
| 2–3 accounts same IP | +12 | Same |
| Subnet cluster (5+ in /24) | +8 | CIDR-range query |
| Disposable email | +18 | 1000+ known domains |
| Privacy email (ProtonMail etc) | +8 | Known privacy providers |
| Behavioral match (≥85% similar) | +20 | Keystroke timing vs fraud profiles DB |

### Thresholds
- **Score ≥ 70** OR **Tor detected** → Auto-blocked, credits denied
- **Score 40–69** → Flagged, reduced credits (25), monitored
- **Score 20–39** → Low risk, partial credits (75)
- **Score 0–19** → Clean, full credits (100)

### Device Fingerprint Signals
- **Canvas fingerprint** — GPU renders text+shapes differently per device
- **WebGL renderer** — GPU model extracted via `WEBGL_debug_renderer_info`
- **Audio fingerprint** — OfflineAudioContext oscillator processing variance
- **Font detection** — Canvas-based font metric comparison (16 fonts)
- **FingerprintJS** — Aggregated visitor ID (open source library)
- **Screen resolution, color depth, CPU cores, device memory, timezone**

---

## 📱 Mobile Support

Fully responsive across all screen sizes:
- 320px (small phone) to 1920px (large desktop)
- Touch-friendly UI elements (min 44px tap targets)
- Behavioral tracking works on mobile (touch events)

---

## 🔒 Security

- Passwords hashed with **bcrypt** (rounds=12)
- Sessions via **HTTP-only cookies** (no localStorage)
- JWT signed with **HS256**, 7-day expiry
- All admin API routes protected by middleware
- Supabase **Row Level Security** enabled
- Service role key never exposed to client
- Input validation via **Zod** on all API routes
- IP extracted from Vercel/Cloudflare headers (real IP, not proxy)

---

## 📊 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | JWT + HTTP-only cookies |
| Fingerprinting | FingerprintJS v4 (open source) + custom signals |
| Charts | Recharts |
| Animations | Framer Motion |
| IP Intelligence | ipapi.co (free) + IPQualityScore (free tier) |
| Deployment | Vercel (free tier) |
| Validation | Zod |

---

## 🧪 Testing the System

1. **Register normally** → See your risk score and credits
2. **Register again with same device** → Blocked (device fingerprint match)
3. **Enable VPN and register** → Flagged or blocked
4. **Use a disposable email** → Higher risk score
5. **Admin dashboard** → See all real-time events at `/admin`

---

## 📄 License

MIT — Free for academic and commercial use.

Built for the CredShield AI project. "One User. One Identity. Zero Credit Abuse."
