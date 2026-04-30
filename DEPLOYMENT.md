# GitHub Deployment Guide

This project uses two free-tier services connected to the same GitHub repository:

- Frontend: Vercel, serving the static files from `dist/`
- Backend: Render, running the Express app from `backend/`

No API keys are stored in the frontend. Gemini keys stay only in Render environment variables.

## 1. Push The Project To GitHub

Create a GitHub repository and upload/push this whole project folder:

```text
interview-practice-partner-v2/
  backend/
  frontend/
  scripts/
  package.json
  vercel.json
  render.yaml
```

Do not upload these folders/files:

```text
backend/node_modules/
dist/
backend/.env
.vercel/
```

The included `.gitignore` already excludes them.

## 2. Deploy Backend On Render From GitHub

1. Open Render Dashboard.
2. Click `New +`.
3. Choose `Web Service`.
4. Connect your GitHub account if needed.
5. Select your project repository.
6. Use these settings:

```text
Name: interview-practice-partner-backend
Language/Runtime: Node
Branch: main
Root Directory: backend
Build Command: npm install
Start Command: npm start
Instance Type: Free
Health Check Path: /api/health
```

Add these environment variables in Render:

```text
GEMINI_API_KEY=your_actual_gemini_api_key
NODE_ENV=production
FRONTEND_URL=https://your-vercel-project.vercel.app
CORS_ORIGINS=https://your-vercel-project.vercel.app,https://*.vercel.app
JSON_BODY_LIMIT=1mb
RATE_LIMIT_MAX=100
```

Then click `Create Web Service`.

After Render finishes deploying, copy your backend URL. It will look like:

```text
https://interview-practice-partner-backend.onrender.com
```

Test it in the browser:

```text
https://your-render-service.onrender.com/api/health
```

You should see JSON with `"status":"ok"`.

## 3. Deploy Frontend On Vercel From GitHub

1. Open Vercel Dashboard.
2. Click `Add New...`.
3. Choose `Project`.
4. Import the same GitHub repository.
5. Use these project settings:

```text
Framework Preset: Other
Root Directory: ./
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Before clicking deploy, add this Vercel environment variable:

```text
API_BASE_URL=https://your-render-service.onrender.com
```

Use the real Render URL from step 2.

Then click `Deploy`.

After Vercel finishes, copy your frontend URL. It will look like:

```text
https://your-vercel-project.vercel.app
```

## 4. Update Render With Final Vercel URL

Go back to Render:

1. Open your backend service.
2. Go to `Environment`.
3. Update these variables with the real Vercel URL:

```text
FRONTEND_URL=https://your-vercel-project.vercel.app
CORS_ORIGINS=https://your-vercel-project.vercel.app,https://*.vercel.app
```

4. Save changes.
5. Render will redeploy automatically.

## 5. Final Test

Open your Vercel URL:

```text
https://your-vercel-project.vercel.app
```

Check these flows:

- Job cards load on the home page.
- Start a chat interview.
- Start a voice interview.
- Visit analytics.

If the home page loads but jobs do not appear, check:

- Vercel `API_BASE_URL` exactly matches the Render backend URL.
- Render backend is awake. Free Render services can sleep after inactivity.
- Render `GEMINI_API_KEY` is set.
- Render `CORS_ORIGINS` includes your Vercel URL.

## 6. Auto Deploys

After setup:

- Every push to GitHub redeploys the frontend on Vercel.
- Every push to GitHub redeploys the backend on Render.

Use Vercel for frontend logs and Render for backend logs.

## Optional: Render Blueprint

This repo includes `render.yaml`, so Render can also create the backend from a Blueprint.

Use this only if you prefer Blueprint setup:

1. Render Dashboard.
2. `New +`.
3. `Blueprint`.
4. Select your GitHub repository.
5. Render reads `render.yaml`.
6. Enter `GEMINI_API_KEY` when prompted.

Manual Web Service setup is simpler for first deployment.
