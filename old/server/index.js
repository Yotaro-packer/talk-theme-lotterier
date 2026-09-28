import express from 'express';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'data.json');
const PORT = process.env.PORT || 3001;
const WEEK_LENGTH = 7;

async function loadData() {
  if (!existsSync(DATA_FILE)) {
    return { themes: [], assignments: {}, dayOffset: 0 };
  }
  const raw = await readFile(DATA_FILE, 'utf-8');
  const data = JSON.parse(raw);
  if (typeof data.dayOffset !== 'number') data.dayOffset = 0;
  return data;
}

async function saveData(data) {
  await writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// offsetDays is relative to "today"; dayOffset lets tests simulate the
// passage of time (via /api/dev/advance-day) without touching the system clock.
function dateStr(offsetDays, dayOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset + offsetDays);
  return d.toISOString().slice(0, 10);
}

// Randomly assigns a theme to any of the next WEEK_LENGTH days that don't
// have one yet, so "today" and "this week" stay stable across reloads.
// Themes already assigned elsewhere in the same week are avoided as long as
// the pool is large enough, so the week view doesn't show duplicates.
function ensureAssignments(data) {
  let changed = false;
  const weekDates = Array.from({ length: WEEK_LENGTH }, (_, i) => dateStr(i, data.dayOffset));
  const assignedThisWeek = new Set(
    weekDates.map((d) => data.assignments[d]).filter(Boolean)
  );

  for (const date of weekDates) {
    if (data.assignments[date] || data.themes.length === 0) continue;

    let candidates = data.themes.filter((t) => !assignedThisWeek.has(t.id));
    if (candidates.length === 0) candidates = data.themes; // pool smaller than a week

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    data.assignments[date] = pick.id;
    assignedThisWeek.add(pick.id);
    changed = true;
  }
  return changed;
}

function withTheme(data, date) {
  const themeId = data.assignments[date];
  const theme = data.themes.find((t) => t.id === themeId) || null;
  return { date, theme };
}

const app = express();
app.use(express.json());

app.get('/api/themes', async (req, res) => {
  const data = await loadData();
  res.json(data.themes);
});

app.post('/api/themes', async (req, res) => {
  const { text, author } = req.body ?? {};
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }
  const data = await loadData();
  const theme = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text: text.trim().slice(0, 200),
    author: typeof author === 'string' ? author.trim().slice(0, 50) : '',
    createdAt: new Date().toISOString(),
  };
  data.themes.push(theme);
  await saveData(data);
  res.status(201).json(theme);
});

app.get('/api/today', async (req, res) => {
  const data = await loadData();
  if (ensureAssignments(data)) await saveData(data);
  res.json({ ...withTheme(data, dateStr(0, data.dayOffset)), dayOffset: data.dayOffset });
});

app.get('/api/week', async (req, res) => {
  const data = await loadData();
  if (ensureAssignments(data)) await saveData(data);
  const week = [];
  for (let i = 0; i < WEEK_LENGTH; i++) {
    week.push(withTheme(data, dateStr(i, data.dayOffset)));
  }
  res.json(week);
});

// Testing helpers: simulate the passage of time without touching the system
// clock, so day-to-day rotation can be verified on demand.
app.post('/api/dev/advance-day', async (req, res) => {
  const data = await loadData();
  data.dayOffset += 1;
  await saveData(data);
  res.json({ dayOffset: data.dayOffset });
});

app.post('/api/dev/reset-day', async (req, res) => {
  const data = await loadData();
  data.dayOffset = 0;
  await saveData(data);
  res.json({ dayOffset: data.dayOffset });
});

// In production, serve the built frontend from the same process.
const distDir = path.join(__dirname, '..', 'dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
