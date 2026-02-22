# NBA Trade Support

An **Intelligent Decision Support System (IDSS)** for real and fantasy NBA managers to manage their team and target players.

## Monorepo structure

```
nba-trade-support/
├── apps/
│   ├── frontend/     # Next.js (TypeScript) frontend
│   └── backend/      # FastAPI (Python) backend
├── package.json      # Root workspace
├── vercel.json       # Vercel deployment (frontend)
└── README.md
```

## Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.11

## Setup

### Frontend (apps/frontend)

From the repo root:

```bash
npm install
npm run dev
```

Frontend runs at [http://localhost:3000](http://localhost:3000).

### Backend (apps/backend)

```bash
cd apps/backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API runs at [http://localhost:8000](http://localhost:8000). Interactive docs: [http://localhost:8000/docs](http://localhost:8000/docs).

## Scripts (root)

| Script   | Description                |
|----------|----------------------------|
| `npm run dev`   | Start Next.js dev server  |
| `npm run build` | Build frontend for production |
| `npm run start` | Start frontend production server |
| `npm run lint`  | Lint all workspaces       |

## Deploying on Vercel

1. **Frontend**  
   Connect this repo to Vercel. Use **Root Directory** `apps/frontend` so Vercel treats it as a Next.js app, or leave root as-is and rely on the root `vercel.json` (build/output already point to `apps/frontend`).  
   If you use root as the project root, keep the existing `vercel.json`; if you set Root Directory to `apps/frontend`, you can remove the root `vercel.json` and use default Next.js detection.

2. **Backend**  
   The Python API is a standard FastAPI app. Options:
   - Deploy to **Railway**, **Render**, **Fly.io**, or similar, then set your frontend’s API base URL to that host.
   - Use **Vercel serverless functions** by adding Python handlers under `apps/frontend/api/` (or repo root `api/`) that call into shared logic; see [Vercel Python runtimes](https://vercel.com/docs/functions/serverless-functions/runtimes#python).

## License

Private / unlicensed unless you add one.