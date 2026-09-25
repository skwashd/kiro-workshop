# Orbit Lock

A precision-timing browser game where you break through rotating concentric rings by firing a pulse through their gaps.

## How to Play

A targeting beam rotates around the center core. Concentric rings orbit at different speeds, each with a gap. Press **SPACE** or **tap/click the canvas** to fire a pulse along the beam's current direction. If the pulse reaches the next ring's gap, you break through and advance. Miss the gap and the signal is lost — game over.

## How Scoring Works

- Each ring cleared earns `(ring_number) x 100` base points (Ring 1 = 100, Ring 2 = 200, etc.)
- **Precision bonus**: hitting closer to the center of the gap earns up to an equal amount again (e.g., a perfect center hit on Ring 5 earns 500 base + 500 precision = 1000)
- Clearing all 12 rings awards a **5000-point completion bonus**
- Maximum theoretical score: 20,600 (all 12 rings, perfect precision, plus completion bonus)

## Setup & Run

Requires **Node.js 22**.

```bash
npm install
npm start
```

The server listens on `PORT` (environment variable) or **3000** by default, on `127.0.0.1`.

Open `http://127.0.0.1:3000` in a browser to play.

## Start Command

```
PORT=3000 node server.js
```

The process stays in the foreground and serves both the game page and the score API.

## API

### `GET api/scores`
Returns the top 10 scores as a JSON array, ordered by score descending.

### `POST api/scores`
Submit a score. Body (JSON):
```json
{
  "name": "Player",
  "score": 1500,
  "rings_cleared": 5
}
```
Validation:
- `name`: non-empty string, max 20 characters
- `score`: integer 0–999999
- `rings_cleared`: integer 0–999

Returns `201` on success, `400` with `{ "error": "..." }` on invalid input.

## Persistence

Scores are stored in an SQLite database (`scores.db`) in the project directory. This file persists across server restarts. Set `DB_PATH` env var to change the database location.

## Hosting Notes

- All URLs are relative (no root-absolute paths) — works behind a reverse proxy with a path prefix
- No external CDN, fonts, or third-party scripts — fully self-contained
- CORS enabled for cross-origin API access (sandboxed iframe support)
- No cookies, localStorage, or sessionStorage required
- Form submission handled via JavaScript `fetch` with `preventDefault()` — no native form navigation
- Keyboard events during name input are captured and do not trigger gameplay actions
