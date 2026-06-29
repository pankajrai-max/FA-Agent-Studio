# FA Agent Studio

An AI meta-agent that turns a plain-English description into a production-ready
agent blueprint (system prompt, guardrails, tools, workflow, knowledge, memory,
sample chat) — with live testing, direct editing, and export.

Built with Vite + React. Works offline in **demo mode** (no key needed) and goes
fully live when you add an OpenAI API key.

## Run locally (demo mode — no key)
```bash
npm install
npm run dev
```
Open http://localhost:5173 — forge, edit, save, and browse work with zero setup.
(The live Test chat gives canned replies until you add a key — see below.)

## Run locally with live AI (key)
```bash
npm install
npm install express dotenv
cp .env.example .env          # then paste your key into .env
node local-server.js          # Terminal 1 — API proxy on :3001
npm run dev                   # Terminal 2 — app on :5173
```
Get a key at https://platform.openai.com → API Keys, and add ~$5 of credit.

## Deploy to Vercel (live URL)
```bash
git init && git add . && git commit -m "FA Agent Studio"
# create a GitHub repo, then:
git remote add origin https://github.com/USERNAME/fa-agent-studio.git
git push -u origin main
```
Then on vercel.com → Add New → Project → import the repo →
**Environment Variables** → add `OPENAI_API_KEY` = your key → Deploy.
Vercel runs `api/chat.js` as a serverless proxy so the key never reaches the browser.

## Files
- `src/App.jsx` — the whole app (builder, forge, blueprint, edit, test, export)
- `api/chat.js` — Vercel serverless proxy (keeps the key server-side)
- `local-server.js` — same proxy for local dev
- `vercel.json` — deploy config · `.env.example` — key template

Agents are saved in the browser via localStorage and persist across reloads.
