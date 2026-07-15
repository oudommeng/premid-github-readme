import { kv } from '@vercel/kv';

function escapeXml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export default async function handler(req, res) {
    const activity = (await kv.get('latest_activity')) || {
        title: 'No activity yet',
        subtitle: 'Waiting for data...',
        status: 'Idle',
    };

    const title = escapeXml(activity.title || 'Untitled');
    const subtitle = escapeXml(activity.subtitle || '');
    const status = escapeXml(activity.status || '');

    const svg = `
<svg width="400" height="120" viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="120" rx="12" fill="#0d1117" stroke="#30363d"/>
  <text x="20" y="35" font-family="Segoe UI, sans-serif" font-size="12" fill="#8b949e">${status}</text>
  <text x="20" y="62" font-family="Segoe UI, sans-serif" font-size="18" fill="#ffffff" font-weight="bold">${title}</text>
  <text x="20" y="86" font-family="Segoe UI, sans-serif" font-size="13" fill="#c9d1d9">${subtitle}</text>
</svg>`.trim();

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate');
    res.status(200).send(svg);
}