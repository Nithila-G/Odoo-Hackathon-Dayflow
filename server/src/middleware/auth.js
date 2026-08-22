import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, companyId: user.company_id, role: user.role },
    SECRET,
    { expiresIn: '15m' }
  );
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Restricts a route to specific roles (case-insensitive), e.g. requireRole('admin', 'hr')
export function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.user?.role?.toLowerCase();
    const allowed = roles.map((r) => r.toLowerCase());
    if (!userRole || !allowed.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export const JWT_SECRET = SECRET;
