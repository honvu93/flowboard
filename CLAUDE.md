# FlowBoard — Server-Driven AI Video Creation

Standalone server that drives Google Flow API through a thin Chrome extension bridge.

## Architecture

```
Webapp (Next.js) → Flow Operation Service → Flow Bridge (WS) → Extension → Google Flow
```

- **Server** is the brain: decides models, builds payloads, polls, retries
- **Extension** is a dumb bridge: token capture, reCAPTCHA, API proxy, download
- Protocol: WebSocket (commands) + HTTP callback (results)
- Model: FlowKit verbatim port discipline

## Commands

```bash
npm install && pnpm --dir web install && npx prisma generate
npm run dev          # API server :6400
npm run worker       # Flow operation worker
npm run build        # Build frontend
```

## Deploy

```bash
# Push to main → GitHub Actions auto-deploy to flowboard.autoveoup.com
git push origin main

# Manual deploy on VPS:
cd /opt/projects/flowboard/current && bash deploy/deploy.sh
```

## Port Map

- API: 6400
- Frontend: 6401
- WS: wss://flowboard.autoveoup.com/api/flow/ws

## Database

PostgreSQL `flowboard` on VPS. Schema: FlowProject, FlowCharacter, FlowVideo, FlowScene, FlowRequest, FlowStudioSession, FlowStudioMessage.
