# Lark — AI Should Do Things, Not Just Say Things

<div align="center">

**🏆 Top 15 Finalist — MCP Apps Hackathon by Manufact @ Y Combinator**
**Shortlisted from 87 teams · Sponsored by OpenAI · Anthropic · Cloudflare · Puzzle · WorkOS**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![MCP](https://img.shields.io/badge/mcp--use-1.20-black)](https://mcp-use.com)
[![Twilio](https://img.shields.io/badge/Twilio-Calls-F22F46?logo=twilio&logoColor=white)](https://twilio.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Post-0A66C2?logo=linkedin)](https://www.linkedin.com/feed/update/urn:li:activity:7439702107617742848/)


</div>

---

## The Problem

AI lives in a chat box. You type, it replies, you copy-paste the answer somewhere else. Every real action — calling someone, playing music, watching a video, messaging a friend — requires leaving the conversation and opening a separate app.

**There is no way for AI to actually do things on your behalf, in one place.**

## The Solution

Lark is an **MCP-powered action interface** that turns ChatGPT and Claude into a phone. Instead of just a text box, Lark renders a full iPhone-style home screen directly inside the AI chat — where users can open apps that trigger real-world actions.

- Say `"call Mom"` → a real phone call is placed via Twilio
- Say `"play Bohemian Rhapsody"` → music streams inline
- Say `"message Claude"` → ChatGPT sends a message to Claude and gets a reply
- Say `"call Anirudh, Raj, and Priya and say I'm running late"` → all three calls fire simultaneously

No copy-paste. No tab switching. One interface.

---

## Hackathon Context

| | |
|---|---|
| **Event** | MCP Apps Hackathon by Manufact (formerly mcp-use) |
| **Venue** | Y Combinator HQ, San Francisco |
| **Organiser** | Manufact — YC S25, open-source MCP infrastructure (9K+ GitHub stars, 5M+ downloads) |
| **Placement** | 🏆 Top 15 Finalist — shortlisted from 87 teams |
| **Sponsors** | OpenAI · Anthropic · Cloudflare · Puzzle · WorkOS |
| **Format** | Full-day hack: idea to working MCP App in one day |
| **Built with** | mcp-use SDK · Manufact MCP Cloud · MCP Inspector |
| **LinkedIn** | [View announcement post](https://www.linkedin.com/feed/update/urn:li:activity:7439702107617742848/) |

---

## Architecture

```
+----------------------------------------------+
|          User / ChatGPT / Claude             |
|           (says "call Mom", etc.)            |
+---------------------+------------------------+
                      |  MCP protocol
                      v
+----------------------------------------------+
|            Lark MCP Gateway                  |
|              (index.ts)                      |
|                                              |
|  +------------------------------------------+|
|  |           Built-in Tools                 ||
|  |  make-call  group-call  add-contact      ||
|  |  music-play  music-search                ||
|  |  wake-up-lark  register-mcp              ||
|  |  list-mcps  remove-mcp                   ||
|  +------------------+-----------------------+|
|                     |  proxy                  |
|  +------------------v-----------------------+|
|  |       Dynamic Backend Registry          ||
|  |  youtube MCP  agent-chat MCP            ||
|  |  video-yt MCP  [user-registered MCPs]   ||
|  +------------------------------------------+|
+---------------------+------------------------+
                      |  widget render
                      v
+----------------------------------------------+
|           Lark Phone UI (React)              |
|        Rendered inside the AI chat           |
|                                              |
|  +-------+ +--------+ +-------+ +--------+  |
|  | Phone | |FaceTime| | Music | |YouTube |  |
|  +-------+ +--------+ +-------+ +--------+  |
|  +--------+ +-------+ +-------+             |
|  |  Msgs  | |Camera | | Notes |             |
|  +--------+ +-------+ +-------+             |
+----------------------------------------------+
```

---

## Features

### Phone & Calling
- **`make-call`** — dial any contact by name or phone number. Speaks a TTS message via Twilio (`alice` voice) when they pick up
- **`group-call`** — call multiple people simultaneously. All calls fire in parallel via `Promise.allSettled` — one command, everyone gets the message
- **Contacts store** — add, list, remove contacts by name. Persisted to `contacts.json`. Name resolution is case-insensitive

### Music
- **`music-play`** — searches Audius (full tracks) + Deezer (30s previews) in parallel, streams inline with a real audio player inside the chat
- **`music-search`** — returns ranked results across both platforms
- **Stream proxy** — Audius audio proxied through `/stream/:trackId` to bypass CORS/CSP. Cover art proxied through `/cover?url=...`

### YouTube
- Search and play YouTube videos inline via a proxied YouTube MCP backend

### Messages — LLM to LLM
- The Messages app connects to an `agent-chat` MCP server
- **ChatGPT can send a message to Claude and receive a reply** in a single thread inside Lark
- Cross-model collaboration without leaving the interface

### Dynamic MCP Registry
- **`register-mcp`** — point Lark at any MCP server URL. It connects live, discovers all tools, namespaces them (`servername__toolname`), and makes them available immediately — no restart required
- **`list-mcps`** — see all connected servers and their tools
- **`remove-mcp`** — deregister a server; its tools are blocked instantly
- Registry persisted to `user-servers.json` — reconnects automatically on restart
- `${ENV_VAR}` interpolation in `mcp-servers.json` keeps secrets out of config files

### Wake Word
- **`wake-up-lark`** — renders the full phone UI widget inside the chat. Say *"open Lark"* or *"wake up Lark"* to activate

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **MCP Server** | `mcp-use` SDK 1.20 — MCPServer, MCPClient, widget, object, text |
| **Language** | TypeScript 5.9 |
| **Schema validation** | Zod 4 — includes a JSON Schema to Zod converter |
| **Phone calls** | Twilio REST API (single calls, group calls, TTS) |
| **Music** | Audius API (full streams) + Deezer API (30s previews) |
| **YouTube** | External YouTube MCP server (proxied) |
| **LLM messaging** | External agent-chat MCP server |
| **Frontend** | React 19 + TypeScript + Tailwind CSS 4 + Vite 7 |
| **Deployment** | Manufact MCP Cloud (`mcp-use deploy`) |
| **Backend registry** | `mcp-servers.json` (hardcoded) + `user-servers.json` (runtime) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Twilio account (for calling features)

### Install

```bash
git clone https://github.com/gokulsrinaths/lark.git
cd lark
npm install
```

### Configure

Create a `.env` file:

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
PORT=3000
```

### Run

```bash
# Development
npm run dev

# Production
npm run build && npm start

# Deploy to Manufact MCP Cloud
npm run deploy
```

### Connect to ChatGPT or Claude

Once running, point your MCP client at `http://localhost:3000/mcp`.

In **Claude Desktop**, add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lark": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

Then say **"wake up Lark"** in the chat.

---

## Project Structure

```
lark/
├── index.ts                     <- MCP gateway: all tools, proxying, registry
├── mcp-servers.json             <- Hardcoded backend MCP servers
├── user-servers.json            <- Runtime-registered servers (auto-generated)
├── contacts.json                <- Saved contacts (auto-generated)
├── lark-phone/                  <- React phone UI widget
│   └── src/
│       ├── App.tsx              <- Root: app routing + active panel state
│       └── components/
│           ├── AppRing.tsx      <- iPhone-style home screen icon grid
│           ├── PhonePanel.tsx   <- Dial pad + call interface
│           ├── MusicPanel.tsx   <- Audio player + search
│           ├── VideoPanel.tsx   <- YouTube player
│           ├── ChatPanel.tsx    <- LLM-to-LLM messaging
│           ├── FaceTimePanel.tsx
│           ├── CameraPanel.tsx
│           └── NotesPanel.tsx
└── resources/
    ├── lark.tsx                 <- Widget entry point
    └── make-call.tsx            <- Call widget component
```

---

## How the Gateway Works

Lark's core insight is its **two-phase startup + live registry**:

**Phase 1 — Hardcoded backends**
Reads `mcp-servers.json`, connects to each MCP server, calls `listTools()`, and re-registers every tool on the Lark gateway under a namespaced name (`youtube__search_videos`). When the AI calls that tool, Lark proxies it to the real backend transparently.

**Phase 2 — User-registered servers**
Reads `user-servers.json` and reconnects any servers the user previously registered, restoring all their tools automatically without re-registration.

**Runtime registration**
`register-mcp` repeats this process live for any new server the user adds — no restart, no config changes. This makes Lark a **universal MCP aggregator**: point it at any MCP server in the ecosystem and its tools become available in any AI chat instantly.

---

## License

MIT

---

<div align="center">

*Built in one day at the MCP Apps Hackathon — Y Combinator, San Francisco*

*Top 15 Finalist · Shortlisted from 87 teams*

</div>
