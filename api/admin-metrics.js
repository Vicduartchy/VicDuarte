import { getAdminAuth, getAdminFirestore, verifyAuth } from './_lib/firebase-admin.js';

export async function checkIsAdmin(uid, getAdminDoc) {
  try {
    const doc = await getAdminDoc(uid);
    return Boolean(doc?.exists);
  } catch (error) {
    console.error('[ADMIN-METRICS] Falha ao checar admin:', error);
    return false;
  }
}

export function aggregateMetrics(events, now = new Date()) {
  const seteDiasAtras = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const trintaDiasAtras = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const porProfessor = {};
  const porCurso = {};
  let ultimos7Dias = 0;
  let ultimos30Dias = 0;

  for (const event of events) {
    const email = String(event.email || '').toLowerCase();
    porProfessor[email] = (porProfessor[email] || 0) + 1;
    porCurso[event.curso] = (porCurso[event.curso] || 0) + 1;
    if (event.criadoEm >= seteDiasAtras) ultimos7Dias += 1;
    if (event.criadoEm >= trintaDiasAtras) ultimos30Dias += 1;
  }

  return { total: events.length, porProfessor, porCurso, ultimos7Dias, ultimos30Dias };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const auth = await verifyAuth(req, token => getAdminAuth().verifyIdToken(token));
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const isAdmin = await checkIsAdmin(auth.uid, uid => getAdminFirestore().collection('admins').doc(uid).get());
  if (!isAdmin) return res.status(403).json({ error: 'Acesso restrito a administradores.' });

  try {
    const snapshot = await getAdminFirestore().collection('geracoes').get();
    const events = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        email: data.email,
        curso: data.curso,
        criadoEm: data.criadoEm?.toDate?.() || new Date(0),
      };
    });
    return res.status(200).json(aggregateMetrics(events));
  } catch (error) {
    console.error('[ADMIN-METRICS] Falha ao consultar métricas:', error);
    return res.status(500).json({ error: 'Não foi possível carregar as métricas agora.' });
  }
}
