/**
 * Alexa+ MCP Client — Warm Neutrals Edition
 * Implements Model Context Protocol (MCP 2025-11-25) Streamable HTTP Transport
 *
 * STANDOUT FEATURES:
 * 1. 🌊 Ambient Dashboard Mode (Echo Show Nordic Linen Edition)
 * 2. ⚡ Multi-Skill Orchestration (Chained execution with live SSE progress)
 * 3. 🔔 Proactive Server Notifications (Unique acoustic marimba chime push alerts)
 * 4. 🎤 Canvas Audio Waveform (Multi-layer sine wave audio visualizer)
 * 5. 🔍 MCP Protocol Inspector (Chrome DevTools-style debugger)
 * 6. 🧠 Conversational Memory (Multi-turn context across skill calls)
 * 7. 📊 Skill Pipeline DAG (Interactive visual graph of chained skills)
 * 8. 🎆 Particle Effects & Micro-animations (Warm golden ambient dust particles)
 * 9. 🎯 Interactive Feature Sample Events (Click any feature to trigger live events)
 */

'use strict';

// ─── CONFIGURATION ─────────────────────────────────────────────────────────────
const MCP_SERVER = 'http://127.0.0.1:3001';
const MCP_ENDPOINT = `${MCP_SERVER}/mcp`;
const MCP_PROTOCOL_VERSION = '2025-11-25';

// ─── STATE ─────────────────────────────────────────────────────────────────────
const state = {
  sessionId: null,
  connected: false,
  tools: [],
  routines: {},
  requestIdCounter: 1,
  sseActive: false,
  theme: 'warm-neutral',
  sidebarOpen: true,
  ambientMode: false,
  inspectorOpen: false,
  currentInspTab: 'network',
  networkLogs: [],
  sseEvents: [],
  notifications: [],
  isProcessing: false,
  conversationHistory: [],
  recentQueries: [],
  waveState: 'idle', // 'idle' | 'listening' | 'thinking' | 'speaking'
  userTypingTimeout: null,

  // Conversational Memory Context
  memoryContext: {
    lastLocation: 'Seattle',
    lastDevice: 'Living Room Lights',
    lastDeviceState: 'on',
    lastMusicQuery: 'Levitating',
    turns: 0,
  },

  // Smart Home Local States
  smartHome: {
    livingLights: true,
    bedroomLights: false,
    thermostatTemp: 72,
    doorLocked: true,
  },

  // Ambient Music Curated Tracks Playlist
  musicPlaylist: [
    { title: 'Levitating', artist: 'Dua Lipa', album: 'Future Nostalgia', genre: 'Pop/Dance' },
    { title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', genre: 'Synthwave' },
    { title: 'Shape of You', artist: 'Ed Sheeran', album: '÷ (Divide)', genre: 'Acoustic Pop' },
    { title: 'Anti-Hero', artist: 'Taylor Swift', album: 'Midnights', genre: 'Dream Pop' },
    { title: 'Flowers', artist: 'Miley Cyrus', album: 'Endless Summer Vacation', genre: 'Disco Funk' },
  ],
  currentTrackIndex: 0,
  music: {
    isPlaying: true,
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
  },
};

// ─── DOM SELECTORS ─────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ─── UNIQUE NOTIFICATION SOUND ENGINE (Web Audio API) ─────────────────────────
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Unique Acoustic Marimba & Glass Chime
 * Distinctive 4-note arpeggiated acoustic chime (E5, G#5, B5, E6)
 * with natural wooden resonance, stereo spatial panning, and warm lowpass filter.
 */
function playUniqueNotificationSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // 4 harmonic notes arpeggiated: E5, G#5, B5, E6
    const notes = [
      { freq: 659.25, time: 0.00, pan: -0.3 },
      { freq: 830.61, time: 0.065, pan: -0.1 },
      { freq: 987.77, time: 0.13, pan: 0.1 },
      { freq: 1318.51, time: 0.20, pan: 0.35 },
    ];

    notes.forEach(note => {
      const noteStart = now + note.time;

      // Primary sine wave for sweet wooden fundamental
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, noteStart);

      // Subtle overtone (triangle at octave) for warm acoustic mallet texture
      const overtone = ctx.createOscillator();
      overtone.type = 'triangle';
      overtone.frequency.setValueAtTime(note.freq * 2, noteStart);

      // Warm low-pass filter to soften digital transients
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, noteStart);

      // Envelope gain
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.18, noteStart + 0.006); // fast attack
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.55); // long warm ring

      // Stereo panner for immersive luxury feel
      let panner = null;
      if (ctx.createStereoPanner) {
        panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(note.pan, noteStart);
      }

      // Wiring nodes
      osc.connect(gain);
      overtone.connect(gain);
      gain.connect(filter);

      if (panner) {
        filter.connect(panner);
        panner.connect(ctx.destination);
      } else {
        filter.connect(ctx.destination);
      }

      osc.start(noteStart);
      osc.stop(noteStart + 0.6);
      overtone.start(noteStart);
      overtone.stop(noteStart + 0.35);
    });
  } catch (err) {
    console.warn('Audio synthesis warning:', err);
  }
}

/**
 * Tactile Haptic Wooden Ping for Feature Clicks
 */
function playHapticClick() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.03);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  } catch (e) {}
}

/**
 * Ascending Triumph Triad Chime for Successful Operations
 */
function playSuccessChord() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    chords.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0.12, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.45);
    });
  } catch (e) {}
}

function playChime(type = 'default') {
  if (type === 'notification') {
    playUniqueNotificationSound();
  } else if (type === 'success') {
    playSuccessChord();
  } else {
    playHapticClick();
  }
}

// ─── BACKGROUND PARTICLES CANVAS (Golden Dust in Warm Neutrals) ───────────────
function initBackgroundParticles() {
  const canvas = $('bgParticleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particles = Array.from({ length: 42 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    radius: Math.random() * 2.2 + 1,
    alpha: Math.random() * 0.45 + 0.2,
  }));

  function render() {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      const isDark = state.theme === 'echo-obsidian';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = isDark ? `rgba(0, 210, 255, ${p.alpha})` : `rgba(217, 119, 6, ${p.alpha * 0.8})`;
      ctx.shadowBlur = isDark ? 8 : 4;
      ctx.shadowColor = isDark ? '#00d2ff' : '#d97706';
      ctx.fill();

      // Proximity constellation lines
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = isDark
            ? `rgba(0, 210, 255, ${(1 - dist / 110) * 0.12})`
            : `rgba(185, 170, 148, ${(1 - dist / 110) * 0.15})`;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(render);
  }
  render();
}

