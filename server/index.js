/**
 * Alexa+ MCP Server — Enhanced Edition
 * MCP 2025-11-25 Streamable HTTP Transport + Agent Skills
 * 
 * STANDOUT FEATURES:
 * - Multi-skill orchestration (chain skills together)
 * - Proactive server notifications via SSE push
 * - Conversational context memory per session
 * - Routine automation (morning, bedtime, etc.)
 * - Skill dependency graph resolution
 */

import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';

const app = express();
const PORT = 3001;

app.use(cors({
  origin: true,
  exposedHeaders: ['MCP-Session-Id', 'MCP-Protocol-Version'],
}));
app.use(express.json());

// ─── STATE ────────────────────────────────────────────────────────────────────
const sessions = new Map();
const sseConnections = new Map();
const conversationMemory = new Map(); // sessionId → [{role, content, skill, timestamp}]

const MCP_VERSION = '2025-11-25';
const SERVER_INFO = { name: 'alexa-plus-mcp-server', version: '2.0.0', description: 'Alexa+ MCP Server — Enhanced with Orchestration, Proactive Notifications & Memory' };

// ─── AGENT SKILLS REGISTRY ───────────────────────────────────────────────────
const agentSkills = [
  {
    name: 'alexa_weather', title: 'Weather', description: 'Get weather conditions and forecasts.',
    category: 'information', icon: 'wb_sunny',
    inputSchema: { type: 'object', properties: { location: { type: 'string' }, units: { type: 'string', enum: ['celsius', 'fahrenheit'], default: 'fahrenheit' } }, required: ['location'] },
  },
  {
    name: 'alexa_smart_home', title: 'Smart Home', description: 'Control smart home devices.',
    category: 'smart_home', icon: 'home',
    inputSchema: { type: 'object', properties: { device: { type: 'string' }, action: { type: 'string', enum: ['turn_on', 'turn_off', 'set', 'get_status', 'dim', 'list_all'] }, value: { type: 'string' } }, required: ['device', 'action'] },
  },
  {
    name: 'alexa_shopping', title: 'Shopping', description: 'Amazon shopping, orders, cart.',
    category: 'shopping', icon: 'shopping_cart',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, action: { type: 'string', enum: ['search', 'add_to_cart', 'reorder', 'check_orders', 'track_package'] }, quantity: { type: 'number' } }, required: ['query'] },
  },
  {
    name: 'alexa_music', title: 'Music', description: 'Music playback via Amazon Music.',
    category: 'entertainment', icon: 'music_note',
    inputSchema: { type: 'object', properties: { command: { type: 'string', enum: ['play', 'pause', 'next', 'previous', 'volume', 'search', 'queue'] }, query: { type: 'string' }, volume: { type: 'number' } }, required: ['command'] },
  },
  {
    name: 'alexa_calendar', title: 'Calendar', description: 'Manage events, reminders, schedule.',
    category: 'productivity', icon: 'calendar_month',
    inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['add_event', 'list_events', 'set_reminder', 'cancel_event', 'next_event'] }, title: { type: 'string' }, datetime: { type: 'string' }, duration: { type: 'string' } }, required: ['action'] },
  },
  {
    name: 'alexa_news', title: 'News', description: 'Headlines, flash briefings, trending.',
    category: 'information', icon: 'newspaper',
    inputSchema: { type: 'object', properties: { category: { type: 'string', enum: ['top', 'technology', 'business', 'sports', 'entertainment', 'health', 'science'] }, count: { type: 'number' } } },
  },
  {
    name: 'alexa_general_ai', title: 'AI Assistant', description: 'Q&A, reasoning, creative tasks.',
    category: 'ai', icon: 'auto_awesome',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, context: { type: 'string' }, mode: { type: 'string', enum: ['concise', 'detailed', 'creative'] } }, required: ['query'] },
  },
  {
    name: 'alexa_traffic', title: 'Traffic', description: 'Routes, commute, real-time traffic.',
    category: 'information', icon: 'traffic',
    inputSchema: { type: 'object', properties: { origin: { type: 'string' }, destination: { type: 'string' }, mode: { type: 'string', enum: ['driving', 'transit', 'walking'] } }, required: ['destination'] },
  },
  // ── NEW: Orchestration meta-skill ──
  {
    name: 'alexa_routine', title: 'Routines', description: 'Execute multi-skill routines (morning, bedtime, leaving, arriving).',
    category: 'automation', icon: 'auto_mode',
    inputSchema: { type: 'object', properties: { routine: { type: 'string', enum: ['good_morning', 'good_night', 'leaving_home', 'arriving_home', 'custom'] }, steps: { type: 'array', items: { type: 'object' } } }, required: ['routine'] },
  },
  // ── NEW: Ambient data skill ──
  {
    name: 'alexa_ambient', title: 'Ambient Display', description: 'Get ambient dashboard data (clock, weather, events, smart home status).',
    category: 'ambient', icon: 'dashboard',
    inputSchema: { type: 'object', properties: { widgets: { type: 'array', items: { type: 'string', enum: ['clock', 'weather', 'calendar', 'smart_home', 'news_ticker', 'music', 'quote'] } } } },
  },
];

