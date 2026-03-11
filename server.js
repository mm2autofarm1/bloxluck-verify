const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const http = require('http');
const WebSocket = require('ws');

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ====== GLOBAL ROULETTE TIMER ======
const COUNTDOWN_MS = 15000;
const SPIN_MS = 11000;
const ROUND_MS = COUNTDOWN_MS + SPIN_MS;

function seededRand(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function getRoundState() {
  const now = Date.now();
  const roundId = Math.floor(now / ROUND_MS);
  const pos = now % ROUND_MS;
  const winIdx = 28 + Math.floor(seededRand(roundId * 999) * 12);

  if (pos < COUNTDOWN_MS) {
    return { phase: 'countdown', roundId, remaining: parseFloat(((COUNTDOWN_MS - pos) / 1000).toFixed(2)), winIdx };
  } else {
    return { phase: 'spinning', roundId, spinElapsed: parseFloat(((pos - COUNTDOWN_MS) / 1000).toFixed(2)), winIdx };
  }
}

// Broadcast every 100ms
setInterval(() => {
  const msg = JSON.stringify(getRoundState());
  wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
}, 100);

wss.on('connection', ws => ws.send(JSON.stringify(getRoundState())));

// ====== ROBLOX VERIFY ======
app.get('/verify', async (req, res) => {
  const { username, code } = req.query;
  if (!username || !code) return res.json({ success: false, error: 'Missing params' });
  try {
    const r1 = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
    });
    const d1 = await r1.json();
    if (!d1.data || !d1.data[0]) return res.json({ success: false, error: 'Roblox user not found.' });
    const userId = d1.data[0].id;
    const r2 = await fetch(`https://users.roblox.com/v1/users/${userId}`);
    const d2 = await r2.json();
    const desc = (d2.description || '').toLowerCase();
    if (desc.includes(code.toLowerCase())) {
      res.json({ success: true });
    } else {
      res.json({ success: false, error: 'Code not found in your Roblox bio. Make sure you saved it!' });
    }
  } catch (e) {
    res.json({ success: false, error: 'Server error: ' + e.message });
  }
});

app.get('/', (req, res) => res.send('BloxLuck server running ✅'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
