import { Router } from 'express';
const router = Router();

// GET /api/health — Server uptime & database health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Dayflow HRMS API',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
  });
});

export default router;