// ─── PREDEFINED ROUTINES ─────────────────────────────────────────────────────
const routineDefinitions = {
  good_morning: {
    name: 'Good Morning',
    icon: 'wb_sunny',
    steps: [
      { skill: 'alexa_smart_home', args: { device: 'bedroom lights', action: 'turn_on' }, label: 'Turn on lights' },
      { skill: 'alexa_weather', args: { location: 'home', units: 'fahrenheit' }, label: 'Check weather' },
      { skill: 'alexa_calendar', args: { action: 'list_events' }, label: 'Today\'s schedule' },
      { skill: 'alexa_news', args: { category: 'top', count: 3 }, label: 'Flash briefing' },
      { skill: 'alexa_traffic', args: { destination: 'work', mode: 'driving' }, label: 'Commute check' },
    ],
  },
  good_night: {
    name: 'Good Night',
    icon: 'bedtime',
    steps: [
      { skill: 'alexa_smart_home', args: { device: 'all lights', action: 'turn_off' }, label: 'Lights off' },
      { skill: 'alexa_smart_home', args: { device: 'front door', action: 'set', value: 'locked' }, label: 'Lock doors' },
      { skill: 'alexa_smart_home', args: { device: 'thermostat', action: 'set', value: '68°F' }, label: 'Set thermostat' },
      { skill: 'alexa_calendar', args: { action: 'next_event' }, label: 'Tomorrow\'s first event' },
      { skill: 'alexa_music', args: { command: 'play', query: 'sleep sounds' }, label: 'Sleep sounds' },
    ],
  },
  leaving_home: {
    name: 'Leaving Home',
    icon: 'directions_car',
    steps: [
      { skill: 'alexa_smart_home', args: { device: 'all lights', action: 'turn_off' }, label: 'Lights off' },
      { skill: 'alexa_smart_home', args: { device: 'thermostat', action: 'set', value: '65°F' }, label: 'Lower thermostat' },
      { skill: 'alexa_smart_home', args: { device: 'front door', action: 'set', value: 'locked' }, label: 'Lock up' },
      { skill: 'alexa_traffic', args: { destination: 'work', mode: 'driving' }, label: 'Check traffic' },
      { skill: 'alexa_weather', args: { location: 'home' }, label: 'Weather check' },
    ],
  },
  arriving_home: {
    name: 'Arriving Home',
    icon: 'home',
    steps: [
      { skill: 'alexa_smart_home', args: { device: 'living room lights', action: 'turn_on' }, label: 'Lights on' },
      { skill: 'alexa_smart_home', args: { device: 'thermostat', action: 'set', value: '72°F' }, label: 'Warm up' },
      { skill: 'alexa_smart_home', args: { device: 'front door', action: 'set', value: 'unlocked' }, label: 'Unlock door' },
      { skill: 'alexa_music', args: { command: 'play', query: 'welcome home playlist' }, label: 'Play music' },
      { skill: 'alexa_shopping', args: { query: 'orders', action: 'check_orders' }, label: 'Check deliveries' },
    ],
  },
};

