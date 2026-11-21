require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { z } = require('zod');

const pool = require('./db');
const { signToken, requireAuth } = require('./auth');
const inquiriesRouter = require('./inquiries');

const app = express();

// Only our frontend (port 3000) may call this API from a browser
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Simple route to check that the server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Login: email + password -> JWT token
app.post('/api/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Valid email and password are required' });
  }

  const { email, password } = parsed.data;

  try {
    const result = await pool.query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = result.rows[0];

    // Same message for "no such user" and "wrong password" (don't reveal which)
    const valid = user && (await bcrypt.compare(password, user.password_hash));
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      token: signToken(user),
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Check that a token is valid and return the current user (the frontend will use this)
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// All inquiry routes live under /api/inquiries (login required, see inquiries.js)
app.use('/api/inquiries', inquiriesRouter);

module.exports = app;