// ─── CANVAS AUDIO WAVEFORM (Feature 4) ────────────────────────────────────────
function initAudioWaveforms() {
  const mainCanvas = $('audioWaveformCanvas');
  const headerCanvas = $('headerWaveformCanvas');
  if (!mainCanvas || !headerCanvas) return;

  const mainCtx = mainCanvas.getContext('2d');
  const headerCtx = headerCanvas.getContext('2d');

  function resize() {
    mainCanvas.width = mainCanvas.offsetWidth;
    mainCanvas.height = 48;
    headerCanvas.width = 240;
    headerCanvas.height = 36;
  }
  resize();
  window.addEventListener('resize', resize);

  let step = 0;

  function drawWave(ctx, width, height, stateName) {
    ctx.clearRect(0, 0, width, height);
    const centerY = height / 2;
    let amplitude = 5;
    let frequency = 0.022;
    let speed = 0.04;
    let color1 = 'rgba(217, 119, 6, 0.85)'; // Warm Amber
    let color2 = 'rgba(2, 132, 199, 0.65)'; // Coastal Sky Blue

    if (stateName === 'listening') {
      amplitude = 18;
      frequency = 0.042;
      speed = 0.09;
      color1 = 'rgba(217, 119, 6, 1)';
      color2 = 'rgba(194, 109, 24, 0.85)';
    } else if (stateName === 'thinking') {
      amplitude = 14;
      frequency = 0.075;
      speed = 0.12;
      color1 = 'rgba(124, 58, 237, 0.9)';
      color2 = 'rgba(217, 119, 6, 0.8)';
    } else if (stateName === 'speaking') {
      amplitude = 16;
      frequency = 0.035;
      speed = 0.06;
      color1 = 'rgba(5, 150, 105, 0.9)';
      color2 = 'rgba(217, 119, 6, 0.75)';
    }

    // Layer 1: Primary Warm Amber Sine Wave
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = color1;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#d97706';

    for (let x = 0; x < width; x++) {
      const y = centerY + Math.sin(x * frequency + step * speed) * amplitude * Math.sin((x / width) * Math.PI);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Layer 2: Harmonic Secondary Wave
    ctx.beginPath();
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = color2;
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#0284c7';

    for (let x = 0; x < width; x++) {
      const y = centerY + Math.sin(x * (frequency * 1.5) - step * speed * 1.2) * (amplitude * 0.75) * Math.sin((x / width) * Math.PI);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function loop() {
    step++;
    drawWave(mainCtx, mainCanvas.width, mainCanvas.height, state.waveState);
    drawWave(headerCtx, headerCanvas.width, headerCanvas.height, state.waveState);
    requestAnimationFrame(loop);
  }
  loop();
}

function setWaveState(newState) {
  state.waveState = newState;
  const tag = $('waveStateTag');
  const ind = $('waveformIndicator');
  if (tag) tag.textContent = newState.toUpperCase();
  if (ind) {
    const map = {
      idle: '● Idle',
      listening: '🎤 Listening...',
      thinking: '⚡ Chaining MCP Skills...',
      speaking: '🔊 Alexa+ Speaking',
    };
    ind.textContent = map[newState] || '● Active';
  }
}

// ─── MCP CLIENT ENGINE (Streamable HTTP + SSE) ────────────────────────────────
function nextId() { return state.requestIdCounter++; }

function setStatus(status, text, detail = '') {
  const dot = $('statusDot');
  if (dot) dot.className = 'status-dot ' + status;
  if ($('statusText')) $('statusText').textContent = text;
  if ($('statusDetails')) $('statusDetails').textContent = detail;
}

// Core HTTP POST for MCP
async function mcpPost(body, wantSSE = false) {
  const startTime = performance.now();
  const reqId = body.id || nextId();

  const headers = {
    'Content-Type': 'application/json',
    'Accept': wantSSE ? 'text/event-stream, application/json' : 'application/json, text/event-stream',
    'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
  };
  if (state.sessionId) headers['MCP-Session-Id'] = state.sessionId;

  // Log in Inspector
  const logItem = {
    id: reqId,
    method: body.method,
    type: wantSSE ? 'SSE' : 'POST',
    time: new Date().toLocaleTimeString(),
    requestHeaders: headers,
    requestBody: body,
    status: 'pending',
    latency: '—',
    responseBody: null,
  };
  state.networkLogs.unshift(logItem);
  renderNetworkInspector();

  try {
    const resp = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const elapsed = Math.round(performance.now() - startTime);
    logItem.latency = `${elapsed}ms`;
    logItem.status = resp.status;

    // Check for updated session header
    const newSession = resp.headers.get('MCP-Session-Id');
    if (newSession && newSession !== state.sessionId) {
      state.sessionId = newSession;
      if ($('protoSession')) $('protoSession').textContent = newSession.slice(0, 16) + '...';
      if ($('protoSessionText')) $('protoSessionText').textContent = newSession.slice(0, 12) + '...';
    }

    const contentType = resp.headers.get('Content-Type') || '';

    if (contentType.includes('text/event-stream')) {
      logItem.responseBody = '[Streamable HTTP SSE Response]';
      renderNetworkInspector();
      return parseSSEStream(resp.body);
    }

    if (resp.status === 202) {
      logItem.responseBody = { status: 'Accepted' };
      renderNetworkInspector();
      return { accepted: true };
    }

    const data = await resp.json();
    logItem.responseBody = data;
    renderNetworkInspector();
    return data;
  } catch (err) {
    const elapsed = Math.round(performance.now() - startTime);
    logItem.latency = `${elapsed}ms`;
    logItem.status = 'ERR';
    logItem.responseBody = { error: err.message };
    renderNetworkInspector();
    throw err;
  }
}

// SSE Stream Parser for Streamable HTTP
async function parseSSEStream(readableStream, onEventCallback) {
  const reader = readableStream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const events = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let eventType = 'message';
      let eventData = '';
      let eventId = null;

      for (const line of lines) {
        if (line.startsWith('event: ')) eventType = line.slice(7).trim();
        else if (line.startsWith('data: ')) eventData = line.slice(6);
        else if (line.startsWith('id: ')) eventId = line.slice(4).trim();
        else if (line === '') {
          if (eventData) {
            try {
              const parsed = JSON.parse(eventData);
              const eventObj = { type: eventType, data: parsed, id: eventId, time: new Date().toLocaleTimeString() };
              events.push(eventObj);
              state.sseEvents.unshift(eventObj);
              renderSSEInspector();
              if (onEventCallback) onEventCallback(eventObj);
            } catch (e) {
              // Non-JSON or prime event
            }
          }
          eventType = 'message';
          eventData = '';
        }
      }
    }
  } catch (err) {
    console.error('SSE Stream Reader error:', err);
  }

  return { events };
}

// Persistent GET SSE Stream for Proactive Server Notifications
function openPersistentSSE() {
  const headers = {
    'Accept': 'text/event-stream',
    'MCP-Protocol-Version': MCP_PROTOCOL_VERSION,
  };
  if (state.sessionId) headers['MCP-Session-Id'] = state.sessionId;

  fetch(MCP_ENDPOINT, { method: 'GET', headers })
    .then(resp => {
      if (!resp.ok || !resp.body) {
        console.warn('GET SSE stream not ready.');
        return;
      }

      state.sseActive = true;
      if ($('protoSSE')) $('protoSSE').textContent = 'Active (Push Ready)';
      if ($('protoSSEText')) $('protoSSEText').textContent = 'SSE Push Live';
      if ($('protoSSEBadge')) $('protoSSEBadge').classList.add('active');

      parseSSEStream(resp.body, event => {
        if (event.type === 'notification' || event.data?.method === 'notifications/proactive') {
          handleProactiveNotification(event.data?.params || event.data);
        }
      });
    })
    .catch(err => {
      console.warn('Persistent SSE error:', err);
    });
}

// ─── STANDOUT FEATURE 3: PROACTIVE NOTIFICATIONS ──────────────────────────────
function handleProactiveNotification(notifData) {
  if (!notifData) return;
  state.notifications.unshift(notifData);

  // Play the unique acoustic marimba chime
  playUniqueNotificationSound();

  // Update Notification Badge
  const badge = $('notifBadge');
  if (badge) {
    badge.style.display = 'block';
    badge.textContent = state.notifications.length;
  }

  // Render to Toaster Stack (Top Right)
  renderNotificationToast(notifData);

  // Render to Dropdown
  renderNotificationList();
}

function renderNotificationToast(data) {
  const toaster = $('notificationToaster');
  if (!toaster) return;

  const toast = document.createElement('div');
  toast.className = 'toast-item';
  const iconClass = data.type || 'info';

  let actionHtml = '';
  if (data.actionable) {
    if (data.type === 'delivery') {
      actionHtml = `<button class="notif-action-btn" onclick="event.stopPropagation(); triggerPackageTrackerSampleEvent();">Track Package</button>`;
    } else if (data.type === 'reminder') {
      actionHtml = `<button class="notif-action-btn" onclick="event.stopPropagation(); triggerCalendarSampleEvent();">View Event</button>`;
    } else if (data.type === 'smart_home') {
      actionHtml = `<button class="notif-action-btn" onclick="event.stopPropagation(); lockDoorNow();">Lock Front Door</button>`;
    } else if (data.type === 'deal') {
      actionHtml = `<button class="notif-action-btn" onclick="event.stopPropagation(); sendSuggestion('Show Echo Show 15 deal');">View Deal</button>`;
    }
  }

  toast.onclick = () => {
    playHapticClick();
    if (data.type === 'delivery') triggerPackageTrackerSampleEvent();
    else if (data.type === 'reminder') triggerCalendarSampleEvent();
    else if (data.type === 'smart_home') toggleDoorLock();
    else triggerWeatherSampleEvent();
  };

  toast.innerHTML = `
    <div class="toast-icon ${iconClass}">
      <span class="material-icons-round">${data.icon || 'notifications'}</span>
    </div>
    <div class="toast-content">
      <div class="toast-header-row">
        <span class="toast-title">${escapeHtml(data.title || 'Proactive Alert')}</span>
        <span class="material-icons-round toast-close" onclick="event.stopPropagation(); this.closest('.toast-item').remove()">close</span>
      </div>
      <div class="toast-body">${escapeHtml(data.body || '')}</div>
      ${actionHtml ? `<div class="toast-actions">${actionHtml}</div>` : ''}
    </div>
  `;

  toaster.appendChild(toast);

  // Auto remove after 9 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }
  }, 9000);
}

