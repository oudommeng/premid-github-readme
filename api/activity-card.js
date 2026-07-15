import { kv } from '@vercel/kv';

function escapeXml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function elapsed(startMs) {
    if (!startMs) return '';
    const secs = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')} elapsed`;
}

export default async function handler(req, res) {
    const stored = await kv.get('latest_activity');
    const act = stored?.active_activity;

    const name = escapeXml(act?.name || '');
    const details = escapeXml(act?.details || '');
    const state = escapeXml(act?.state || '');
    const image = act?.assets?.large_image || '';
    const time = escapeXml(elapsed(act?.timestamps?.start));

    const svg = act
        ? `
<svg width="400" height="120" viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="120" rx="12" fill="#0d1117" stroke="#30363d"/>
  ${image ? `<image href="${image}" x="16" y="16" width="88" height="88" rx="8" clip-path="inset(0 round 8)"/>` : ''}
  <text x="${image ? 120 : 20}" y="34" font-family="Segoe UI, sans-serif" font-size="12" fill="#8b949e">${name}</text>
  <text x="${image ? 120 : 20}" y="58" font-family="Segoe UI, sans-serif" font-size="17" fill="#ffffff" font-weight="bold">${details}</text>
  <text x="${image ? 120 : 20}" y="80" font-family="Segoe UI, sans-serif" font-size="13" fill="#c9d1d9">${state}</text>
  <text x="${image ? 120 : 20}" y="100" font-family="Segoe UI, sans-serif" font-size="11" fill="#6e7681">${time}</text>
</svg>`.trim()
        : `
<svg width="400" height="120" viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="120" rx="12" fill="#0d1117" stroke="#30363d"/>
  <text x="20" y="65" font-family="Segoe UI, sans-serif" font-size="14" fill="#6e7681">No active activity right now</text>
</svg>`.trim();

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate');
    res.status(200).send(svg);
}