// ─── SKILL EXECUTORS ──────────────────────────────────────────────────────────
function executeWeatherSkill(args) {
  const { location = 'Seattle', units = 'fahrenheit' } = args;
  const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Clear', 'Thunderstorm', 'Foggy'];
  const condition = conditions[Math.floor(Math.random() * conditions.length)];
  const tempF = Math.floor(45 + Math.random() * 40);
  const temp = units === 'celsius' ? Math.round((tempF - 32) * 5 / 9) : tempF;
  const unit = units === 'celsius' ? 'C' : 'F';
  return {
    location, condition,
    temperature: { value: temp, unit, display: `${temp}°${unit}` },
    feelsLike: { value: temp + (Math.random() > 0.5 ? -3 : 2), unit },
    humidity: Math.floor(35 + Math.random() * 50),
    windMph: Math.floor(3 + Math.random() * 20),
    windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
    uvIndex: Math.floor(1 + Math.random() * 10),
    visibility: Math.floor(5 + Math.random() * 10) + ' mi',
    sunrise: '6:42 AM', sunset: '6:18 PM',
    airQuality: { index: Math.floor(20 + Math.random() * 80), label: Math.random() > 0.5 ? 'Good' : 'Moderate' },
    forecast: [
      { day: 'Tomorrow', highF: tempF + 3, lowF: tempF - 8, condition: 'Partly Cloudy', precip: Math.floor(Math.random() * 40) + '%' },
      { day: 'Wednesday', highF: tempF - 2, lowF: tempF - 10, condition: 'Rainy', precip: Math.floor(60 + Math.random() * 30) + '%' },
      { day: 'Thursday', highF: tempF + 5, lowF: tempF - 3, condition: 'Sunny', precip: Math.floor(Math.random() * 15) + '%' },
      { day: 'Friday', highF: tempF + 1, lowF: tempF - 6, condition: 'Cloudy', precip: Math.floor(20 + Math.random() * 30) + '%' },
      { day: 'Saturday', highF: tempF + 8, lowF: tempF - 1, condition: 'Clear', precip: Math.floor(Math.random() * 10) + '%' },
    ],
    hourly: Array.from({ length: 12 }, (_, i) => ({
      hour: `${(new Date().getHours() + i + 1) % 24}:00`,
      temp: temp + Math.floor(Math.random() * 8 - 4),
      condition: conditions[Math.floor(Math.random() * conditions.length)],
    })),
    message: `It's ${condition.toLowerCase()} in ${location} with a temperature of ${temp}°${unit}.`,
  };
}

function executeSmartHomeSkill(args) {
  const { device, action, value } = args;
  if (action === 'list_all') {
    return {
      action: 'list_all',
      devices: [
        { name: 'Living Room Lights', type: 'light', status: 'on', brightness: 80, room: 'Living Room' },
        { name: 'Bedroom Lights', type: 'light', status: 'off', brightness: 0, room: 'Bedroom' },
        { name: 'Kitchen Lights', type: 'light', status: 'on', brightness: 100, room: 'Kitchen' },
        { name: 'Thermostat', type: 'thermostat', status: 'heating', temperature: '72°F', mode: 'heat', room: 'Hallway' },
        { name: 'Front Door', type: 'lock', status: 'locked', room: 'Entrance' },
        { name: 'Garage Door', type: 'door', status: 'closed', room: 'Garage' },
        { name: 'Security Camera', type: 'camera', status: 'recording', room: 'Porch' },
        { name: 'Echo Dot', type: 'speaker', status: 'idle', volume: 50, room: 'Bedroom' },
      ],
      message: 'Here are all your connected devices.',
    };
  }
  const msgs = {
    turn_on: `✅ Turned on ${device}.`,
    turn_off: `✅ Turned off ${device}.`,
    set: `✅ Set ${device} to ${value}.`,
    dim: `✅ Dimmed ${device} to ${value || '50%'}.`,
    get_status: `ℹ️ ${device} is currently active.`,
  };
  return {
    device, action, value, success: true,
    powerDraw: Math.floor(5 + Math.random() * 60) + 'W',
    message: msgs[action] || `Action ${action} performed on ${device}.`,
    timestamp: new Date().toISOString(),
  };
}

function executeShoppingSkill(args) {
  const { query, action = 'search', quantity = 1 } = args;
  if (action === 'check_orders' || action === 'track_package') {
    return {
      action, orders: [
        { orderId: '113-4521967-2803447', item: 'Echo Dot (5th Gen)', status: 'Delivered', date: 'Oct 3', tracking: 'TBA123456789', eta: null },
        { orderId: '112-9834521-7634012', item: 'USB-C Cable 6ft (3-pack)', status: 'Out for Delivery', date: 'Today by 8pm', tracking: 'TBA987654321', eta: '2 hours', progress: 85 },
        { orderId: '111-2341234-1234567', item: 'Coffee Beans 2lb Organic', status: 'Shipped', date: 'Oct 11', tracking: 'TBA456789123', eta: '2 days', progress: 45 },
      ],
      message: 'Here are your recent Amazon orders.',
    };
  }
  if (action === 'add_to_cart' || action === 'reorder') {
    return { action, item: query, quantity, estimatedDelivery: 'Tomorrow by 8pm', price: '$24.99', savedAmount: '$5.00', success: true, message: `${action === 'reorder' ? 'Reordered' : 'Added'} ${quantity}x "${query}".` };
  }
  return {
    action: 'search', query,
    results: [
      { title: `${query} - Premium Edition`, price: '$29.99', originalPrice: '$39.99', rating: 4.7, reviews: 2847, prime: true, badge: 'Best Seller', image: null },
      { title: `${query} - Standard`, price: '$19.99', rating: 4.3, reviews: 1256, prime: true, badge: 'Amazon Choice', image: null },
      { title: `${query} - Value Bundle (2-pack)`, price: '$34.99', rating: 4.1, reviews: 523, prime: false, badge: null, image: null },
    ],
    message: `Found results for "${query}".`,
  };
}