function renderNotificationList() {
  const list = $('notifList');
  if (!list) return;

  if (state.notifications.length === 0) {
    list.innerHTML = '<div class="notif-empty">No proactive notifications yet. Waiting for server push events...</div>';
    return;
  }

  list.innerHTML = state.notifications.map(n => `
    <div class="notif-item" onclick="triggerNotificationClickEvent('${n.type}')">
      <div class="notif-item-icon ${n.type}">
        <span class="material-icons-round">${n.icon || 'notifications'}</span>
      </div>
      <div class="notif-item-content">
        <div class="notif-item-title">${escapeHtml(n.title)}</div>
        <div class="notif-item-body">${escapeHtml(n.body)}</div>
        <div style="font-size:10px; color:var(--text-muted);">${new Date(n.timestamp || Date.now()).toLocaleTimeString()}</div>
      </div>
    </div>
  `).join('');
}

function toggleNotifDropdown() {
  playHapticClick();
  const dd = $('notifDropdown');
  if (dd) dd.classList.toggle('show');
}

function clearNotifications() {
  playHapticClick();
  state.notifications = [];
  const badge = $('notifBadge');
  if (badge) badge.style.display = 'none';
  renderNotificationList();
}

function triggerTestNotification() {
  playHapticClick();
  handleProactiveNotification({
    type: 'delivery',
    title: '📦 Live Delivery Update',
    body: 'Your Amazon package with USB-C Cables is 2 stops away! Arriving by 8 PM.',
    icon: 'local_shipping',
    actionable: true,
    timestamp: new Date().toISOString(),
  });
}

function lockDoorNow() {
  sendSuggestion('Set front door to locked');
}

// ─── INITIALIZE MCP CONNECTION ────────────────────────────────────────────────
async function initialize() {
  setStatus('connecting', 'Connecting to MCP Server...');
  setWaveState('thinking');

  try {
    const initReq = {
      jsonrpc: '2.0',
      id: nextId(),
      method: 'initialize',
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        clientInfo: { name: 'alexa-plus-web-client', version: '2.0.0' },
        capabilities: { sampling: {}, roots: { listChanged: false } },
      },
    };

    const initResp = await mcpPost(initReq);
    const serverInfo = initResp.result?.serverInfo;

    // Send initialized notification
    await mcpPost({ jsonrpc: '2.0', method: 'notifications/initialized' });

    state.connected = true;
    setStatus('connected', `${serverInfo?.name || 'Alexa+ MCP'}`, `v${MCP_PROTOCOL_VERSION}`);
    if ($('protoVersion')) $('protoVersion').textContent = MCP_PROTOCOL_VERSION;

    // Load registered tools and routines
    await loadTools();
    await loadRoutines();

    // Open persistent SSE channel for proactive push
    openPersistentSSE();

    // Load initial ambient data
    refreshAmbientData();

    setWaveState('idle');
    playSuccessChord();
  } catch (err) {
    setStatus('error', 'Connection failed: ' + err.message);
    setWaveState('idle');
    console.error('MCP Initialization failed:', err);
  }
}

async function loadTools() {
  const resp = await mcpPost({ jsonrpc: '2.0', id: nextId(), method: 'tools/list', params: {} });
  state.tools = resp.result?.tools || [];
  renderSkills(state.tools);
  if ($('skillsCount')) $('skillsCount').textContent = `${state.tools.length} Active`;
}

async function loadRoutines() {
  try {
    const resp = await fetch(`${MCP_SERVER}/routines`);
    if (resp.ok) state.routines = await resp.json();
  } catch (e) {
    console.warn('Could not load routine definitions:', e);
  }
}

function renderSkills(tools) {
  const grid = $('skillsGrid');
  if (!grid) return;
  grid.innerHTML = tools.map(t => `
    <div class="skill-item" onclick="triggerSkillSample('${t.name}')" title="Click to trigger sample ${t.title || t.name} event">
      <span class="material-icons-round skill-item-icon">${t.annotations?.icon || getSkillIcon(t.name)}</span>
      <div class="skill-item-text">
        <span class="skill-name">${escapeHtml(t.title || t.name)}</span>
        <span class="skill-desc">${escapeHtml(t.description)}</span>
      </div>
    </div>
  `).join('');
}

function triggerSkillSample(skillName) {
  playHapticClick();
  const samplePrompts = {
    alexa_weather: 'What\'s the weather today in Seattle?',
    alexa_smart_home: 'Turn on the living room lights',
    alexa_shopping: 'Check my Amazon orders',
    alexa_music: 'Play some jazz music',
    alexa_calendar: 'List my upcoming calendar events',
    alexa_news: 'What are the top breaking news stories?',
    alexa_traffic: 'How is the commute traffic downtown?',
    alexa_general_ai: 'Explain how MCP Streamable HTTP works',
    alexa_routine: 'Run Good Morning routine',
    alexa_ambient: 'Show ambient dashboard data',
  };
  const prompt = samplePrompts[skillName] || `Use ${skillName}`;
  sendSuggestion(prompt);
}

