const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

// Serve the ProjectTemplate static files (one level up)
const staticRoot = path.join(__dirname, '..');
app.use(express.static(staticRoot));

app.use(bodyParser.json());
app.use(cors({ origin: true, credentials: true }));
app.use(session({
  secret: 'scrum-squad-demo-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Load users from disk so signups persist across restarts
const usersFile = path.join(__dirname, 'users.json');
let demoUsers = [];
try {
  const raw = fs.readFileSync(usersFile, 'utf8');
  demoUsers = JSON.parse(raw);
} catch (e) {
  // If file missing or invalid, seed defaults and write file
  demoUsers = [
    { username: 'employee1', password: 'password123', displayName: 'Employee One', isAdmin: true },
    { username: 'alice', password: 'alicepass', displayName: 'Alice Example', isAdmin: false }
  ];
  try { fs.writeFileSync(usersFile, JSON.stringify(demoUsers, null, 2)); } catch (e) { /* ignore */ }
}

// Ensure each user has a publicId (non-identifying handle) so UI doesn't expose usernames
function generatePublicId() {
  return 'user-' + Math.random().toString(36).slice(2, 8);
}

let usersChanged = false;
demoUsers.forEach(u => {
  if (!u.publicId) { u.publicId = generatePublicId(); usersChanged = true; }
});
if (usersChanged) saveUsers();

function saveUsers() {
  try {
    fs.writeFileSync(usersFile, JSON.stringify(demoUsers, null, 2));
  } catch (e) {
    console.error('Failed to save users.json', e);
  }
}

// Feedback storage (persist to disk for demo)
const feedbackFile = path.join(__dirname, 'feedback.json');
let feedbackList = [];
try {
  const raw = fs.readFileSync(feedbackFile, 'utf8');
  feedbackList = JSON.parse(raw);
} catch (e) {
  feedbackList = [];
  try { fs.writeFileSync(feedbackFile, JSON.stringify(feedbackList, null, 2)); } catch (e) { /* ignore */ }
}

function saveFeedback() {
  try {
    fs.writeFileSync(feedbackFile, JSON.stringify(feedbackList, null, 2));
  } catch (e) {
    console.error('Failed to save feedback.json', e);
  }
}

// Updates storage (persist to disk for demo)
const updatesFile = path.join(__dirname, 'updates.json');
let updatesList = [];
try {
  const raw = fs.readFileSync(updatesFile, 'utf8');
  updatesList = JSON.parse(raw);
} catch (e) {
  updatesList = [];
  try { fs.writeFileSync(updatesFile, JSON.stringify(updatesList, null, 2)); } catch (e) { /* ignore */ }
}

function saveUpdates() {
  try {
    fs.writeFileSync(updatesFile, JSON.stringify(updatesList, null, 2));
  } catch (e) {
    console.error('Failed to save updates.json', e);
  }
}

app.post('/api/employeeLogin', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ ok: false, message: 'Missing username or password' });
  }

  const user = demoUsers.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ ok: false, message: 'Invalid credentials' });
  }

  // store minimal user in session
  // do NOT expose internal username to the frontend; use a publicId and a display name
  req.session.user = { publicId: user.publicId, displayName: user.displayName, username: user.username, isAdmin: !!(user.isAdmin || user.role === 'admin') };
  res.json({ ok: true, user: req.session.user });
});

// Sign up new user (persists to users.json)
app.post('/api/signup', (req, res) => {
  const { username, password, displayName } = req.body || {};
  if (!username || !password) return res.status(400).json({ ok: false, message: 'Missing username or password' });
  if (typeof username !== 'string' || typeof password !== 'string') return res.status(400).json({ ok: false, message: 'Invalid input' });
  if (password.length < 6) return res.status(400).json({ ok: false, message: 'Password must be at least 6 characters' });

  // check uniqueness
  const exists = demoUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (exists) return res.status(409).json({ ok: false, message: 'Username already taken' });

  const user = { username: username, password: password, displayName: displayName || username, publicId: generatePublicId(), isAdmin: false };
  demoUsers.push(user);
  saveUsers();

  // set session to a non-identifying profile
  req.session.user = { publicId: user.publicId, displayName: user.displayName, username: user.username, isAdmin: false };
  res.json({ ok: true, user: req.session.user });
});

// Feedback API
// GET /api/feedback - returns all feedback
app.get('/api/feedback', (req, res) => {
  // return newest-first like the UI expects
  const sorted = feedbackList.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted);
});

// POST /api/feedback - create new feedback
app.post('/api/feedback', (req, res) => {
  const { issue, impact, suggestion, theme } = req.body || {};
  if (!issue || !impact) return res.status(400).json({ ok: false, message: 'Missing fields' });

  const id = Date.now();
  const createdAt = new Date().toISOString();
  // Use the publicId stored in session (non-identifying) as the author
  const author = (req.session && req.session.user && req.session.user.publicId) || 'anonymous';

  const item = {
    id,
    issue,
    impact,
    suggestion: suggestion || '',
    theme: theme || 'Other',
    createdAt,
    upvotes: 0,
    author
  };

  feedbackList.unshift(item);
  saveFeedback();
  res.json({ ok: true, item });
});

// POST /api/feedback/:id/upvote - toggle upvote (simple increment)
app.post('/api/feedback/:id/upvote', (req, res) => {
  const id = Number(req.params.id);
  const idx = feedbackList.findIndex(f => f.id === id);
  if (idx === -1) return res.status(404).json({ ok: false, message: 'Not found' });
  feedbackList[idx].upvotes = (feedbackList[idx].upvotes || 0) + 1;
  saveFeedback();
  res.json({ ok: true, upvotes: feedbackList[idx].upvotes });
});

app.get('/api/whoami', (req, res) => {
  if (req.session && req.session.user) {
    // find stored user to expose admin flag
    const stored = demoUsers.find(u => u.username === req.session.user.username);
    const isAdmin = !!(stored && stored.isAdmin);
    return res.json({ ok: true, user: { ...req.session.user, isAdmin } });
  }
  res.json({ ok: false });
});
  // Get updates for a specific feedback post
  app.get('/api/feedback/:id/updates', (req, res) => {
    const id = Number(req.params.id);
    const results = updatesList.filter(u => Number(u.postId) === id).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(results);
  });

  // Post an update to a feedback item (admin-only)
  app.post('/api/feedback/:id/update', (req, res) => {
    const id = Number(req.params.id);
    const { text, content } = req.body || {};
    const bodyContent = text || content;
    if (!bodyContent) return res.status(400).json({ ok: false, message: 'Missing content' });

    // check admin
    if (!req.session || !req.session.user || !req.session.user.isAdmin) {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }

    const update = {
      id: Date.now(),
      postId: id,
      content: bodyContent,
      authorRole: 'admin',
      timestamp: new Date().toISOString()
    };
    updatesList.unshift(update);
    saveUpdates();
    res.json({ ok: true, update });
  });

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ ok: false, message: 'Failed to logout' });
    res.json({ ok: true });
  });
});

app.listen(PORT, () => {
  console.log(`Mock backend running and serving static files at http://localhost:${PORT}/ProjectTemplate`);
  console.log(`Open http://localhost:${PORT}/ProjectTemplate/login.html to test login`);
});
