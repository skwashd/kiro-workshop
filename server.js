const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'scores.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const insertScore = db.prepare('INSERT INTO scores (name, score) VALUES (?, ?)');
const topScores = db.prepare('SELECT name, score, created_at FROM scores ORDER BY score DESC, created_at ASC LIMIT 20');

const app = express();

app.use(cors());
app.options('*', cors());

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/scores', (_req, res) => {
  const rows = topScores.all();
  res.json(rows);
});

app.post('/api/scores', (req, res) => {
  const { name, score } = req.body;

  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required and must be a non-empty string.' });
  }
  if (name.trim().length > 20) {
    return res.status(400).json({ error: 'Name must be 20 characters or fewer.' });
  }
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 999999) {
    return res.status(400).json({ error: 'Score must be an integer between 0 and 999999.' });
  }

  const trimmed = name.trim();
  const info = insertScore.run(trimmed, score);
  res.status(201).json({ id: info.lastInsertRowid, name: trimmed, score });
});

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`Pulse game running at http://127.0.0.1:${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => { db.close(); process.exit(0); });
});
process.on('SIGINT', () => {
  server.close(() => { db.close(); process.exit(0); });
});