function executeMusicSkill(args) {
  const { command, query, volume } = args;
  if (command === 'play') {
    const tracks = [
      { title: 'Levitating', artist: 'Dua Lipa', album: 'Future Nostalgia', duration: '3:23', year: 2020 },
      { title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', duration: '3:20', year: 2020 },
      { title: 'Shape of You', artist: 'Ed Sheeran', album: '÷ (Divide)', duration: '3:53', year: 2017 },
    ];
    const track = tracks[Math.floor(Math.random() * tracks.length)];
    return {
      command, nowPlaying: { ...track, progress: 0, isPlaying: true },
      queue: tracks.filter(t => t.title !== track.title).slice(0, 2),
      playlist: query || 'Your Daily Mix',
      message: `Now playing "${track.title}" by ${track.artist}.`,
    };
  }
  if (command === 'volume') return { command, newVolume: volume || 70, previousVolume: 50, message: `Volume set to ${volume || 70}%.` };
  if (command === 'queue') return { command, queue: [{ title: 'Anti-Hero', artist: 'Taylor Swift', duration: '3:20' }, { title: 'Flowers', artist: 'Miley Cyrus', duration: '3:21' }], message: 'Here\'s your queue.' };
  return { command, success: true, message: `Music ${command} executed.` };
}

function executeCalendarSkill(args) {
  const { action, title, datetime, duration } = args;
  const events = [
    { id: '1', title: 'Team Standup', time: 'Today, 9:00 AM', duration: '30 min', location: 'Zoom', color: '#4285f4', attendees: 5 },
    { id: '2', title: 'Design Review', time: 'Today, 11:00 AM', duration: '1 hour', location: 'Conference Room B', color: '#ea4335', attendees: 8 },
    { id: '3', title: 'Lunch with Sarah', time: 'Today, 12:30 PM', duration: '1 hour', location: 'Café Milano', color: '#34a853', attendees: 2 },
    { id: '4', title: 'Dentist Appointment', time: 'Tomorrow, 2:00 PM', duration: '1 hour', location: '123 Medical Dr', color: '#fbbc04', attendees: 1 },
    { id: '5', title: 'Grocery Shopping', time: 'Friday, 5:00 PM', duration: '1 hour', location: 'Whole Foods', color: '#34a853', attendees: 1 },
  ];
  if (action === 'list_events') return { action, events, freeSlots: ['Today 2-5 PM', 'Tomorrow 9-11 AM'], message: `You have ${events.length} upcoming events.` };
  if (action === 'next_event') return { action, event: events[0], timeUntil: '45 minutes', message: `Your next event is "${events[0].title}" in 45 minutes.` };
  return { action, success: true, event: { id: randomUUID().slice(0, 8), title: title || 'New Event', datetime: datetime || 'Tomorrow at 12pm', duration: duration || '1 hour' }, message: `${action === 'set_reminder' ? 'Reminder' : 'Event'} "${title}" created for ${datetime || 'tomorrow'}.` };
}

function executeNewsSkill(args) {
  const { category = 'top', count = 5 } = args;
  const allHeadlines = {
    top: [
      { title: 'Global Climate Summit Reaches Historic Net-Zero Agreement', source: 'Reuters', time: '2h ago', sentiment: 'positive', breaking: true },
      { title: 'SpaceX Starship Successfully Lands on Mars Surface', source: 'CNN', time: '3h ago', sentiment: 'positive', breaking: true },
      { title: 'Federal Reserve Signals Rate Cuts in Q1 2027', source: 'Bloomberg', time: '4h ago', sentiment: 'neutral' },
      { title: 'AI-Powered Drug Discovery Cures Rare Genetic Disease', source: 'NYT', time: '5h ago', sentiment: 'positive' },
      { title: 'Amazon Alexa+ Reaches 500M Active Users Worldwide', source: 'TechCrunch', time: '6h ago', sentiment: 'positive' },
    ],
    technology: [
      { title: 'Apple Vision Pro 3 Achieves True Holographic Display', source: 'The Verge', time: '1h ago', sentiment: 'positive' },
      { title: 'MCP Protocol Adopted by 95% of AI Assistants', source: 'Wired', time: '2h ago', sentiment: 'positive' },
      { title: 'Quantum Supremacy: 10,000 Qubit Processor Unveiled', source: 'MIT Tech Review', time: '3h ago', sentiment: 'positive' },
      { title: 'Self-Driving Cars Now Legal in All 50 States', source: 'Reuters', time: '4h ago', sentiment: 'neutral' },
      { title: 'Brain-Computer Interface Passes FDA Approval', source: 'Nature', time: '5h ago', sentiment: 'positive' },
    ],
    sports: [
      { title: 'Seattle Seahawks Clinch NFC Championship Berth', source: 'ESPN', time: '1h ago', sentiment: 'positive' },
      { title: 'LeBron James Jr. Selected #1 in NBA Draft', source: 'NBA.com', time: '3h ago', sentiment: 'positive' },
      { title: 'Djokovic Completes Calendar Grand Slam at 40', source: 'Tennis.com', time: '5h ago', sentiment: 'positive' },
    ],
  };
  const articles = (allHeadlines[category] || allHeadlines.top).slice(0, count);
  return { category, articles, count: articles.length, trending: ['#MCP', '#AlexaPlus', '#AI', '#Mars'], message: `Top ${articles.length} ${category} headlines.`, lastUpdated: new Date().toISOString() };
}

function executeGeneralAISkill(args) {
  const { query, mode = 'concise' } = args;
  const q = query.toLowerCase();
  if (q.includes('mcp') || q.includes('model context protocol')) return { response: 'The Model Context Protocol (MCP) is an open standard by Anthropic enabling AI assistants to securely connect with external tools. It uses JSON-RPC 2.0 over Streamable HTTP or stdio transports. Key features include Agent Skills (tools), Resources, Prompts, and session management. This server implements MCP 2025-11-25 with multi-skill orchestration — a standout feature allowing chained skill execution.', sources: ['modelcontextprotocol.io'], confidence: 0.98, tokens: 85 };
  if (q.includes('time') || q.includes('date')) return { response: `It is currently ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}.`, confidence: 1.0, tokens: 12 };
  if (q.includes('joke')) {
    const jokes = ['Why don\'t scientists trust atoms? Because they make up everything!', 'I told my wife she should embrace her mistakes. She gave me a hug.', 'Why did the scarecrow win an award? He was outstanding in his field!', 'What do you call a fake noodle? An impasta!', 'I\'m reading a book about anti-gravity. It\'s impossible to put down!'];
    return { response: jokes[Math.floor(Math.random() * jokes.length)], confidence: 1.0, tokens: 20 };
  }
  return { response: `As Alexa+ with advanced AI, I can help with weather, smart home, shopping, music, news, calendar, traffic, and multi-skill routines. This MCP integration supports conversational memory, so I remember context from our conversation. What would you like to know?`, confidence: 0.85, tokens: 45 };
}

function executeTrafficSkill(args) {
  const { origin = 'Home', destination, mode = 'driving' } = args;
  const dist = (3 + Math.random() * 25).toFixed(1);
  const base = Math.floor(12 + Math.random() * 40);
  const delay = Math.floor(Math.random() * 18);
  const incidents = Math.random() > 0.5;
  return {
    origin, destination, mode,
    distance: dist + ' mi', estimatedTime: (base + delay) + ' min', normalTime: base + ' min',
    delay: delay > 5 ? `+${delay} min` : 'No delays',
    trafficLevel: delay > 12 ? 'Heavy' : delay > 5 ? 'Moderate' : 'Light',
    incidents: incidents ? [{ type: 'accident', location: 'I-5 N near exit 169', severity: 'minor', delay: `${Math.floor(5 + Math.random() * 10)} min` }] : [],
    alternateRoute: delay > 8 ? { via: 'SR-99', time: (base + Math.floor(delay * 0.5)) + ' min', savings: Math.floor(delay * 0.5) + ' min faster' } : null,
    message: `${base + delay} minutes to ${destination} by ${mode}.${delay > 5 ? ` ${delay}-min delay.` : ' Traffic clear.'}`,
  };
}

// ── NEW: Routine executor ──
function executeRoutineSkill(args) {
  const { routine } = args;
  const def = routineDefinitions[routine];
  if (!def) return { error: true, message: `Unknown routine: ${routine}` };

  const results = def.steps.map((step, i) => {
    const data = executeSkill(step.skill, step.args);
    return { step: i + 1, label: step.label, skill: step.skill, result: data, status: 'completed' };
  });

  return {
    routine, name: def.name, icon: def.icon,
    totalSteps: results.length,
    completedSteps: results.length,
    results,
    startedAt: new Date(Date.now() - 3000).toISOString(),
    completedAt: new Date().toISOString(),
    executionTime: '2.8s',
    message: `"${def.name}" routine completed. ${results.length} actions executed successfully.`,
  };
}

// ── NEW: Ambient dashboard data ──
function executeAmbientSkill(args) {
  const { widgets = ['clock', 'weather', 'calendar', 'smart_home', 'news_ticker', 'quote'] } = args;
  const data = {};
  if (widgets.includes('clock')) data.clock = { time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }), timezone: 'PST' };
  if (widgets.includes('weather')) data.weather = executeWeatherSkill({ location: 'Home' });
  if (widgets.includes('calendar')) data.calendar = executeCalendarSkill({ action: 'list_events' });
  if (widgets.includes('smart_home')) data.smart_home = executeSmartHomeSkill({ device: 'all', action: 'list_all' });
  if (widgets.includes('news_ticker')) data.news_ticker = executeNewsSkill({ category: 'top', count: 5 });
  if (widgets.includes('quote')) {
    const quotes = [
      { text: 'The best way to predict the future is to invent it.', author: 'Alan Kay' },
      { text: 'Innovation distinguishes between a leader and a follower.', author: 'Steve Jobs' },
      { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
      { text: 'Stay hungry, stay foolish.', author: 'Stewart Brand' },
      { text: 'Move fast and break things.', author: 'Mark Zuckerberg' },
    ];
    data.quote = quotes[Math.floor(Math.random() * quotes.length)];
  }
  if (widgets.includes('music')) data.music = executeMusicSkill({ command: 'play', query: 'ambient' });
  return { widgets: Object.keys(data), data, message: 'Ambient dashboard data loaded.', refreshInterval: 30000 };
}