// ─── STANDOUT FEATURE 2 & 7: MULTI-SKILL ORCHESTRATION & DAG ──────────────────
async function triggerRoutine(routineKey) {
  playHapticClick();
  if (state.ambientMode) toggleAmbientMode();

  const routineNames = {
    good_morning: 'Good Morning Routine',
    good_night: 'Good Night Routine',
    leaving_home: 'Leaving Home Routine',
    arriving_home: 'Arriving Home Routine',
  };

  const title = routineNames[routineKey] || 'Multi-Skill Routine';
  appendMessage('user', `Run ${title}`);

  const routineCardId = 'routine-card-' + Date.now();
  const def = state.routines[routineKey];
  const steps = def?.steps || [
    { label: 'Bedroom Lights On', skill: 'alexa_smart_home' },
    { label: 'Check Weather Forecast', skill: 'alexa_weather' },
    { label: 'Today\'s Calendar Events', skill: 'alexa_calendar' },
    { label: 'Top News Briefing', skill: 'alexa_news' },
    { label: 'Commute Traffic Check', skill: 'alexa_traffic' },
  ];

  let cardHtml = `
    <div class="routine-pipeline-card" id="${routineCardId}">
      <div class="pipeline-header">
        <div class="pipeline-title-group">
          <span class="material-icons-round">${def?.icon || 'auto_mode'}</span>
          <span>${title}</span>
        </div>
        <button class="pipeline-view-dag-btn" onclick="openDAGModal('${routineKey}')">
          <span class="material-icons-round">account_tree</span> View DAG Graph
        </button>
      </div>
      <div class="pipeline-progress-wrap">
        <div class="progress-track">
          <div class="progress-bar-glow" id="${routineCardId}-bar" style="width: 10%;"></div>
        </div>
      </div>
      <div class="pipeline-steps-list" id="${routineCardId}-steps">
        ${steps.map((s, idx) => `
          <div class="pipeline-step-item" id="${routineCardId}-step-${idx}">
            <span class="step-num-badge">${idx + 1}</span>
            <span class="step-label-text">${escapeHtml(s.label)}</span>
            <span class="step-skill-badge">${s.skill}</span>
            <span class="material-icons-round step-status-icon">schedule</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  appendMessage('assistant', cardHtml, { skill: 'alexa_routine', skillTitle: 'Multi-Skill Pipeline' });
  setWaveState('thinking');

  try {
    const req = {
      jsonrpc: '2.0',
      id: nextId(),
      method: 'tools/call',
      params: { name: 'alexa_routine', arguments: { routine: routineKey } },
    };

    const resp = await mcpPost(req, true);
    setWaveState('speaking');

    const progressBar = $(`${routineCardId}-bar`);
    for (let i = 0; i < steps.length; i++) {
      const stepEl = $(`${routineCardId}-step-${i}`);
      if (stepEl) {
        stepEl.className = 'pipeline-step-item running';
        const icon = stepEl.querySelector('.step-status-icon');
        if (icon) icon.textContent = 'autorenew';
      }
      if (progressBar) progressBar.style.width = `${Math.round(((i + 1) / steps.length) * 100)}%`;
      await new Promise(r => setTimeout(r, 450));

      if (stepEl) {
        stepEl.className = 'pipeline-step-item completed';
        const icon = stepEl.querySelector('.step-status-icon');
        if (icon) icon.textContent = 'check_circle';
      }
    }

    playSuccessChord();
    setWaveState('idle');
  } catch (err) {
    setWaveState('idle');
    console.error('Routine execution error:', err);
  }
}

// Visual DAG Graph Modal (Feature 7)
function openDAGModal(routineKey = 'good_morning') {
  playHapticClick();
  const overlay = $('dagModalOverlay');
  const body = $('dagModalBody');
  const title = $('dagModalTitle');
  if (!overlay || !body) return;

  const names = {
    good_morning: 'Good Morning Routine',
    good_night: 'Good Night Routine',
    leaving_home: 'Leaving Home Routine',
    arriving_home: 'Arriving Home Routine',
  };
  if (title) title.textContent = `Skill Pipeline DAG: ${names[routineKey] || routineKey}`;

  const nodes = [
    { label: 'Voice / Trigger', type: 'trigger', x: 50, y: 120 },
    { label: 'Smart Home (Lights)', type: 'skill', x: 230, y: 60 },
    { label: 'Weather Forecast', type: 'skill', x: 230, y: 180 },
    { label: 'Calendar Events', type: 'skill', x: 440, y: 60 },
    { label: 'Flash News', type: 'skill', x: 440, y: 180 },
    { label: 'Traffic Commute', type: 'skill', x: 630, y: 120 },
    { label: 'Alexa+ Synthesis', type: 'output', x: 810, y: 120 },
  ];

  body.innerHTML = `
    <svg width="880" height="260" viewBox="0 0 880 260" style="overflow: visible;">
      <defs>
        <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#d97706" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#c26d18" stop-opacity="0.8"/>
        </linearGradient>
      </defs>

      <!-- Connection Lines -->
      <line x1="120" y1="120" x2="230" y2="60" stroke="url(#edgeGrad)" stroke-width="2.5" stroke-dasharray="4,4"/>
      <line x1="120" y1="120" x2="230" y2="180" stroke="url(#edgeGrad)" stroke-width="2.5" stroke-dasharray="4,4"/>
      <line x1="330" y1="60" x2="440" y2="60" stroke="url(#edgeGrad)" stroke-width="2.5"/>
      <line x1="330" y1="180" x2="440" y2="180" stroke="url(#edgeGrad)" stroke-width="2.5"/>
      <line x1="540" y1="60" x2="630" y2="120" stroke="url(#edgeGrad)" stroke-width="2.5"/>
      <line x1="540" y1="180" x2="630" y2="120" stroke="url(#edgeGrad)" stroke-width="2.5"/>
      <line x1="720" y1="120" x2="810" y2="120" stroke="url(#edgeGrad)" stroke-width="3"/>

      <!-- Nodes -->
      ${nodes.map(n => `
        <g transform="translate(${n.x - 45}, ${n.y - 25})">
          <rect width="110" height="50" rx="10" fill="#fffdfa" stroke="${n.type === 'trigger' ? '#d97706' : n.type === 'output' ? '#059669' : '#b45309'}" stroke-width="2"/>
          <text x="55" y="28" fill="#23201d" font-size="10.5" font-weight="700" text-anchor="middle" font-family="Inter, sans-serif">${n.label}</text>
        </g>
      `).join('')}
    </svg>
  `;

  overlay.classList.add('open');
}

function closeDAGModal(e) {
  if (e && e.target !== $('dagModalOverlay')) return;
  const overlay = $('dagModalOverlay');
  if (overlay) overlay.classList.remove('open');
}

// ─── STANDOUT FEATURE 1: AMBIENT DASHBOARD MODE ───────────────────────────────
function toggleAmbientMode() {
  playHapticClick();
  state.ambientMode = !state.ambientMode;
  const dashboard = $('ambientDashboard');
  const mainApp = $('mainAppContainer');

  if (dashboard && mainApp) {
    if (state.ambientMode) {
      dashboard.classList.add('active');
      mainApp.style.display = 'none';
      refreshAmbientData();
    } else {
      dashboard.classList.remove('active');
      mainApp.style.display = 'flex';
    }
  }
}

// Ambient Live Clock
function startAmbientClock() {
  function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if ($('ambientClock')) $('ambientClock').textContent = timeStr;
    if ($('ambientDate')) $('ambientDate').textContent = dateStr;
  }
  updateTime();
  setInterval(updateTime, 1000);
}

// Fetch Ambient Data via alexa_ambient Skill
async function refreshAmbientData() {
  try {
    const resp = await mcpPost({
      jsonrpc: '2.0',
      id: nextId(),
      method: 'tools/call',
      params: { name: 'alexa_ambient', arguments: { widgets: ['clock', 'weather', 'calendar', 'smart_home', 'news_ticker'] } },
    });

    const data = resp.result?._meta?.data?.data;
    if (data) {
      if (data.weather) {
        if ($('ambientTemp')) $('ambientTemp').textContent = `${data.weather.temperature?.value || 68}°`;
        if ($('ambientCondition')) $('ambientCondition').textContent = data.weather.condition || 'Clear';
        if ($('ambientFeels')) $('ambientFeels').textContent = `Feels like ${data.weather.feelsLike?.value || 67}°`;
        if ($('ambientHumidity')) $('ambientHumidity').textContent = `${data.weather.humidity || 50}%`;
        if ($('ambientWind')) $('ambientWind').textContent = `${data.weather.windMph || 8} mph ${data.weather.windDirection || 'NW'}`;
        if ($('ambientUv')) $('ambientUv').textContent = `${data.weather.uvIndex || 3} Moderate`;

        if ($('ambientForecastRow') && data.weather.forecast) {
          $('ambientForecastRow').innerHTML = data.weather.forecast.map(f => `
            <div class="forecast-day-card" onclick="triggerForecastDayClick('${f.day}')">
              <span class="forecast-day-name">${f.day.slice(0, 3)}</span>
              <span class="material-icons-round forecast-icon">${f.condition.includes('Rain') ? 'grain' : f.condition.includes('Cloud') ? 'cloud' : 'wb_sunny'}</span>
              <span class="forecast-temp">${f.highF}°</span>
            </div>
          `).join('');
        }
      }

      if (data.news_ticker?.articles?.length) {
        const headlineText = data.news_ticker.articles.map(a => `🔴 ${a.title} (${a.source})`).join('  ✦  ');
        if ($('ambientTickerText')) $('ambientTickerText').textContent = headlineText;
      }
    }
  } catch (e) {
    console.warn('Ambient refresh error:', e);
  }
}

