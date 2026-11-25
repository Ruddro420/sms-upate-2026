import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { getDb } from './db.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import academicsRoutes from './routes/academics.js';
import admissionsRoutes from './routes/admissions.js';
import studentsRoutes from './routes/students.js';
import examsRoutes from './routes/exams.js';
import certificatesRoutes from './routes/certificates.js';
import publicRoutes from './routes/public.js';

const app = express();
const PORT = Number(process.env.PORT || 5000);

// Initialize SQLite database & seed default BD school data on startup
getDb();

app.use(cors());
app.use(express.json({ limit: '8mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'Local SQLite (Free & Unlimited)', timestamp: new Date().toISOString() });
});

app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/academics', academicsRoutes);
app.use('/api/admissions', admissionsRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/certificates', certificatesRoutes);

// Serve built React frontend if present
const frontendDist = path.resolve(process.cwd(), '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`BD School Management Backend running at http://localhost:${PORT}`);
});
