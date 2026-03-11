const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

app.get('/verify', async (req, res) => {
  const { username, code } = req.query;
  if (!username || !code) return res.json({ success: false, error: 'Missing params' });

  try {
    // Step 1: get user ID
    const r1 = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
    });
    const d1 = await r1.json();
    if (!d1.data || !d1.data[0]) return res.json({ success: false, error: 'Roblox user not found.' });

    const userId = d1.data[0].id;

    // Step 2: get bio
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

// Global roulette timer - synced for all users
// Each round = 15s countdown + 11s spin = 26s total
const ROUND_DURATION = 26000;
const COUNTDOWN_DURATION = 15000;

app.get('/timer', (req, res) => {
  const now = Date.now();
  const pos = now % ROUND_DURATION; // position within current round (ms)
  
  if (pos < COUNTDOWN_DURATION) {
    // Still in countdown phase
    const remaining = (COUNTDOWN_DURATION - pos) / 1000;
    res.json({ phase: 'countdown', remaining: parseFloat(remaining.toFixed(2)) });
  } else {
    // In spin phase
    const spinElapsed = (pos - COUNTDOWN_DURATION) / 1000;
    res.json({ phase: 'spinning', spinElapsed: parseFloat(spinElapsed.toFixed(2)) });
  }
});

app.get('/', (req, res) => res.send('BloxLuck verify server running ✅'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
