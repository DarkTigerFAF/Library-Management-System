const jwt = require('jsonwebtoken');

function authenticateJWT(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change_me');
    req.user = payload; // { id, role }
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

function ownerOrAdmin(getOwnerId) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role === 'ADMIN') return next();
    try {
      const ownerId = await getOwnerId(req);
      if (String(ownerId) === String(req.user.id)) return next();
      return res.status(403).json({ error: 'Forbidden' });
    } catch (e) {
      return next(e);
    }
  };
}

module.exports = { authenticateJWT, requireRole, ownerOrAdmin };
