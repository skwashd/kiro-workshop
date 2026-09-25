# Pulse

A minimalist timing game. A glowing pulse ring expands and contracts from the center of a circular arena. Colored target rings appear at random radii and fade over time. **Click, tap, or press Space** when the pulse aligns with a target ring to score.

New players can choose **Try the guided demo** (or **How to play**) for a short,
consequence-free practice round. It introduces the moving pulse, target
alignment, timing feedback, and streaks before offering a real round. Demo
results are never submitted to the high-score table.

## How scoring works

Each hit earns **10–100 points** based on timing accuracy — the closer the pulse is to the target ring's exact radius, the higher the score. Accuracy is calculated as the proportion of the tolerance window you used:

- **Perfect** (>90% accuracy): ~90–100 points
- **Great** (>60%): ~50–80 points
- **OK**: 10–40 points

A **streak multiplier** rewards consistency: 3+ consecutive hits give 1.2x, 5+ give 1.5x. Missing a target (pulsing when too far away, or letting a ring expire) costs a life and resets the streak. You start with **3 lives**; losing all three ends the round.

Difficulty increases as you play — the pulse speeds up, targets appear faster, and they fade more quickly, raising the skill ceiling for experienced players.

**Score range:** 0–999,999 (validated on submission).

## Setup and run

Requires **Node.js 18+**.

```bash
npm install --production
npm start
```

The server listens on `127.0.0.1` at the port set by the `PORT` environment variable (default `3000`). The start command stays in the foreground.

```bash
PORT=8080 node server.js
```

Open the printed URL in a browser to play.

## Hosting notes

- All page URLs (assets, API calls) are **relative** — works behind a reverse proxy at any path prefix.
- No CDN, external fonts, or third-party scripts.
- No cookies, localStorage, or sessionStorage required.
- CORS enabled for cross-origin/sandboxed embedding.
- Score form uses `fetch` with `preventDefault` — no native form navigation.
- Scores are stored in an **SQLite** database (`scores.db` in the working directory, or set `DB_PATH`). Data survives restarts.

## API

| Method | Path          | Description                  |
|--------|---------------|------------------------------|
| GET    | `api/scores`  | Top 20 scores (JSON array)   |
| POST   | `api/scores`  | Submit `{ name, score }`     |

### POST validation

- `name`: non-empty string, max 20 characters (trimmed)
- `score`: integer, 0–999,999
- Invalid submissions return `400` with `{ error: "..." }`

### Response format

```json
[
  { "name": "Alice", "score": 850, "created_at": "2026-09-25 12:00:00" }
]
```

## Controls

| Input              | Action          |
|--------------------|-----------------|
| Click / Tap        | Pulse (hit)     |
| Space              | Pulse (hit)     |
| Name field + Enter | Submit score    |
| Play Again button  | Restart         |
