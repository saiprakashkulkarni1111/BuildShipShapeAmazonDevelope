# Alexa+ — MCP Powered Next-Gen AI Assistant & Ambient Dashboard

A flagship implementation of the **Alexa+** next-generation assistant built on the open **Model Context Protocol (MCP 2025-11-25)** standards, featuring **Streamable HTTP transport**, **Agent Skills**, **Multi-Skill Chained Orchestration**, **Warm Neutrals Aesthetics (Off-Whites & Beiges)**, **Unique Acoustic Notification Sounds**, and **Interactive Feature Sample Events**.

---

## 🌟 Standout Features & Enhancements

### 1. 🎨 Warm Neutrals Aesthetics (Off-Whites & Beiges)
- **Nordic Linen / Luxury Sand Design**: Built with warm neutrals inspired by minimalist luxury home displays (Google Nest Hub / Echo Show in sand/linen finish).
- **Harmonious Palette**:
  - Soft Alabaster & Off-White backgrounds (`#f8f6f0`).
  - Warm Oatmeal & Sand surfaces (`#efece2`, `#e5e0d3`).
  - Frosted Cream Glass cards (`rgba(255, 253, 248, 0.94)`).
  - Deep Charcoal Espresso typography (`#23201d`) for readability and contrast.
  - Warm Honey Amber (`#d97706`), Terracotta, and Coastal Sky Blue accents.
- **Ambient Golden Dust Particles**: Floating warm ambient particles with subtle constellation proximity lines.

### 2. 🔔 Unique Acoustic Notification Sound Engine
- **Custom Acoustic Marimba & Glass Chime**: Synthesized via the Web Audio API with zero external audio file dependencies.
- **Physical Acoustic Modeling**:
  - 4-note arpeggiated chord: **E5 (659 Hz) ➔ G#5 (830 Hz) ➔ B5 (987 Hz) ➔ E6 (1318 Hz)** with natural 65ms stagger.
  - Fundamental sine wave blended with soft octave overtones for wooden mallet texture.
  - Warm low-pass biquad filter (`2600 Hz`) to soften digital transients.
  - Expansive stereo spatial panning across the soundstage.
  - Tactile haptic droplet ping (`playHapticClick()`) on every interactive click.
- **Audition Button**: Accessible in the notification dropdown for immediate auditioning.

### 3. 🎯 Interactive Feature Sample Events (Click Any Feature)
Every widget, card, and control responds dynamically with interactive sample events:
- **🌤️ Weather Card**: Clicking triggers a live **Weather Radar & Forecast Event** with hourly metrics, UV index breakdown, and spoken response.
- **🏠 Smart Home Tiles**: Clicking living room/bedroom lights, thermostat, or door locks toggles states, animates wattage draw, plays tactile clicks, and pushes simulated device events.
- **🎵 Music Widget & Vinyl Disc**: Clicking the vinyl disc or track cycles through curated Amazon Music tracks ("Levitating", "Blinding Lights", "Shape of You", "Anti-Hero"), starts spinning disc animations, animates equalizer bars, and emits Now Playing alerts.
- **📰 Flash Briefing Ticker**: Clicking opens a live news digest event with top story readouts.
- **⏰ Ambient Clock**: Clicking plays a grandfather clock bell chime and announces current time and upcoming schedule.
- **🧠 Memory Tags**: Clicking `📍 Location: Seattle` or `💡 Device: Living Room` triggers contextual follow-up turns.
- **🎤 Waveform Bar**: Clicking cycles through voice synthesis modes (`idle` ➔ `listening` ➔ `thinking` ➔ `speaking`) with live frequency modulation.
- **⚡ Protocol Inspector**: Includes an interactive **Test MCP Event** button to simulate live tool streaming and proactive delivery alerts.

### 4. 🌊 Ambient Dashboard Mode (Echo Show 15 Style)
- Full-screen or togglable Echo Show dashboard with live ambient clock, date, real-time weather, interactive smart home controls, music player, and news ticker.

### 5. ⚡ Multi-Skill Orchestration & Routine Pipelines
- Orchestrates chained multi-skill routines:
  - **Good Morning**: `bedroom lights` (turn on) ➔ `alexa_weather` (forecast) ➔ `alexa_calendar` (schedule) ➔ `alexa_news` (flash briefing) ➔ `alexa_traffic` (commute check).
  - **Good Night**: `all lights` (turn off) ➔ `front door` (lock) ➔ `thermostat` (68°F) ➔ `alexa_calendar` (next event) ➔ `alexa_music` (sleep sounds).
- Real-time step progress tracking (`0%` ➔ `100%`) with visual badges (`pending`, `running`, `completed`).

### 6. 📊 Skill Pipeline DAG (Visual Graph)
- Interactive SVG DAG visualizer displaying execution flow:
  `Trigger` ➔ `Smart Home` ➔ `Weather` ➔ `Calendar` ➔ `News` ➔ `Traffic` ➔ `Alexa+ Synthesis`.

### 7. 🔍 MCP Protocol Inspector (DevTools-Style)
- Integrated debugger drawer featuring Network request tables, Split JSON-RPC 2.0 payload viewers, SSE live event logs, and registered skills inspection.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│  Alexa+ Web Client  (http://127.0.0.1:3000)                             │
│  ────────────────────────────────────────                              │
│  • Warm Neutrals Palette (Off-Whites, Beiges, Sand, Linen)             │
│  • Unique Acoustic Marimba Chime & Haptic Audio Synthesizer            │
│  • Interactive Feature Sample Events on Every Card/Widget              │
│  • Echo Show Ambient Dashboard Mode (Weather, Clock, Smart Home, Music)│
│  • Canvas Audio Waveforms (Dynamic States: Idle/Listen/Think/Speak)   │
│  • Multi-Skill Pipeline Orchestrator & SVG DAG Graph Visualizer        │
│  • DevTools-Style MCP Protocol Inspector & JSON Payload Viewer         │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │  HTTP POST (JSON-RPC 2.0)
                                     │  SSE Streaming (text/event-stream)
                                     │  Persistent GET SSE Push Channel
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│  MCP Server  (http://127.0.0.1:3001/mcp)                               │
│  ───────────────────────────────────────                               │
│  • Streamable HTTP Transport (MCP 2025-11-25)                           │
│  • Session Management & UUID Tracking                                  │
│  • Proactive Notification Scheduler (SSE push to active clients)       │
│  • Session Memory Cache (`alexa://memory`)                             │
│  • Routine Automation Engine (`alexa://routines`)                      │
│                                                                        │
│  10 Agent Skills:                                                      │
│    🌤️ Weather     🏠 Smart Home    🛒 Shopping     🎵 Music           │
│    📅 Calendar    📰 News          🤖 AI Assistant 🗺️ Traffic         │
│    ⚡ Routines    🌊 Ambient Data                                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Start the MCP Server
```bash
cd server
npm install
npm start
```
Server runs at `http://127.0.0.1:3001`:
- **MCP Endpoint**: `/mcp` (Streamable HTTP: POST, GET, DELETE)
- **Skills Registry**: `/skills`
- **Routines Definition**: `/routines`
- **Health Check**: `/health`

### 2. Start the Frontend Client
```bash
cd client
npm start
```
Open **[http://127.0.0.1:3000](http://127.0.0.1:3000)** in your browser.
