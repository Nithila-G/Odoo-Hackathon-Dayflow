import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// Ensure upload directory exists
const uploadsDir = path.resolve('src/uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import attendanceRoutes from './routes/attendance.js';
import leaveRoutes from './routes/leave.js';
import salaryRoutes from './routes/salary.js';
import uploadRoutes from './routes/uploads.js';
import healthRouter from './routes/health.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' },
});
app.set('io', io);

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use('/uploads', express.static('src/uploads'));

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api', healthRouter);

app.use('/auth', authRoutes);
app.use('/employees', employeeRoutes);
// salary routes are nested under /employees/:id/salary — mounted at the same base
app.use('/employees', salaryRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/leave', leaveRoutes);
app.use('/uploads-api', uploadRoutes);

io.on('connection', (socket) => {
  socket.on('disconnect', () => {});
});

// Central error handler (e.g. multer file-type/size errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Something went wrong' });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Dayflow API listening on :${PORT}`);
});