function executeSkill(name, args) {
  switch (name) {
    case 'alexa_weather': return executeWeatherSkill(args);
    case 'alexa_smart_home': return executeSmartHomeSkill(args);
    case 'alexa_shopping': return executeShoppingSkill(args);
    case 'alexa_music': return executeMusicSkill(args);
    case 'alexa_calendar': return executeCalendarSkill(args);
    case 'alexa_news': return executeNewsSkill(args);
    case 'alexa_general_ai': return executeGeneralAISkill(args);
    case 'alexa_traffic': return executeTrafficSkill(args);
    case 'alexa_routine': return executeRoutineSkill(args);
    case 'alexa_ambient': return executeAmbientSkill(args);
    default: throw { code: -32602, message: `Unknown tool: ${name}` };
  }
}

// ─── MCP HANDLERS ─────────────────────────────────────────────────────────────
function processMCPMessage(msg, req) {
  const { jsonrpc, id, method, params } = msg;
  if (jsonrpc !== '2.0') return { jsonrpc: '2.0', id: id ?? null, error: { code: -32600, message: 'Invalid Request' } };

  try {
    let result, _sessionId = null;

    switch (method) {
      case 'initialize': {
        _sessionId = randomUUID();
        sessions.set(_sessionId, { id: _sessionId, createdAt: new Date().toISOString(), clientInfo: params?.clientInfo || {} });
        conversationMemory.set(_sessionId, []);
        result = {
          protocolVersion: MCP_VERSION, serverInfo: SERVER_INFO,
          capabilities: {
            tools: { listChanged: true },
            resources: { listChanged: false },
            prompts: { listChanged: false },
            logging: {},
            experimental: {
              multiSkillOrchestration: true,
              proactiveNotifications: true,
              conversationalMemory: true,
              ambientMode: true,
              routineAutomation: true,
            },
          },
        };
        // Schedule proactive notifications for this session
        scheduleProactiveNotifications(_sessionId);
        break;
      }
      case 'notifications/initialized':
        return { type: 'notification' };

      case 'tools/list':
        result = {
          tools: agentSkills.map(s => ({
            name: s.name, title: s.title, description: s.description,
            inputSchema: s.inputSchema,
            annotations: { category: s.category, icon: s.icon, agentSkill: true },
          })),
        };
        break;

      case 'tools/call': {
        const sessionId = req.headers['mcp-session-id'];
        const data = executeSkill(params.name, params.arguments || {});

        // Store in conversation memory
        if (sessionId && conversationMemory.has(sessionId)) {
          const mem = conversationMemory.get(sessionId);
          mem.push({ role: 'tool', skill: params.name, args: params.arguments, result: data.message, timestamp: Date.now() });
          if (mem.length > 50) mem.splice(0, mem.length - 50); // Keep last 50
        }

        result = {
          content: [
            { type: 'text', text: data.message || JSON.stringify(data) },
            { type: 'resource', resource: { uri: `alexa://skill/${params.name}/result`, mimeType: 'application/json', text: JSON.stringify(data) } },
          ],
          isError: false,
          _meta: { skill: params.name, data, executionTimeMs: Math.floor(100 + Math.random() * 400) },
        };
        break;
      }

      case 'resources/list':
        result = {
          resources: [
            ...agentSkills.map(s => ({ uri: `alexa://skill/${s.name}`, name: s.title, description: s.description, mimeType: 'application/json' })),
            { uri: 'alexa://routines', name: 'Routines', description: 'Available automation routines', mimeType: 'application/json' },
            { uri: 'alexa://memory', name: 'Conversation Memory', description: 'Session conversation history', mimeType: 'application/json' },
          ],
        };
        break;

      case 'resources/read': {
        const uri = params?.uri;
        if (uri === 'alexa://routines') {
          result = { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(routineDefinitions) }] };
        } else if (uri === 'alexa://memory') {
          const sid = req.headers['mcp-session-id'];
          const mem = sid ? conversationMemory.get(sid) || [] : [];
          result = { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(mem) }] };
        } else {
          result = { contents: [{ uri, mimeType: 'application/json', text: '{}' }] };
        }
        break;
      }

      case 'prompts/list':
        result = { prompts: [
          { name: 'alexa_greeting', description: 'Alexa+ greeting' },
          { name: 'morning_briefing', description: 'Morning briefing prompt' },
        ] };
        break;

      case 'ping':
        result = {};
        break;

      default:
        return { jsonrpc: '2.0', id: id ?? null, error: { code: -32601, message: `Method not found: ${method}` } };
    }

    return { jsonrpc: '2.0', id, result, _sessionId };
  } catch (err) {
    return { jsonrpc: '2.0', id: id ?? null, error: { code: err.code ?? -32603, message: err.message ?? 'Internal error' } };
  }
}

