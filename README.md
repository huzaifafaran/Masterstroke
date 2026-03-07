# Masterstroke

## LLM Tactical Brain (Optional)

The game supports an optional LLM tactical planner for AI batting/bowling plans. The API key is read from `.env` by a local proxy, not from frontend code.

### Setup

1. Copy `.env.example` to `.env` and fill `OPENAI_API_KEY`.
2. Start proxy:
   - `node server/tacticalProxy.js`
3. In `index.html`, set:
   - `window.GAME_LLM_CONFIG.enabled = true`
4. Run the game as usual (your static server for `index.html`).

### Fast local fallback (if `.env` is not loading)

1. Copy `server/.openai_key.example` to `server/.openai_key`
2. Put only the raw key text in that file.
3. Start proxy: `node server/tacticalProxy.js`
4. Verify status: `http://localhost:8787/health`