// ─── INTERACTIVE FEATURE SAMPLE EVENTS (Click to trigger live events) ────────

/**
 * 1. Weather Feature Click Event
 */
function triggerWeatherSampleEvent() {
  playHapticClick();
  const temp = $('ambientTemp') ? $('ambientTemp').textContent : '68°';
  const cond = $('ambientCondition') ? $('ambientCondition').textContent : 'Partly Cloudy';

  appendMessage('assistant', `
    <div style="background:#fffdfa; border:1px solid var(--border-strong); border-radius:12px; padding:16px; box-shadow:var(--shadow-md);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div style="font-weight:700; color:var(--amazon-orange); font-size:14px;">🌤️ Weather Radar & Forecast Event</div>
        <span style="font-size:11px; background:rgba(217,119,6,0.12); padding:2px 8px; border-radius:12px; font-weight:700; color:var(--amazon-orange);">Live Sensor Sync</span>
      </div>
      <p style="font-size:13px; color:var(--text-primary); line-height:1.5;">
        Currently <strong>${temp}</strong> and <strong>${cond}</strong> in Seattle, WA. Air quality is Good (AQI 32). Zero chance of precipitation for the next 3 hours. Sunset is at 6:18 PM PST.
      </p>
      <div style="display:flex; gap:10px; margin-top:12px;">
        <button class="notif-action-btn" onclick="sendSuggestion('What is the 5-day weather forecast?')">5-Day Outlook</button>
        <button class="notif-action-btn" onclick="sendSuggestion('Is it raining in Seattle?')">Rain Check</button>
      </div>
    </div>
  `, { skill: 'alexa_weather', skillTitle: 'Live Weather Radar Event' });

  playSuccessChord();
}

function triggerForecastDayClick(day) {
  playHapticClick();
  sendSuggestion(`What is the weather forecast for ${day}?`);
}

/**
 * 2. Smart Home Feature Click Events
 */
function toggleSmartDevice(deviceName, key) {
  playHapticClick();
  if (key === 'living') {
    state.smartHome.livingLights = !state.smartHome.livingLights;
    const tile = $('tileLivingLights');
    const stateEl = $('stateLivingLights');
    if (tile) tile.classList.toggle('active', state.smartHome.livingLights);
    if (stateEl) stateEl.textContent = state.smartHome.livingLights ? 'On · 80%' : 'Off';
    mcpPost({ jsonrpc: '2.0', id: nextId(), method: 'tools/call', params: { name: 'alexa_smart_home', arguments: { device: 'Living Room Lights', action: state.smartHome.livingLights ? 'turn_on' : 'turn_off' } } });
  } else if (key === 'bed') {
    state.smartHome.bedroomLights = !state.smartHome.bedroomLights;
    const tile = $('tileBedLights');
    const stateEl = $('stateBedLights');
    if (tile) tile.classList.toggle('active', state.smartHome.bedroomLights);
    if (stateEl) stateEl.textContent = state.smartHome.bedroomLights ? 'On · 100%' : 'Off';
    mcpPost({ jsonrpc: '2.0', id: nextId(), method: 'tools/call', params: { name: 'alexa_smart_home', arguments: { device: 'Bedroom Lights', action: state.smartHome.bedroomLights ? 'turn_on' : 'turn_off' } } });
  }
}

function adjustThermostat() {
  playHapticClick();
  sendSuggestion('Set thermostat to 72 degrees');
}

function changeTemp(delta) {
  playHapticClick();
  state.smartHome.thermostatTemp += delta;
  if ($('targetTempVal')) $('targetTempVal').textContent = `${state.smartHome.thermostatTemp}°F`;
  if ($('stateThermostat')) $('stateThermostat').textContent = `Heating · ${state.smartHome.thermostatTemp}°F`;
  mcpPost({ jsonrpc: '2.0', id: nextId(), method: 'tools/call', params: { name: 'alexa_smart_home', arguments: { device: 'thermostat', action: 'set', value: `${state.smartHome.thermostatTemp}°F` } } });
}

function toggleDoorLock() {
  playHapticClick();
  state.smartHome.doorLocked = !state.smartHome.doorLocked;
  const tile = $('tileDoorLock');
  const icon = $('iconDoorLock');
  const stateEl = $('stateDoorLock');
  if (tile) tile.classList.toggle('locked', state.smartHome.doorLocked);
  if (icon) icon.textContent = state.smartHome.doorLocked ? 'lock' : 'lock_open';
  if (stateEl) stateEl.textContent = state.smartHome.doorLocked ? 'Locked' : 'Unlocked';
  mcpPost({ jsonrpc: '2.0', id: nextId(), method: 'tools/call', params: { name: 'alexa_smart_home', arguments: { device: 'front door', action: 'set', value: state.smartHome.doorLocked ? 'locked' : 'unlocked' } } });
}

/**
 * 3. Music Feature Click Events
 */
function triggerMusicSampleEvent(event) {
  if (event) event.stopPropagation();
  playHapticClick();
  triggerNextTrackEvent();
}

function triggerNextTrackEvent() {
  playHapticClick();
  state.currentTrackIndex = (state.currentTrackIndex + 1) % state.musicPlaylist.length;
  updateCurrentTrack(state.musicPlaylist[state.currentTrackIndex]);
}

function triggerPreviousTrackEvent() {
  playHapticClick();
  state.currentTrackIndex = (state.currentTrackIndex - 1 + state.musicPlaylist.length) % state.musicPlaylist.length;
  updateCurrentTrack(state.musicPlaylist[state.currentTrackIndex]);
}

function updateCurrentTrack(track) {
  state.music.title = track.title;
  state.music.artist = track.artist;
  state.music.isPlaying = true;

  if ($('ambientTrackTitle')) $('ambientTrackTitle').textContent = track.title;
  if ($('ambientTrackArtist')) $('ambientTrackArtist').textContent = `${track.artist} — ${track.album}`;

  const vinyl = $('ambientVinyl');
  const bars = $('ambientAudioBars');
  const icon = $('musicPlayIcon');
  if (vinyl) vinyl.classList.add('spinning');
  if (bars) bars.classList.add('active');
  if (icon) icon.textContent = 'pause';

  playSuccessChord();

  // Trigger MCP Tool Call
  mcpPost({
    jsonrpc: '2.0',
    id: nextId(),
    method: 'tools/call',
    params: { name: 'alexa_music', arguments: { command: 'play', query: track.title } },
  });
}

function toggleMusicPlay() {
  playHapticClick();
  state.music.isPlaying = !state.music.isPlaying;
  const vinyl = $('ambientVinyl');
  const bars = $('ambientAudioBars');
  const icon = $('musicPlayIcon');
  if (vinyl) vinyl.classList.toggle('spinning', state.music.isPlaying);
  if (bars) bars.classList.toggle('active', state.music.isPlaying);
  if (icon) icon.textContent = state.music.isPlaying ? 'pause' : 'play_arrow';

  mcpPost({
    jsonrpc: '2.0',
    id: nextId(),
    method: 'tools/call',
    params: { name: 'alexa_music', arguments: { command: state.music.isPlaying ? 'play' : 'pause' } },
  });
}

/**
 * 4. News Feature Click Event
 */
function triggerNewsSampleEvent() {
  playHapticClick();
  sendSuggestion('What are the top breaking news headlines?');
}

/**
 * 5. Time & Calendar Announcement Event
 */
