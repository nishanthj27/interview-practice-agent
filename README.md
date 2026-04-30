# 🎯 Interview Practice Partner — Production Setup

## 📁 Folder Structure

```
interview-practice-partner/
│
├── backend/                        ← Node.js/Express server (deployed on Render)
│   ├── server.js                   ← Entry point, Express app setup
│   ├── package.json
│   ├── .env.example                ← Template — copy to .env and fill in your key
│   ├── .gitignore                  ← .env and node_modules excluded
│   │
│   ├── routes/
│   │   ├── health.js               ← GET /api/health
│   │   └── interview.js            ← POST /api/chat, /score, /feedback, /resume
│   │                                  GET  /api/jobs
│   ├── services/
│   │   ├── geminiService.js        ← All Gemini API calls (key never leaves here)
│   │   └── promptService.js        ← System prompt builder (difficulty, personality)
│   │
│   ├── middleware/
│   │   ├── validate.js             ← Request body validation
│   │   └── errorHandler.js         ← Centralised error + 404 handler
│   │
│   └── data/
│       └── jobs.js                 ← Canonical job definitions
│
└── frontend/                       ← Static HTML/CSS/JS (deployed on GitHub Pages)
    ├── index.html                  ← Landing page (job grid, modals)
    ├── chat.html                   ← Chat interview
    ├── voice.html                  ← Voice interview
    ├── analytics.html              ← Analytics dashboard
    ├── styles.css                  ← Complete stylesheet
    ├── config.js                   ← Public config — NO API keys
    ├── api-client.js               ← HTTP wrapper → backend endpoints
    ├── app.js                      ← Landing page logic
    ├── memory-manager.js           ← Session state (frontend only)
    ├── chat-mode.js                ← Chat interview flow
    └── voice-mode.js               ← Voice interview flow
```

---

## ⚙️ Step 1 — Get Your Free Gemini API Key

1. Visit https://aistudio.google.com/app/apikey
2. Sign in with a Google account (free, no credit card)
3. Click **"Create API Key"** → copy it

---

## 🖥️ Step 2 — Run Locally (Test Before Deploy)

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Open .env and set: GEMINI_API_KEY=your_actual_key_here
npm run dev
# → Running at http://localhost:3001
# → Test: http://localhost:3001/api/health
```

### Frontend
```bash
cd frontend
# Option A — Python (built-in)
python3 -m http.server 5500

# Option B — Node
npx serve . -p 5500

# Open: http://localhost:5500
```

> **Why a server for frontend?** Browsers block certain APIs (Speech Recognition,
> camera) on `file://`. A local server gives you `http://localhost` which works.

---

## 🚀 Step 3 — Deploy for Free

### Backend → Render.com (Free Tier)

1. Push your **backend/** folder to a GitHub repository
2. Go to https://render.com → Sign up free
3. **New → Web Service** → Connect your GitHub repo
4. Set these in the Render dashboard:
   - **Build Command:** `npm install`
   - **Start Command:**  `node server.js`
   - **Environment Variables** (click "Add Environment Variable"):
     ```
     GEMINI_API_KEY   = your_actual_key_here
     NODE_ENV         = production
     FRONTEND_URL     = https://YOUR_USERNAME.github.io
     ```
5. Click **Deploy** — you'll get a URL like `https://interview-api-xxxx.onrender.com`

> **Free tier note:** Render spins down after 15 min of inactivity.
> First request after sleep takes ~30s. This is fine for demos/portfolios.

---

### Frontend → GitHub Pages (Free, Always On)

1. Push your **frontend/** folder to a GitHub repo
   (can be the same repo in a `/frontend` subdirectory, or a separate repo)
2. Go to **Settings → Pages → Source → Deploy from branch → main / root** (or `/frontend`)
3. Your site is live at: `https://YOUR_USERNAME.github.io/REPO_NAME`

**After both are deployed — update `frontend/config.js`:**
```javascript
API_BASE_URL: 'https://interview-api-xxxx.onrender.com',  // ← your Render URL
```
Commit and push. Done.

---

### Alternative: Netlify (Frontend) + Railway (Backend)

**Frontend on Netlify:**
- Drag & drop the `frontend/` folder to https://netlify.com
- Free SSL, instant deploy

**Backend on Railway:**
- https://railway.app → New Project → Deploy from GitHub
- Add environment variables in the Railway dashboard
- Free starter tier: $5 credit/month (generous for demos)

---

## 🔐 How the API Key Is Protected

```
OLD (insecure):
  Browser → config.js (key visible) → Gemini API

NEW (secure):
  Browser → api-client.js → Your Backend (Render/Railway)
                                    ↓
                              .env (GEMINI_API_KEY)
                                    ↓
                             Gemini API
```

The key lives only in your backend's `.env` / Render environment variables.
It is never sent to the browser, never in any JS file, never in Git.

---

## ✅ API Endpoints Reference

| Method | Endpoint        | Body                                      | Returns              |
|--------|----------------|-------------------------------------------|----------------------|
| GET    | /api/health     | —                                         | `{status:"ok"}`      |
| GET    | /api/jobs       | —                                         | `{jobs:[…]}`         |
| POST   | /api/chat       | `{jobId, settings, userInfo, history}`    | `{message}`          |
| POST   | /api/score      | `{question, answer, jobTitle, difficulty}`| `{score:{…}}`        |
| POST   | /api/feedback   | `{sessionData}`                           | `{feedback:{…}}`     |
| POST   | /api/resume     | `{resumeText}`                            | `{summary}`          |

---

## 🛡️ Security Features Built In

| Feature | Implementation |
|---------|---------------|
| API key hidden | `.env` on server, never in frontend |
| Rate limiting | 100 req / 15 min / IP (configurable) |
| Helmet headers | HSTS, XSS protection, content policy |
| CORS whitelist | Only your frontend URL is allowed |
| Input validation | All request bodies validated before use |
| History cap | Max 40 messages passed to Gemini |
| Request timeout | 30s abort signal on all Gemini calls |
| Error sanitisation | Stack traces never sent to client in production |

---

## 💡 Demo Tips for Job Applications

1. **Record a 2-min Loom walkthrough** — attach to your application email
2. **Add to resume:** *"Built AI-powered mock interview system with Node.js backend, Gemini AI scoring engine, voice mode, and analytics dashboard"*
3. **GitHub repo description:** Include the live demo URL
4. **Talking points in interviews:**
   - "The API key never touches the frontend — all AI calls are proxied through an Express backend"
   - "Answers are scored in real-time using a rubric-based evaluation engine"
   - "Built a session analytics system that tracks performance trends across interviews"
