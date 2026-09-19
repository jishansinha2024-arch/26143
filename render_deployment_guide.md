# Varuna Netra — Render Deployment Guide

This guide walks you through deploying **Varuna Netra** (FastAPI Backend + React Frontend + MongoDB) to **[Render](https://render.com)**.

---

## 🏗️ Architecture on Render

```
  ┌───────────────────────────────┐
  │   Render Static Site (FREE)   │
  │   - React 18 + Tailwind SPA   │  ◄── User Browser
  │   - Global CDN + SSL          │
  └──────────────┬────────────────┘
                 │ API calls (HTTPS / SSE)
                 ▼
  ┌───────────────────────────────┐
  │   Render Web Service (Free)   │
  │   - FastAPI + Uvicorn         │
  │   - Background Workers        │
  └──────────────┬────────────────┘
                 │ MONGODB_URL
                 ▼
  ┌───────────────────────────────┐
  │   MongoDB Atlas (Free M0)     │
  │   - 512 MB Cluster            │
  └───────────────────────────────┘
```

---

## 📋 Prerequisites

1. **GitHub Account**: Push this repository to a GitHub repository (public or private).
2. **Render Account**: Sign up free at [render.com](https://render.com).
3. **MongoDB Atlas Account (Free)**: Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas).

---

## 🗄️ Step 1: Set Up Free MongoDB on MongoDB Atlas

Render does not offer a native managed MongoDB service. MongoDB Atlas offers a 100% free shared cluster (M0) that works seamlessly:

1. Log into [MongoDB Atlas](https://cloud.mongodb.com/).
2. Click **Create a Database** → Choose **M0 (Free)**.
3. Select AWS as provider and pick the region closest to your Render service (e.g., `us-east-1` or `frankfurt`).
4. **Security Setup**:
   - **Database User**: Create a username (e.g., `varuna_user`) and a secure password. Save these credentials.
   - **Network Access**: Go to **Network Access** → Click **Add IP Address** → Select **Allow Access from Anywhere (`0.0.0.0/0`)** (required because Render cloud instances have dynamic outbound IPs).
5. **Get Connection String**:
   - Click **Connect** → **Drivers** (Python).
   - Copy the URI:
     ```
     mongodb+srv://varuna_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your database user password.

---

## 🚀 Option A: 1-Click Blueprint Deployment (Recommended)

This repository includes a [`render.yaml`](./render.yaml) file. Render can automatically provision and connect both services at once.

1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Blueprint**.
3. Connect your GitHub account and select your **Varuna Netra** repository.
4. Render will detect `render.yaml` and configure:
   - **Backend**: Python Web Service (`varuna-netra-backend`)
   - **Frontend**: Static Site (`varuna-netra-frontend`)
5. In the configuration screen, you will be prompted for:
   - `MONGO_URL`: Paste your MongoDB Atlas connection string from Step 1.
6. Click **Apply**.
7. Render will build and deploy both services!

---

## 🛠️ Option B: Manual Dashboard Deployment

If you prefer to configure the services manually in the Render dashboard:

### 1. Deploy the Backend Web Service

1. In Render Dashboard, click **New +** → **Web Service**.
2. Select your GitHub repository.
3. Configure the settings:
   - **Name**: `varuna-netra-backend`
   - **Region**: Choose the region closest to your MongoDB Atlas cluster.
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
4. Expand **Advanced** → Add the following **Environment Variables**:

   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `MONGO_URL` | `mongodb+srv://...` | Your MongoDB Atlas connection URI |
   | `DB_NAME` | `varuna_netra` | Database name |
   | `JWT_SECRET` | *(click Generate or random 32+ chars)* | Session encryption key |
   | `APP_ENV` | `production` | Environment mode |
   | `DEMO_MODE` | `true` | Pre-populates sample maritime cases and demo users |
   | `CORS_ORIGIN_REGEX` | `^https://.*\.onrender\.com$` | Permits requests from any Render frontend |
   | `AIS_INGEST_ENABLED` | `false` | Disable background AIS streaming unless configured |

5. Click **Create Web Service**. Wait for the build to complete.
6. Once deployed, copy your backend URL (e.g. `https://varuna-netra-backend.onrender.com`).

---

### 2. Deploy the Frontend Static Site

1. In Render Dashboard, click **New +** → **Static Site**.
2. Select the same GitHub repository.
3. Configure the settings:
   - **Name**: `varuna-netra-frontend`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `yarn && yarn build` (or `npm install && npm run build`)
   - **Publish Directory**: `build`
4. Expand **Advanced** → Add the **Environment Variable**:

   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `REACT_APP_BACKEND_URL` | `https://varuna-netra-backend.onrender.com` | Your backend URL from Step 1 (no trailing slash) |

5. Configure Single Page Application (SPA) Routing:
   - Under **Redirects/Rewrites**, click **Add Rule**:
     - **Type**: `Rewrite`
     - **Source Path**: `/*`
     - **Destination**: `/index.html`
   - *(This ensures deep links like `/cases/case_001` or `/login` work properly without 404 errors)*.
6. Click **Create Static Site**.

---

## 🔑 Default Accounts (Demo Mode)

When deployed with `DEMO_MODE=true`, the following accounts are automatically provisioned on first launch:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Supervisor** | `supervisor@sentinelmar.demo` | `Supervisor#2026` |
| **Analyst** | `analyst@sentinelmar.demo` | `Analyst#2026` |
| **Admin** | `shawpriyanshu950@gmail.com` | `Admin#2026` |

*Alternatively, click **"Explore as Guest"** on the login page for instant read-only access.*

---

## ⚡ Important Render Free Tier Tips

1. **Spin-down after Inactivity**: Render's free web services sleep after 15 minutes of inactivity. The first request after sleep may take ~30–50 seconds to boot up. The frontend Static Site is on Render's global CDN and never sleeps.
2. **MongoDB IP Allowlist**: If the backend cannot connect to MongoDB, verify that MongoDB Atlas Network Access has `0.0.0.0/0` enabled.
3. **Environment Updates**: When modifying `REACT_APP_BACKEND_URL` on the frontend, trigger a **Manual Deploy** → **Clear build cache & deploy** so React bakes the updated API URL into the bundle.
