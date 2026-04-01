require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : null; // null = allow all (dev mode)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    // If no allowlist set, allow everything (useful for development)
    if (!allowedOrigins) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/learn', require('./routes/learn'));
app.use('/api/vocab', require('./routes/vocab'));

const clientBuild = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => res.sendFile(path.join(clientBuild, 'index.html')));
} else {
  app.get('/', (req, res) => res.json({ message: 'Reading Club App API running.' }));
}

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n Reading Club App running on http://localhost:${PORT}`);
    console.log(`   Admin login: admin@readingclub.app / admin123\n`);
  });
}).catch(err => {
  console.error('Failed to connect to database:', err.message);
  console.error('Make sure DATABASE_URL is set correctly in your .env file');
  process.exit(1);
});

app.use((err, req, res, next) => {
  console.error('Unhandled route error:', err);
  res.status(500).json({ error: err.message || 'Server error' });
});