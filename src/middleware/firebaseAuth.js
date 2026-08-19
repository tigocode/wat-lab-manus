const { getAuth } = require('firebase-admin/auth');
require('../config/firebaseAdmin');

async function firebaseAuth(req, res, next) {
  if (String(process.env.REQUIRE_FIREBASE_AUTH).toLowerCase() !== 'true') return next();
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Token Firebase ausente' });
  try {
    req.user = await getAuth().verifyIdToken(header.slice(7));
    return next();
  } catch (error) {
    console.error('Token Firebase inválido:', error.message);
    return res.status(401).json({ error: 'Token Firebase inválido' });
  }
}

module.exports = { firebaseAuth };
