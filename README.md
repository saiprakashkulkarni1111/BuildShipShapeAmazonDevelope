# Alexa+ MCP Assistant

Alexa+ is a browser-based assistant and ambient dashboard demo built around the
[Model Context Protocol (MCP)](https://modelcontextprotocol.io/) using
Streamable HTTP and Server-Sent Events (SSE).

The project demonstrates how a web client can discover MCP tools, maintain a
session, call skills, stream progress, receive proactive notifications, and
render a rich assistant experience without a frontend framework.

> **Demo scope:** The application uses deterministic, in-memory demo data. It
> does not connect to real Amazon, Alexa, calendar, music, weather, traffic, or
> smart-home services.

## Features

- MCP `2025-11-25` initialization and session management
- Ten discoverable agent skills
- JSON-RPC 2.0 tool calls over HTTP
- SSE responses for tool and routine progress
- Persistent SSE channel for proactive notifications
- Multi-skill routines with progress tracking
- Conversation-memory resource with the latest 50 tool interactions
- Ambient dashboard with weather, news, clock, music, and smart-home widgets
- MCP Inspector for network requests, SSE events, memory, and tool schemas
- Interactive DAG visualization for routine pipelines
- Browser speech recognition when supported
- Web Audio API notification chimes and waveform animation
- Warm Alabaster and Echo Obsidian themes

## Architecture

```text
Browser client: http://127.0.0.1:3000
        |
        | JSON-RPC POST and SSE
        v
MCP server: http://127.0.0.1:3001
        |
        +-- /mcp       MCP transport
        +-- /skills    skill metadata
        +-- /routines  routine definitions
        +-- /health    health information
```

### Client

The client is plain HTML, CSS, and JavaScript:

- [client/index.html](client/index.html) defines the dashboard, chat UI,
  inspector, notifications, and routine modal.
- [client/app.js](client/app.js) manages UI state, MCP requests, intent
  parsing, SSE streams, audio, routines, and interactive widgets.
- [client/style.css](client/style.css) contains themes, layouts, animations,
  responsive rules, and component styling.
- [client/serve.js](client/serve.js) serves the static client on port `3000`.

### Server

The Express server in [server/index.js](server/index.js) implements the MCP
transport and simulated skill executors. Sessions, SSE connections, and
conversation memory are stored in process memory and are cleared when the
server restarts.

## Available skills

| Skill | Purpose |
| --- | --- |
| `alexa_weather` | Current conditions and forecasts |
| `alexa_smart_home` | Simulated lights, locks, thermostat, and device status |
| `alexa_shopping` | Product search, cart, orders, and package tracking |
| `alexa_music` | Simulated playback, queue, and volume controls |
| `alexa_calendar` | Events, reminders, and next-event lookup |
| `alexa_news` | Simulated headlines and flash briefings |
| `alexa_general_ai` | MCP explanations, time/date answers, jokes, and fallback responses |
| `alexa_traffic` | Simulated route times, delays, incidents, and alternate routes |
| `alexa_routine` | Multi-skill routine execution |
| `alexa_ambient` | Aggregated dashboard data |

## Built-in routines

| Routine | Actions |
| --- | --- |
| `good_morning` | Bedroom lights, weather, calendar, news, and commute |
| `good_night` | Lights off, lock door, set thermostat, calendar, and sleep sounds |
| `leaving_home` | Lights off, lower thermostat, lock door, traffic, and weather |
| `arriving_home` | Lights on, set thermostat, unlock door, music, and deliveries |

## Requirements

- Node.js 18 or newer
- npm
- A modern browser such as Chrome or Edge

No API keys are required for the current demo implementation.

## Run locally

Open two terminals from the repository root.

### Terminal 1: MCP server

```bash
cd server
npm install
npm start
```

The server listens on `http://127.0.0.1:3001`.

For automatic restarts during development:

```bash
npm run dev
```

### Terminal 2: web client

```bash
cd client
npm start
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

The client expects the MCP server at
`http://127.0.0.1:3001`. Start the server before using chat, routines, or
ambient data.

## MCP API

### `POST /mcp`

Accepts JSON-RPC 2.0 MCP messages. The client uses:

- `initialize`
- `notifications/initialized`
- `tools/list`
- `tools/call`
- `resources/list`
- `resources/read`
- `prompts/list`
- `ping`

Include `MCP-Session-Id` after initialization when making session-bound calls.
Tool calls can request SSE with:

```http
Accept: text/event-stream
MCP-Protocol-Version: 2025-11-25
```

### `GET /mcp`

Opens a persistent `text/event-stream` connection for proactive notifications.
The server emits keep-alive pings and notification events for the active
session.

### `DELETE /mcp`

Terminates the session, clears its memory, and closes its SSE connections.

### `GET /skills`

Returns the server metadata, ten skill definitions, and available routine
names.

### `GET /routines`

Returns the complete routine definitions, including each step's skill and
arguments.

### `GET /health`

Returns server status, active session count, skill count, transport details,
protocol version, and supported demo features.

## Example JSON-RPC call

After initialization, a weather request looks like this:

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "alexa_weather",
    "arguments": {
      "location": "Seattle",
      "units": "fahrenheit"
    }
  }
}
```

## How chat routing works

The client uses the `parseIntent()` function in
[client/app.js](client/app.js) to map common phrases to skills. For example:

```text
"What's the weather in Seattle?" -> alexa_weather
"Turn on the living room lights" -> alexa_smart_home
"Play some music"                -> alexa_music
"Track my package"               -> alexa_shopping
"Run Good Morning"               -> alexa_routine
```

Unmatched requests are sent to `alexa_general_ai`. This is a keyword-based
demo router, not a production natural-language model.

## Security and secrets

- Do not commit API keys, access tokens, passwords, certificates, or private
  keys.
- Store local secrets in `.env` files or your operating system's secret store.
- `.gitignore` excludes `.env` files, key/certificate extensions, dependency
  folders, and build output.
- The current demo does not require credentials.
- The server binds to `127.0.0.1` and restricts browser origins to localhost
  and loopback addresses.
- Before exposing this application publicly, add authentication, persistent
  storage, request validation, rate limiting, HTTPS, and production CORS
  configuration.

## Troubleshooting

### The client shows “Connection failed”

Confirm that the MCP server is running and that
`http://127.0.0.1:3001/health` returns JSON. Then refresh the client or use
the reconnect button.

### No proactive notifications appear

Allow the browser to keep the page open and confirm that the status bar shows
`SSE Push Live`. Notifications are scheduled after each new MCP session and
are only delivered while the SSE connection is open.

### Audio or microphone features do not work

Browser autoplay policies require an initial user interaction before audio can
play. Speech recognition depends on browser support and microphone permission;
Chrome and Edge provide the best support.

### Port already in use

The default ports are:

- Client: `3000`
- MCP server: `3001`

Stop the process using the port or update the `PORT` constant in
[client/serve.js](client/serve.js) or [server/index.js](server/index.js), and
keep the client endpoint in [client/app.js](client/app.js) consistent.

## Project status

This repository is intended as a local MCP demonstration and UI prototype.
The simulated skill results use hardcoded or randomized values, and no data is
persisted between server restarts. Integrating real services requires replacing
the executor functions in [server/index.js](server/index.js) with authenticated
service clients and adding durable storage and production-grade observability.

## License

No license has been declared for this repository yet.
