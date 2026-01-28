const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    next();
  };
};

const isCorporate = (req, res, next) => {
  const corporateRoles = ['SUPER_ADMIN', 'CORPORATE_ADMIN'];
  if (!corporateRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Corporate access required' });
  }
  next();
};

const isManager = (req, res, next) => {
  const managerRoles = ['SUPER_ADMIN', 'CORPORATE_ADMIN', 'REGIONAL_MANAGER', 'LOCATION_MANAGER'];
  if (!managerRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Manager access required' });
  }
  next();
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  isCorporate,
  isManager
};
