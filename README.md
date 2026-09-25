# AI LeadEngage
> **"Smarter Leads. Faster Sales."**  
> Real Estate AI Lead Engagement & Follow-up Extraction System

---

## 1. What This Product Is
**AI LeadEngage is NOT a CRM.** It does not manage deals, stages, invoicing, or property bookings.

Instead, it serves as the **AI-powered intelligence bridge**:
```
Excel Leads ──► Upload Leads ──► AI Engagement ──► Multi-Turn Chat (English/Hinglish)
       ──► Intent & Requirement Extraction ──► Follow-up Detection
       ──► Follow-Up List ──► 1-Click Excel Export (.xlsx) ──► Sales/Presales Team Takes Over
```

---

## 2. Quick Start

Both the frontend and backend are pre-configured and ready to run.

### Running Backend (Express + TypeScript + Prisma)
```bash
cd backend
npm install
npm run dev
# Running on http://localhost:5000/api
```

### Running Frontend (React + Vite + Tailwind CSS)
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:5173
```

### Running End-to-End System Tests
```bash
node test-e2e.js
```

---

## 3. Key Architecture & Features

### Core Modules
1. **Overview / Dashboard (`/`):**
   - **Hero Metric:** Follow-Up Leads (prominent card with 1-click navigation).
   - 7 primary funnel metrics: Total Leads, Messages Sent, Responses, Interested, Follow-Up, Not Interested, No Response.
   - Recharts Funnel visualization & Intent breakdown donut chart.
   - Executive AI Insights cards.
   - Live AI System Activity feed.

2. **Follow-Up Leads Hub (`/follow-up-leads`):**
   - Dedicated presales queue displaying Name, Mobile, Project, Configuration, Budget, Reason, Callback/Site Visit tags, and AI summary.
   - **1-Click "Download Follow-up Leads (Excel)"** generating styled `.xlsx` with ExcelJS.

3. **Leads Directory (`/leads`):**
   - Search by name, mobile, email.
   - Filter by Project, Status (`FOLLOW_UP`, `INTERESTED`, `NOT_INTERESTED`, `NO_RESPONSE`, `CONTACTED`, `IMPORTED`), and Interest level.
   - Direct link to inspect full lead timeline.

4. **Upload Leads (`/upload-leads`):**
   - Drag-and-drop `.xlsx` or `.csv` upload.
   - Pre-import validation engine: detects missing fields, duplicate numbers, phone digit validation, empty rows.
   - Validation summary (Total, Valid, Duplicates, Errors) with row preview.
   - Download sample template button.

5. **AI Campaigns (`/campaigns`):**
   - Campaign outreach manager with BullMQ / Redis background worker queue.
   - Lifecycle actions: Start, Pause, Resume.

6. **Test Conversations Simulator (`/test-conversations`):**
   - Interactive WhatsApp chat simulator to test conversations without real customer phone numbers.
   - Real-time **AI Extraction Inspector**: displays Intent, Confidence, Configuration, Budget, Callback flag, Site visit flag, and Presales summary.
   - Preset buttons for Hinglish scenarios (*"2 BHK chahiye around 80 lakh, kal call karna"*).

7. **Lead Detail Inspection (`/leads/:id`):**
   - 3-column split view: Lead profile + Chronological conversation transcript + AI Analysis Inspector.

8. **Projects Knowledge Base (`/projects`):**
   - Isolated project profiles (Godrej Horizon, Prestige Cyber City, Lodha Bellissimo).
   - Approved Q&A Knowledge Base so the AI never hallucinates pricing or amenities.

9. **Notifications (`/notifications`):**
   - Real-time alerts on qualified follow-ups and campaign outreach.

10. **Settings (`/settings`):**
    - Meta WhatsApp Cloud API credentials and Webhook callback configuration.
    - OpenAI model selection (`gpt-4o-mini`, `gpt-4o`).
    - Real estate guardrails and strict rules toggle.

---

## 4. Production Configuration

### Switching from SQLite to PostgreSQL
1. In `backend/.env`, set:
   ```env
   DATABASE_URL="postgresql://username:password@host:5432/ai_leadengage?schema=public"
   ```
2. Copy `backend/prisma/schema.postgresql.prisma` to `schema.prisma` and run:
   ```bash
   npx prisma db push
   npm run db:seed
   ```

### Enabling BullMQ + Redis
1. Set `USE_REDIS_QUEUE=true` and `REDIS_URL="redis://localhost:6379"` in `backend/.env`.

### WhatsApp Cloud API Webhook Setup
1. In Meta Developer Portal:
   - Webhook URL: `https://yourdomain.com/api/webhooks/whatsapp`
   - Verify Token: `leadengage_webhook_verify_token_2026` (or value in `.env`)
2. Inbound messages are processed asynchronously through the AI analysis queue.

