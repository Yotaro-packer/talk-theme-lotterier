import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as state from './state.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const pidFile = path.join(__dirname, '..', '.server.pid');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(publicDir));

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'monitor.html'));
});

app.get('/api/state', (_req, res) => {
  res.json(state.getState());
});

app.post('/api/themes', (req, res) => {
  try {
    state.submitTheme(req.body?.text);
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post('/api/end-business-day', (_req, res) => {
  res.json(state.endBusinessDay());
});

const server = app.listen(PORT, () => {
  fs.writeFileSync(pidFile, String(process.pid));
  console.log(`サーバーを起動しました: http://localhost:${PORT}/`);
  console.log(`投稿フォーム: http://localhost:${PORT}/form.html`);
  console.log('Ctrl+C または `npm stop` で停止できます');
});

function shutdown() {
  if (fs.existsSync(pidFile)) {
    fs.unlinkSync(pidFile);
  }
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