function triggerTimeSampleEvent() {
  playUniqueNotificationSound();
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  appendMessage('assistant', `
    <div style="background:#fffdfa; border:1px solid var(--border-strong); border-radius:12px; padding:14px; box-shadow:var(--shadow-sm);">
      <div style="font-weight:700; color:var(--amazon-orange); margin-bottom:4px;">⏰ Time & Calendar Briefing</div>
      <p style="font-size:13px; color:var(--text-primary);">
        It is currently <strong>${timeStr}</strong> on <strong>${dateStr}</strong>. Your next scheduled event is <strong>Team Standup</strong> at 9:00 AM.
      </p>
    </div>
  `, { skill: 'alexa_calendar', skillTitle: 'Time & Schedule Announcement' });
}

/**
 * 6. Conversational Memory Click Event
 */
function triggerMemorySampleEvent(key) {
  playHapticClick();
  if (key === 'location') {
    sendSuggestion(`What is the weather like in ${state.memoryContext.lastLocation}?`);
  } else if (key === 'device') {
    sendSuggestion(`Check status of ${state.memoryContext.lastDevice}`);
  } else if (key === 'music') {
    sendSuggestion(`Play ${state.memoryContext.lastMusicQuery} on Amazon Music`);
  }
}

/**
 * 7. Waveform Click Event (Cycles Voice Synthesis Waveform)
 */
function triggerWaveformSampleEvent() {
  playHapticClick();
  const modes = ['idle', 'listening', 'thinking', 'speaking'];
  const nextIdx = (modes.indexOf(state.waveState) + 1) % modes.length;
  setWaveState(modes[nextIdx]);
}

/**
 * 8. Alexa Orb Click Event
 */
function triggerOrbSampleEvent() {
  playUniqueNotificationSound();
  appendMessage('assistant', `
    <p>Hello! I'm Alexa+, powered by the open Model Context Protocol with Streamable HTTP transports and Agent Skills. You can run multi-skill routines, control smart devices, stream music, and monitor ambient feeds. What would you like to do?</p>
  `, { skill: 'alexa_general_ai', skillTitle: 'Alexa+ Greeting' });
}

/**
 * 9. Sample MCP Inspector Event Simulator
 */
function triggerSampleInspectorEvent() {
  playHapticClick();
  handleProactiveNotification({
    type: 'reminder',
    title: '⏰ Calendar Reminder',
    body: 'Product Design Review begins in 10 minutes (Conference Room B)',
    icon: 'alarm',
    actionable: true,
    timestamp: new Date().toISOString(),
  });
}

function triggerPackageTrackerSampleEvent() {
  sendSuggestion('Check my Amazon orders');
}

function triggerCalendarSampleEvent() {
  sendSuggestion('List my upcoming calendar events');
}

function triggerNotificationClickEvent(type) {
  playHapticClick();
  if (type === 'delivery') triggerPackageTrackerSampleEvent();
  else if (type === 'reminder') triggerCalendarSampleEvent();
  else if (type === 'smart_home') toggleDoorLock();
  else triggerWeatherSampleEvent();
}

// ─── STANDOUT FEATURE 6: CONVERSATIONAL MEMORY ────────────────────────────────
function updateMemoryContext(text, toolName, args) {
  state.memoryContext.turns++;

  if (toolName === 'alexa_weather' && args?.location) {
    state.memoryContext.lastLocation = args.location;
  }
  if (toolName === 'alexa_smart_home' && args?.device) {
    state.memoryContext.lastDevice = args.device;
  }
  if (toolName === 'alexa_music' && args?.query) {
    state.memoryContext.lastMusicQuery = args.query;
  }

  const tagsList = $('memoryTagsList');
  if (tagsList) {
    tagsList.innerHTML = `
      <span class="mem-tag" onclick="triggerMemorySampleEvent('location')">📍 Location: ${escapeHtml(state.memoryContext.lastLocation)}</span>
      <span class="mem-tag" onclick="triggerMemorySampleEvent('device')">💡 Device: ${escapeHtml(state.memoryContext.lastDevice)}</span>
      <span class="mem-tag" onclick="triggerMemorySampleEvent('music')">🎵 Music: ${escapeHtml(state.memoryContext.lastMusicQuery)}</span>
    `;
  }
}

async function openMemoryInspector() {
  playHapticClick();
  switchInspectorTab('memory');
  toggleInspector(true);
  fetchServerMemory();
}

