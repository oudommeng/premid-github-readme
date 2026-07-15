import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple shared-secret check so randoms can't spam your card.
  // Pass it as ?token=xxx in the Forwarding URL, since that settings
  // panel is just a plain URL field (no custom headers).
  const token = req.query.token;
  if (process.env.FORWARD_SECRET && token !== process.env.FORWARD_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  // PreMiD sends { active_activity: {...} | null, extension: {...} }
  await kv.set('latest_activity', {
    active_activity: data.active_activity ?? null,
    receivedAt: new Date().toISOString(),
  });

  return res.status(200).json({ ok: true });
}