// ─── PROACTIVE NOTIFICATIONS (via SSE push) ────────────────────────────────
function scheduleProactiveNotifications(sessionId) {
  const notifications = [
    { delay: 15000, type: 'delivery', data: { title: '📦 Package Update', body: 'Your USB-C Cable 6ft is out for delivery. Arriving by 8 PM.', icon: 'local_shipping', priority: 'medium', actionable: true } },
    { delay: 35000, type: 'reminder', data: { title: '⏰ Reminder', body: 'Team Standup starts in 15 minutes.', icon: 'alarm', priority: 'high', actionable: true } },
    { delay: 55000, type: 'weather_alert', data: { title: '🌧️ Weather Alert', body: 'Rain expected in 2 hours. Consider bringing an umbrella.', icon: 'umbrella', priority: 'low', actionable: false } },
    { delay: 75000, type: 'smart_home', data: { title: '🏠 Smart Home', body: 'Front door was unlocked for 30 minutes. Would you like to lock it?', icon: 'lock_open', priority: 'high', actionable: true } },
    { delay: 95000, type: 'deal', data: { title: '🔥 Lightning Deal', body: 'Echo Show 15 is 40% off for the next 2 hours!', icon: 'local_offer', priority: 'low', actionable: true } },
  ];

  notifications.forEach(({ delay, type, data }) => {
    setTimeout(() => {
      const conns = sseConnections.get(sessionId);
      if (conns && conns.size > 0) {
        const notification = {
          jsonrpc: '2.0',
          method: 'notifications/proactive',
          params: { type, ...data, timestamp: new Date().toISOString(), id: randomUUID().slice(0, 8) },
        };
        conns.forEach(res => {
          try {
            const eid = randomUUID();
            res.write(`id: ${eid}\nevent: notification\ndata: ${JSON.stringify(notification)}\n\n`);
          } catch (e) { /* connection closed */ }
        });
      }
    }, delay);
  });
}

