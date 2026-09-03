import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const ALLOWED_EMAIL_DOMAIN = '@unichristus.edu.br';

function ensureAdminApp() {
  if (getApps().length === 0) {
    const encoded = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!encoded) throw new Error('FIREBASE_SERVICE_ACCOUNT ausente.');
    const serviceAccount = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    initializeApp({ credential: cert(serviceAccount) });
  }
}

export function getAdminAuth() {
  ensureAdminApp();
  return getAuth();
}

export function getAdminFirestore() {
  ensureAdminApp();
  return getFirestore();
}

export async function verifyAuth(req, verifyIdToken) {
  const header = String(req.headers?.authorization || req.headers?.Authorization || '');
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) return { ok: false, status: 401, error: 'Login necessário.' };

  let decoded;
  try {
    decoded = await verifyIdToken(match[1]);
  } catch {
    return { ok: false, status: 401, error: 'Sessão expirada. Faça login novamente.' };
  }

  if (decoded?.email_verified !== true) {
    return { ok: false, status: 403, error: 'Confirme seu e-mail antes de gerar questões.' };
  }
  if (!String(decoded?.email || '').toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
    return { ok: false, status: 403, error: 'Acesso restrito a e-mails da Unichristus.' };
  }

  return { ok: true, uid: decoded.uid, email: decoded.email };
}