async function fetchServerMemory() {
  const container = $('memoryContentsList');
  if (!container) return;
  container.innerHTML = '<div style="color:var(--text-muted)">Querying session memory via MCP Resource alexa://memory...</div>';

  try {
    const resp = await mcpPost({
      jsonrpc: '2.0',
      id: nextId(),
      method: 'resources/read',
      params: { uri: 'alexa://memory' },
    });

    const raw = resp.result?.contents?.[0]?.text;
    const list = raw ? JSON.parse(raw) : [];

    if (list.length === 0) {
      container.innerHTML = `
        <div style="font-size:12px; color:var(--text-secondary); margin-bottom:10px;">
          Active Client-Side Entity Context:
        </div>
        <div class="json-box">${JSON.stringify(state.memoryContext, null, 2)}</div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="font-size:12px; color:var(--text-secondary); margin-bottom:10px;">
        Server Session History (${list.length} turns recorded):
      </div>
      <div class="json-box">${JSON.stringify(list, null, 2)}</div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color:var(--error)">Memory read failed: ${err.message}</div>`;
  }
}

// ─── STANDOUT FEATURE 5: MCP PROTOCOL INSPECTOR ───────────────────────────────
function toggleInspector(forceOpen = null) {
  playHapticClick();
  state.inspectorOpen = forceOpen !== null ? forceOpen : !state.inspectorOpen;
  const drawer = $('inspectorDrawer');
  if (drawer) drawer.classList.toggle('open', state.inspectorOpen);
}

function switchInspectorTab(tabName) {
  playHapticClick();
  state.currentInspTab = tabName;
  document.querySelectorAll('.insp-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.insp-pane').forEach(p => p.classList.remove('active'));

  const tabBtn = Array.from(document.querySelectorAll('.insp-tab')).find(b => b.textContent.toLowerCase().includes(tabName));
  if (tabBtn) tabBtn.classList.add('active');

  const pane = $(`pane${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
  if (pane) pane.classList.add('active');

  if (tabName === 'tools') renderToolsInspector();
}

function renderNetworkInspector() {
  const tbody = $('networkTableBody');
  const count = $('netCount');
  if (count) count.textContent = state.networkLogs.length;
  if (!tbody) return;

  tbody.innerHTML = state.networkLogs.slice(0, 40).map((item, idx) => `
    <tr class="net-row" onclick="selectNetworkLog(${idx})">
      <td><span class="method-tag ${item.type.toLowerCase()}">${item.method}</span></td>
      <td><span class="status-chip ${item.status === 200 || item.status === 'ok' ? 'ok' : 'err'}">${item.status}</span></td>
      <td>${item.type}</td>
      <td>${item.time}</td>
      <td>${item.latency}</td>
    </tr>
  `).join('');
}

function selectNetworkLog(idx) {
  playHapticClick();
  const item = state.networkLogs[idx];
  const pane = $('networkDetailPane');
  if (!pane || !item) return;

  document.querySelectorAll('.net-row').forEach(r => r.classList.remove('selected'));
  document.querySelectorAll('.net-row')[idx]?.classList.add('selected');

  pane.innerHTML = `
    <div style="font-weight:700; color:var(--text-primary); margin-bottom:8px;">Request: ${escapeHtml(item.method)}</div>
    <div style="color:var(--text-muted); font-size:10px; margin-bottom:4px;">HEADERS</div>
    <div class="json-box">${JSON.stringify(item.requestHeaders, null, 2)}</div>
    <div style="color:var(--text-muted); font-size:10px; margin:8px 0 4px;">REQUEST BODY</div>
    <div class="json-box">${JSON.stringify(item.requestBody, null, 2)}</div>
    <div style="color:var(--text-muted); font-size:10px; margin:8px 0 4px;">RESPONSE BODY (${item.latency})</div>
    <div class="json-box">${JSON.stringify(item.responseBody, null, 2)}</div>
  `;
}

function renderSSEInspector() {
  const view = $('sseStreamView');
  const count = $('sseCount');
  if (count) count.textContent = state.sseEvents.length;
  if (!view) return;

  view.innerHTML = state.sseEvents.slice(0, 30).map(evt => `
    <div class="sse-event-card">
      <div class="sse-event-header">
        <span class="sse-event-type">event: ${evt.type}</span>
        <span style="font-size:10px; color:var(--text-muted);">${evt.time}</span>
      </div>
      <div class="json-box">${JSON.stringify(evt.data, null, 2)}</div>
    </div>
  `).join('');
}

function renderToolsInspector() {
  const view = $('toolsInspectorView');
  if (!view) return;

  view.innerHTML = `
    <div style="padding:14px; display:flex; flex-direction:column; gap:12px;">
      <div style="font-size:13px; font-weight:700; color:var(--text-primary);">Agent Skills Registered (${state.tools.length})</div>
      ${state.tools.map(t => `
        <div style="background:#ffffff; border:1px solid var(--border); border-radius:10px; padding:12px; box-shadow:var(--shadow-sm);">
          <div style="font-weight:700; color:var(--amazon-orange);">${t.name} — ${t.title || ''}</div>
          <div style="font-size:11px; color:var(--text-secondary); margin:4px 0 8px;">${t.description}</div>
          <div class="json-box">${JSON.stringify(t.inputSchema || {}, null, 2)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function clearInspectorLogs() {
  playHapticClick();
  state.networkLogs = [];
  state.sseEvents = [];
  renderNetworkInspector();
  renderSSEInspector();
  if ($('networkDetailPane')) $('networkDetailPane').innerHTML = '<div class="detail-placeholder">Logs cleared</div>';
}

function exportInspectorLogs() {
  playHapticClick();
  const data = JSON.stringify({ networkLogs: state.networkLogs, sseEvents: state.sseEvents }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mcp-inspector-export-${Date.now()}.json`;
  a.click();
}

// ─── CHAT & INTENT PARSING ENGINE ─────────────────────────────────────────────
function parseIntent(text) {
  const t = text.toLowerCase();

  // Routines check
  if (t.includes('good morning') || t.includes('morning routine')) return { tool: 'alexa_routine', args: { routine: 'good_morning' } };
  if (t.includes('good night') || t.includes('bedtime') || t.includes('sleep routine')) return { tool: 'alexa_routine', args: { routine: 'good_night' } };
  if (t.includes('leaving home') || t.includes('i am leaving')) return { tool: 'alexa_routine', args: { routine: 'leaving_home' } };
  if (t.includes('arriving home') || t.includes('i am home')) return { tool: 'alexa_routine', args: { routine: 'arriving_home' } };

  // Weather check with Conversational Memory reference
  if (t.includes('weather') || t.includes('temperature') || t.includes('forecast') || t.includes('rain')) {
    let loc = state.memoryContext.lastLocation;
    const match = text.match(/(?:in|for|at)\s+([A-Za-z\s]+)/i);
    if (match) loc = match[1].trim();
    return { tool: 'alexa_weather', args: { location: loc, units: 'fahrenheit' } };
  }

  if (t.startsWith('what about') || t.startsWith('how about')) {
    const loc = text.replace(/what about|how about/i, '').replace('?', '').trim();
    if (loc) return { tool: 'alexa_weather', args: { location: loc, units: 'fahrenheit' } };
  }

  // Smart Home
  if (t.includes('light') || t.includes('thermostat') || t.includes('door') || t.includes('lock') || t.includes('garage') || t.includes('turn on') || t.includes('turn off')) {
    let action = 'turn_on';
    if (t.includes('turn off') || t.includes('shut down') || t.includes('switch off')) action = 'turn_off';
    if (t.includes('lock') && !t.includes('unlock')) action = 'set';

    let device = state.memoryContext.lastDevice;
    if (t.includes('bedroom')) device = 'bedroom lights';
    else if (t.includes('living room')) device = 'living room lights';
    else if (t.includes('kitchen')) device = 'kitchen lights';
    else if (t.includes('front door')) device = 'front door';
    else if (t.includes('thermostat')) device = 'thermostat';

    let val = action === 'turn_on' ? 'on' : 'off';
    if (t.includes('72')) val = '72°F';
    if (t.includes('68')) val = '68°F';
    return { tool: 'alexa_smart_home', args: { device, action, value: val } };
  }

  // Music
  if (t.includes('play') || t.includes('music') || t.includes('song') || t.includes('playlist')) {
    const query = text.replace(/play|music|song|on amazon music/gi, '').trim() || state.memoryContext.lastMusicQuery;
    return { tool: 'alexa_music', args: { command: 'play', query } };
  }

  // Shopping
  if (t.includes('order') || t.includes('package') || t.includes('amazon') || t.includes('cart') || t.includes('buy') || t.includes('track')) {
    if (t.includes('package') || t.includes('track') || t.includes('order')) {
      return { tool: 'alexa_shopping', args: { query: 'orders', action: 'check_orders' } };
    }
    return { tool: 'alexa_shopping', args: { query: text.replace(/buy|search|on amazon/gi, '').trim() || 'Echo Dot', action: 'search' } };
  }

  // Calendar
  if (t.includes('calendar') || t.includes('schedule') || t.includes('meeting') || t.includes('appointment') || t.includes('event')) {
    return { tool: 'alexa_calendar', args: { action: 'list_events' } };
  }

  // News
  if (t.includes('news') || t.includes('headline') || t.includes('briefing')) {
    let cat = 'top';
    if (t.includes('tech')) cat = 'technology';
    if (t.includes('sports')) cat = 'sports';
    return { tool: 'alexa_news', args: { category: cat, count: 4 } };
  }

  // Traffic
  if (t.includes('traffic') || t.includes('commute') || t.includes('drive to') || t.includes('directions')) {
    return { tool: 'alexa_traffic', args: { destination: 'Downtown', mode: 'driving' } };
  }

  // General AI fallback
  return { tool: 'alexa_general_ai', args: { query: text, mode: 'detailed' } };
}

// Send Message
async function sendMessage() {
  const input = $('userInput');
  const text = input ? input.value.trim() : '';
  if (!text || state.isProcessing) return;

  state.isProcessing = true;
  input.value = '';
  if ($('sendBtn')) $('sendBtn').disabled = true;

  if ($('welcomeScreen')) $('welcomeScreen').style.display = 'none';

  appendMessage('user', text);
  addTypingIndicator();
  setWaveState('thinking');

  try {
    const { tool, args } = parseIntent(text);
    updateMemoryContext(text, tool, args);

    if (tool === 'alexa_routine') {
      removeTypingIndicator();
      await triggerRoutine(args.routine);
      return;
    }

    const resp = await mcpPost({
      jsonrpc: '2.0',
      id: nextId(),
      method: 'tools/call',
      params: { name: tool, arguments: args },
    });

    removeTypingIndicator();
    setWaveState('speaking');

    const data = resp.result?._meta?.data;
    const msgText = resp.result?.content?.[0]?.text || 'Action complete.';

    let html = `<p style="margin-bottom:${data ? '12px' : '0'}">${escapeHtml(msgText)}</p>`;
    if (data) html += renderSkillResultCard(tool, data);

    appendMessage('assistant', html, { skill: tool, skillTitle: state.tools.find(t => t.name === tool)?.title || tool });
    playSuccessChord();
  } catch (err) {
    removeTypingIndicator();
    appendMessage('assistant', `<div style="color:var(--error)">Error: ${escapeHtml(err.message)}</div>`);
  } finally {
    state.isProcessing = false;
    setWaveState('idle');
    if ($('sendBtn')) $('sendBtn').disabled = false;
    if (input) input.focus();
  }
}

// ─── RICH RESULT RENDERERS ────────────────────────────────────────────────────
function renderSkillResultCard(tool, data) {
  if (tool === 'alexa_weather') {
    return `
      <div style="background:#ffffff; border:1px solid var(--border); border-radius:12px; padding:14px; margin-top:8px; box-shadow:var(--shadow-sm);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size:32px; font-weight:800; color:var(--text-primary);">${data.temperature?.display || '68°F'}</div>
            <div style="font-size:13px; color:var(--text-secondary);">${data.condition} · Feels like ${data.feelsLike?.value}°</div>
          </div>
          <span class="material-icons-round" style="font-size:48px; color:var(--amazon-orange);">wb_sunny</span>
        </div>
        <div style="display:flex; gap:16px; margin-top:12px; font-size:11.5px; color:var(--text-muted); border-top:1px solid var(--border); padding-top:8px;">
          <span>💧 Humidity: ${data.humidity}%</span>
          <span>💨 Wind: ${data.windMph} mph</span>
          <span>☀️ UV Index: ${data.uvIndex}</span>
        </div>
      </div>
    `;
  }

  if (tool === 'alexa_smart_home') {
    return `
      <div style="background:#ffffff; border:1px solid var(--border); border-radius:12px; padding:12px; margin-top:8px; display:flex; align-items:center; gap:12px; box-shadow:var(--shadow-sm);">
        <span class="material-icons-round" style="font-size:32px; color:var(--success);">check_circle</span>
        <div>
          <div style="font-weight:700; color:var(--text-primary);">${escapeHtml(data.device || 'Device')}</div>
          <div style="font-size:12px; color:var(--text-secondary);">${escapeHtml(data.message || 'Updated')}</div>
        </div>
      </div>
    `;
  }

  if (tool === 'alexa_shopping') {
    if (data.orders) {
      return `
        <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
          ${data.orders.map(o => `
            <div style="background:#ffffff; border:1px solid var(--border); border-radius:10px; padding:10px; display:flex; justify-content:space-between; align-items:center; box-shadow:var(--shadow-sm);">
              <div>
                <div style="font-weight:700; font-size:12.5px; color:var(--text-primary);">${escapeHtml(o.item)}</div>
                <div style="font-size:11px; color:var(--text-muted);">Order #${o.orderId} · Tracking: ${o.tracking}</div>
              </div>
              <span style="font-size:11px; font-weight:700; color:var(--amazon-orange); background:rgba(217,119,6,0.12); padding:2px 8px; border-radius:6px;">${o.status}</span>
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  if (tool === 'alexa_music') {
    return `
      <div style="background:#ffffff; border:1px solid var(--border); border-radius:12px; padding:12px; margin-top:8px; display:flex; align-items:center; gap:12px; box-shadow:var(--shadow-sm);">
        <span class="material-icons-round" style="font-size:36px; color:var(--amazon-orange);">play_circle_filled</span>
        <div>
          <div style="font-weight:700; color:var(--text-primary);">${escapeHtml(data.nowPlaying?.title || data.playlist || 'Amazon Music')}</div>
          <div style="font-size:12px; color:var(--text-secondary);">${escapeHtml(data.nowPlaying?.artist || 'Now Playing')}</div>
        </div>
      </div>
    `;
  }

  return '';
}

// ─── UI HELPERS & LISTENERS ───────────────────────────────────────────────────
function appendMessage(role, content, meta = null) {
  const list = $('messagesList');
  if (!list) return;

  const row = document.createElement('div');
  row.className = `message-row ${role}`;

  const avatarIcon = role === 'user' ? 'person' : 'auto_awesome';
  const metaHtml = meta ? `
    <div class="msg-meta">
      <span>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      ${meta.skill ? `<span class="skill-used-chip"><span class="material-icons-round" style="font-size:11px;">extension</span> ${meta.skillTitle || meta.skill}</span>` : ''}
    </div>
  ` : '';

  row.innerHTML = `
    <div class="msg-avatar"><span class="material-icons-round">${avatarIcon}</span></div>
    <div class="msg-bubble-wrap">
      <div class="msg-bubble">${content}</div>
      ${metaHtml}
    </div>
  `;

  list.appendChild(row);
  const container = $('chatContainer');
  if (container) container.scrollTop = container.scrollHeight;
}

function addTypingIndicator() {
  const list = $('messagesList');
  if (!list || $('typingIndicator')) return;

  const row = document.createElement('div');
  row.className = 'message-row assistant';
  row.id = 'typingIndicator';
  row.innerHTML = `
    <div class="msg-avatar"><span class="material-icons-round">auto_awesome</span></div>
    <div class="msg-bubble-wrap">
      <div class="msg-bubble typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  list.appendChild(row);
  const container = $('chatContainer');
  if (container) container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  const ind = $('typingIndicator');
  if (ind) ind.remove();
}

function sendSuggestion(text) {
  playHapticClick();
  const input = $('userInput');
  if (input) {
    input.value = text;
    sendMessage();
  }
}

function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function handleUserTyping() {
  setWaveState('listening');
  clearTimeout(state.userTypingTimeout);
  state.userTypingTimeout = setTimeout(() => {
    if (!state.isProcessing) setWaveState('idle');
  }, 1800);
}

function toggleSidebar() {
  playHapticClick();
  state.sidebarOpen = !state.sidebarOpen;
  const sb = $('sidebar');
  if (sb) sb.classList.toggle('collapsed', !state.sidebarOpen);
}

function toggleTheme() {
  playHapticClick();
  state.theme = state.theme === 'echo-obsidian' ? 'warm-alabaster' : 'echo-obsidian';
  document.body.setAttribute('data-theme', state.theme);
  const isDark = state.theme === 'echo-obsidian';

  if ($('themeIcon')) {
    $('themeIcon').textContent = isDark ? 'light_mode' : 'dark_mode';
  }
  if ($('statusBarThemeIcon')) {
    $('statusBarThemeIcon').textContent = isDark ? 'light_mode' : 'dark_mode';
  }
  if ($('statusBarThemeText')) {
    $('statusBarThemeText').textContent = isDark ? 'Alabaster' : 'Obsidian';
  }
}

function clearConversation() {
  playHapticClick();
  const list = $('messagesList');
  if (list) list.innerHTML = '';
  if ($('welcomeScreen')) $('welcomeScreen').style.display = 'flex';
}

function toggleVoice() {
  playHapticClick();
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    return;
  }
  const recog = new SpeechRecognition();
  recog.lang = 'en-US';
  setWaveState('listening');
  const btn = $('micBtn');
  if (btn) btn.classList.add('recording');

  recog.onresult = e => {
    const text = e.results[0][0].transcript;
    if ($('userInput')) $('userInput').value = text;
    if (btn) btn.classList.remove('recording');
    sendMessage();
  };
  recog.onerror = () => {
    if (btn) btn.classList.remove('recording');
    setWaveState('idle');
  };
  recog.onend = () => {
    if (btn) btn.classList.remove('recording');
  };
  recog.start();
}

function reconnect() {
  playHapticClick();
  initialize();
}

function getSkillIcon(name) {
  const map = {
    alexa_weather: 'wb_sunny',
    alexa_smart_home: 'home',
    alexa_shopping: 'shopping_cart',
    alexa_music: 'music_note',
    alexa_calendar: 'calendar_month',
    alexa_news: 'newspaper',
    alexa_general_ai: 'auto_awesome',
    alexa_traffic: 'traffic',
    alexa_routine: 'auto_mode',
    alexa_ambient: 'dashboard',
  };
  return map[name] || 'extension';
}

function escapeHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

// ─── BOOTSTRAP APPLICATION ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initBackgroundParticles();
  initAudioWaveforms();
  startAmbientClock();
  initialize();
});
