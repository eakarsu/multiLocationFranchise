const jwt = require('jsonwebtoken');

function jwtConfiguration() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  return {
    secret,
    issuer: process.env.JWT_ISSUER || 'multi-location-franchise',
    audience: process.env.JWT_AUDIENCE || 'franchise-operators',
  };
}

function signAccessToken(user) {
  const config = jwtConfiguration();
  return jwt.sign(
    { role: user.role, locationId: user.locationId || undefined },
    config.secret,
    {
      algorithm: 'HS256',
      subject: user.id,
      issuer: config.issuer,
      audience: config.audience,
      expiresIn: '15m',
    },
  );
}

async function authenticateToken(req, res, next) {
  try {
    const match = req.get('authorization')?.match(/^Bearer ([A-Za-z0-9._~-]+)$/);
    if (!match) return res.status(401).json({ error: 'Access token required' });
    const config = jwtConfiguration();
    const claims = jwt.verify(match[1], config.secret, {
      algorithms: ['HS256'],
      issuer: config.issuer,
      audience: config.audience,
    });
    if (typeof claims !== 'object' || typeof claims.sub !== 'string') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    const user = await req.prisma.user.findFirst({
      where: { id: claims.sub, isActive: true },
      select: { id: true, email: true, role: true, locationId: true },
    });
    if (!user) return res.status(401).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  } catch (error) {
    if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next(error);
  }
}

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Not authorized' });
  next();
};

const isCorporate = authorizeRoles('SUPER_ADMIN', 'CORPORATE_ADMIN');
const isManager = authorizeRoles(
  'SUPER_ADMIN',
  'CORPORATE_ADMIN',
  'REGIONAL_MANAGER',
  'LOCATION_MANAGER',
);

module.exports = {
  authenticateToken,
  authorizeRoles,
  isCorporate,
  isManager,
  signAccessToken,
  jwtConfiguration,
};