// ─── MCP ENDPOINT ──────────────────────────────────────────────────────────────
app.all('/mcp', (req, res) => {
  const origin = req.headers.origin;
  if (origin && origin !== 'null' && !origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
    return res.status(403).json({ error: 'Forbidden: Invalid Origin' });
  }

  if (req.method === 'GET') {
    if (!(req.headers.accept || '').includes('text/event-stream')) return res.status(405).send();
    const sessionId = req.headers['mcp-session-id'];
    if (sessionId && !sessions.has(sessionId)) return res.status(404).json({ error: 'Session not found' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    if (sessionId) {
      if (!sseConnections.has(sessionId)) sseConnections.set(sessionId, new Set());
      sseConnections.get(sessionId).add(res);
    }

    const primeId = randomUUID();
    res.write(`id: ${primeId}\ndata: \n\n`);
    res.write(`event: open\ndata: ${JSON.stringify({ serverInfo: SERVER_INFO, capabilities: { proactiveNotifications: true } })}\n\n`);

    const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch (e) { clearInterval(ping); } }, 25000);
    req.on('close', () => {
      clearInterval(ping);
      if (sessionId && sseConnections.has(sessionId)) sseConnections.get(sessionId).delete(res);
    });
    return;
  }

  if (req.method === 'DELETE') {
    const sessionId = req.headers['mcp-session-id'];
    if (sessionId && sessions.has(sessionId)) {
      sessions.delete(sessionId);
      conversationMemory.delete(sessionId);
      sseConnections.get(sessionId)?.forEach(r => { try { r.end(); } catch (e) {} });
      sseConnections.delete(sessionId);
      return res.status(200).json({ message: 'Session terminated' });
    }
    return res.status(404).json({ error: 'Session not found' });
  }

  if (req.method !== 'POST') return res.status(405).send();

  const body = req.body;
  const sessionId = req.headers['mcp-session-id'];
  if (body.method !== 'initialize' && body.method !== 'notifications/initialized' && sessionId && !sessions.has(sessionId)) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const msg = processMCPMessage(body, req);
  if (msg.type === 'notification') return res.status(202).send();

  // SSE streaming for tool calls and routine execution
  const wantsSSE = (req.headers.accept || '').includes('text/event-stream') && (body.method === 'tools/call');
  const isRoutine = body.params?.name === 'alexa_routine';

  if (wantsSSE) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('MCP-Protocol-Version', MCP_VERSION);
    if (msg._sessionId) res.setHeader('MCP-Session-Id', msg._sessionId);
    res.flushHeaders();

    const streamId = randomUUID();
    res.write(`id: ${streamId}\ndata: \n\n`);

    const send = (delay, evt, data, evtId) => new Promise(r => setTimeout(() => {
      try { res.write(`id: ${streamId}-${evtId}\nevent: ${evt}\ndata: ${JSON.stringify(data)}\n\n`); } catch (e) {}
      r();
    }, delay));

    (async () => {
      if (isRoutine && msg.result?._meta?.data?.results) {
        // Stream each routine step individually
        const routineData = msg.result._meta.data;
        await send(100, 'progress', { message: `Starting "${routineData.name}" routine...`, progress: 5, phase: 'init' }, 0);

        for (let i = 0; i < routineData.results.length; i++) {
          const step = routineData.results[i];
          const pct = Math.round(((i + 1) / routineData.results.length) * 90) + 5;
          await send(400, 'step', {
            step: i + 1, total: routineData.results.length,
            label: step.label, skill: step.skill,
            result: step.result, status: 'completed', progress: pct,
          }, i + 1);
        }

        await send(200, 'progress', { message: 'Routine complete!', progress: 100, phase: 'done' }, 'final');
      } else {
        await send(80, 'progress', { message: 'Processing...', progress: 20, phase: 'parse' }, 1);
        await send(150, 'progress', { message: 'Executing skill...', progress: 55, phase: 'execute' }, 2);
        await send(120, 'progress', { message: 'Building response...', progress: 85, phase: 'format' }, 3);
      }

      const { _sessionId, ...resp } = msg;
      await send(100, 'message', resp, 'result');
      res.write('event: done\ndata: {}\n\n');
      res.end();
    })();
    return;
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('MCP-Protocol-Version', MCP_VERSION);
  if (msg._sessionId) res.setHeader('MCP-Session-Id', msg._sessionId);
  const { _sessionId, ...resp } = msg;
  res.status(200).json(resp);
});

