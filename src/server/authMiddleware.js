/**
 * Admin authentication middleware
 * Validates Bearer token from Authorization header against ADMIN_TOKEN environment variable
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header is required' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization format. Use: Bearer <token>' });
  }

  const token = parts[1];
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken) {
    console.error('ADMIN_TOKEN environment variable is not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (token !== adminToken) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  next();
}
