# MCPulse — Take the pulse of your market before you build

> Validate your startup idea by surveying 1000 synthetic AI-generated customer personas. Get a validation score, ICP, top objections, and next steps — in minutes.

## What it does

MCPulse lets founders and product managers validate a startup idea before writing a single line of product code. You describe your idea — the problem it solves, who it's for, how it works, and what you'd charge — then provide your own OpenAI or Anthropic API key. MCPulse uses that key to generate 1000 synthetic customer personas and survey every single one of them with five structured questions about your product.

The entire pipeline runs in parallel using `asyncio.gather`, completing in roughly 2-4 minutes. When it finishes, you get a 0-100 validation score, a written Ideal Customer Profile, the top three objections, the top three most-requested features, and three concrete next steps — all derived from the aggregated survey data. Each analysis costs approximately $0.30-0.40 in API credits (on the user's own key).

Results are stored in Supabase and surfaced in a terminal-style dashboard with live WebSocket progress updates. Every analysis gets a unique public share token so you can send the report to co-founders or investors without requiring them to log in.

## How it works (technical)

The core engine is a 3-stage pipeline in `backend/app/services/icp_engine.py`:

**Stage 1 — Persona generation**
10 parallel API calls × 100 personas each = 1000 personas generated concurrently via `asyncio.gather`. Each persona includes age, location, job title, industry, income level, pain points, current solutions, tech savviness, and a willingness-to-pay range.

**Stage 2 — Survey**
40 parallel API calls × 25 personas each = all 1000 surveyed concurrently. Each persona answers: Would you use this? (Yes/No/Maybe), willingness to pay (€0/€1-10/€10-30/€30-100/€100+), biggest concern, must-have feature, and whether their network has this problem.

**Stage 3 — Analysis**
The backend aggregates yes/no/maybe counts, WTP distribution, and samples of concerns and features, then sends the summary to the AI model to generate the ICP description, validation score, top objections, top features, and next steps.

**Estimated cost per analysis:**
- OpenAI `gpt-4o-mini`: ~$0.40
- Anthropic `claude-haiku-4-5`: ~$0.30

**Estimated time:** 2-4 minutes

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14.2 (App Router, static export) |
| Styling | Tailwind CSS, Framer Motion, JetBrains Mono |
| Charts | Recharts |
| State | Zustand |
| Backend | FastAPI (Python 3.11+) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (JWT HS256) |
| AI | OpenAI `gpt-4o-mini` OR Anthropic `claude-haiku-4-5` (user's own key) |
| Real-time | WebSockets (FastAPI + browser native) |
| Encryption | AES-256 (Fernet) for API key storage |
| Payments | Stripe (subscriptions) |
| PDF export | jsPDF + html2canvas |
| Frontend hosting | GitHub Pages (free) |
| Backend hosting | Hugging Face Spaces Docker (free) |

## Project structure

```
McPulse/
├── frontend/                         # Next.js 14 static export
│   ├── app/
│   │   ├── landing/page.tsx          # Marketing landing page
│   │   ├── auth/                     # Login + signup
│   │   ├── onboarding/page.tsx       # 3-step idea form + API key
│   │   ├── dashboard/page.tsx        # Results terminal UI
│   │   └── report/[id]/page.tsx      # Public shareable report
│   ├── components/
│   │   ├── TypingHeadline.tsx        # Animated hero text
│   │   └── PricingCard.tsx
│   └── lib/
│       ├── supabase.ts               # Supabase client
│       ├── api.ts                    # Backend fetch helpers
│       └── store.ts                  # Zustand state
│
├── backend/                          # FastAPI
│   ├── app/
│   │   ├── main.py                   # FastAPI app + CORS
│   │   ├── config.py                 # Pydantic settings
│   │   ├── database.py               # Supabase service client
│   │   ├── middleware/auth.py        # JWT verification
│   │   ├── models/schemas.py         # Pydantic schemas
│   │   ├── routers/
│   │   │   ├── analyses.py           # CRUD + plan limits
│   │   │   ├── websocket.py          # Real-time progress
│   │   │   └── stripe_payments.py    # Checkout + webhook
│   │   └── services/
│   │       ├── icp_engine.py         # Core AI pipeline
│   │       └── encryption.py         # Fernet AES-256
│   ├── supabase/schema.sql           # Full DB schema + RLS
│   ├── Dockerfile                    # HF Spaces Docker (port 7860)
│   └── requirements.txt
│
├── .github/workflows/deploy.yml      # Auto-deploy to GitHub Pages
└── README.md
```

## Live deployment (zero cost)

| Service | URL |
|---|---|
| Frontend | https://mcpulsesaas.github.io/McpulseSAAS/ |
| Backend API | https://McPulse-mcpulse-backend.hf.space |
| Backend docs | https://McPulse-mcpulse-backend.hf.space/docs |

## Local development setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase project (free tier)
- OpenAI or Anthropic API key (used per-analysis, not stored in your .env)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Fill in .env values (see Environment Variables section)
uvicorn app.main:app --reload --port 8000
```

API available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps
cp .env.local.example .env.local
# Fill in .env.local values
npm run dev
```

App available at `http://localhost:3000`.

## Environment variables

### Backend (`.env`)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase `service_role` key (full DB access, never expose to browser) |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret — found at Settings → API → JWT Settings |
| `ENCRYPTION_KEY` | Fernet key for AES-256 API key encryption. Generate: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_STARTER_PRICE_ID` | Stripe price ID for Starter plan (€29/mo) |
| `STRIPE_GROWTH_PRICE_ID` | Stripe price ID for Growth plan (€99/mo) |
| `FRONTEND_URL` | Frontend origin for CORS (e.g. `https://mcpulsesaas.github.io`) |

### Frontend (`.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_API_URL` | Backend URL (e.g. `https://McPulse-mcpulse-backend.hf.space`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. SQL Editor → paste `backend/supabase/schema.sql` → Run
3. Authentication → Email provider → confirm enabled
4. Get credentials from Settings → API

The schema creates:
- `profiles` table (extends `auth.users`) with `plan`, `stripe_customer_id`, `stripe_subscription_id`, `analyses_count`
- `analyses` table with RLS (users see only their own rows), `ai_provider` column, `share_token` (random 16-byte hex, auto-generated)
- `increment_analyses_count` RPC function
- Trigger `on_auth_user_created` to auto-create a profile row on signup

## Deployment

### Frontend → GitHub Pages (automatic)

Push to `main` → GitHub Actions builds the Next.js static export (`next build` with `output: 'export'`) → deploys to GitHub Pages.

The `basePath` in `next.config.js` is set to `/McpulseSAAS` to match the GitHub Pages repo URL.

Required GitHub repository secrets:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Enable in: Settings → Pages → Source: GitHub Actions

### Backend → Hugging Face Spaces

The `backend/` folder is pushed to a separate HF Space repository. Set all backend env vars as Space secrets (Settings → Variables and secrets). The `Dockerfile` exposes port 7860 (HF Spaces default).

## API reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Health check |
| POST | `/api/analyses/` | Bearer | Create analysis (returns `analysis_id`) |
| GET | `/api/analyses/` | Bearer | List user analyses |
| GET | `/api/analyses/{id}` | Bearer | Get analysis detail |
| DELETE | `/api/analyses/{id}` | Bearer | Delete analysis |
| GET | `/api/analyses/share/{token}` | None | Public shared report |
| WS | `/ws/analysis/{id}` | None | Real-time progress stream |
| POST | `/api/stripe/checkout` | Bearer | Create Stripe checkout session |
| POST | `/api/stripe/webhook` | Stripe-Signature | Stripe webhook handler |
| GET | `/api/stripe/subscription` | Bearer | Get subscription status |

Interactive docs: `{BACKEND_URL}/docs`

## WebSocket protocol

After `POST /api/analyses/` returns an `analysis_id`, connect to `/ws/analysis/{analysis_id}`. The engine starts immediately on connection.

Messages received:

```json
// Progress update (3 stages)
{"type": "progress", "stage": "personas", "step": 1, "total": 3, "message": "[ 1/3 ] Generated 1000 personas ✓"}

// Final result
{"type": "complete", "result": { ...AnalysisResult }}

// Error
{"type": "error", "message": "..."}
```

## AI engine details

**Models:**
- OpenAI: `gpt-4o-mini` with `response_format: {"type": "json_object"}`
- Anthropic: `claude-haiku-4-5` with explicit JSON-only instruction appended to prompt

**Batching strategy for 1000 personas:**
- Generation: `GEN_BATCH_SIZE = 100` → 10 concurrent calls via `asyncio.gather`
- Survey: `SURVEY_BATCH_SIZE = 25` → 40 concurrent calls via `asyncio.gather`

**Scoring thresholds:**
- 0-40: LOW SIGNAL
- 41-70: MODERATE SIGNAL
- 71-100: STRONG SIGNAL

**Realistic survey calibration:** The survey prompt instructs the model to distribute responses realistically — for most ideas, 20-40% Yes, 30-50% Maybe, 20-40% No.

## Pricing plans

| Plan | Price | Analyses/month |
|---|---|---|
| Free | €0 | 1 |
| Starter | €29/mo | 5 |
| Growth | €99/mo | Unlimited |

Plan limits are enforced server-side in `backend/app/routers/analyses.py` via the `check_usage_limit` function, which queries the `analyses` table count against the user's profile `plan`.

## Security

- User API keys (OpenAI/Anthropic) are encrypted with AES-256 (Fernet) before storage in the `encrypted_api_key` column
- Keys are decrypted only inside the WebSocket handler at runtime, server-side only, never logged or returned to the client
- Supabase RLS ensures users can only `SELECT` and `INSERT` their own analyses
- Public share links use random 16-byte hex tokens auto-generated by PostgreSQL (`encode(gen_random_bytes(16), 'hex')`)
- JWT tokens are verified with `HS256` using `SUPABASE_JWT_SECRET`
- CORS is restricted to `FRONTEND_URL` and `https://mcpulsesaas.github.io`

## Testing mode

Auth is currently bypassed for easier development:
- The frontend sends `test-mode` as the Bearer token
- The backend accepts it and returns a fixed mock user (`test-user-00000000-0000-0000-0000-000000000000`)
- Plan limits are bypassed (mock user is treated as `growth` plan)

**To re-enable auth before going to production:**
1. Remove the `if token == "test-mode"` block in `backend/app/middleware/auth.py`
2. Uncomment auth guards in `frontend/app/onboarding/page.tsx` and `frontend/app/dashboard/page.tsx`

## Stripe setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Create two recurring products:
   - **Starter** — €29/month (5 analyses)
   - **Growth** — €99/month (unlimited)
3. Copy the price IDs to `STRIPE_STARTER_PRICE_ID` and `STRIPE_GROWTH_PRICE_ID`
4. Add a webhook endpoint pointing to `{BACKEND_URL}/api/stripe/webhook`
5. Subscribe to events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`
6. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

For local webhook testing, use `ngrok http 8000` to expose your local backend and point the Stripe dashboard webhook at the forwarding URL.

## Roadmap

- [ ] Re-enable Supabase auth for production
- [ ] Per-plan persona count via Supabase config (Free=50, Starter=200, Growth=1000)
- [ ] PDF export of report (jsPDF + html2canvas already installed)
- [ ] Stripe live mode
- [ ] Email report delivery
- [ ] Team sharing / multi-seat

## License

MIT