// ─── METADATA ENDPOINTS ──────────────────────────────────────────────────────
app.get('/skills', (req, res) => res.json({ protocol: 'mcp-agent-skills', version: '2026-01-26', serverInfo: SERVER_INFO, skills: agentSkills, routines: Object.keys(routineDefinitions) }));
app.get('/routines', (req, res) => res.json(routineDefinitions));
app.get('/health', (req, res) => res.json({ status: 'ok', server: SERVER_INFO, sessions: sessions.size, skills: agentSkills.length, transport: 'streamable-http', mcpVersion: MCP_VERSION, features: ['multi-skill-orchestration', 'proactive-notifications', 'conversational-memory', 'ambient-mode', 'routine-automation'], timestamp: new Date().toISOString() }));

app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🚀 Alexa+ MCP Server v2.0 running at http://127.0.0.1:${PORT}`);
  console.log(`   📡 MCP Endpoint:  /mcp (Streamable HTTP + SSE)`);
  console.log(`   🛠️  Agent Skills: /skills (${agentSkills.length} skills)`);
  console.log(`   🔄 Routines:     /routines (${Object.keys(routineDefinitions).length} routines)`);
  console.log(`   ❤️  Health:       /health`);
  console.log(`\n   ✨ Features: Orchestration · Proactive Notifications · Memory · Ambient Mode\n`);
});
