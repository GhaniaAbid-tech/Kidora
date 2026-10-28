/* KIDORA backend: serves the website and powers AI Buddy.
   No packages to install. Needs Node.js 18 or newer.
   Run:  node server.js   then open http://localhost:3000 */
const http = require('http');
const fs = require('fs');
const path = require('path');

/* ---- load .env (ANTHROPIC_API_KEY=...) ---- */
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch (e) {}

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.MODEL || 'claude-haiku-5-5';
const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname, '..'); // the KIDORA website folder

const SYSTEM = `You are Buddy, the friendly learning buddy inside KIDORA, a learning app for kids aged 6 to 12.
Help with school-style questions: science, math, reading and writing, space, nature, history, geography, art, music, coding and languages.
Rules:
- Use simple words and short sentences. Answer in 3 to 5 sentences, with one fun example or comparison. Use at most two emojis. Plain text only, no markdown, no bullet symbols.
- Be accurate. If you are not sure, say so honestly. Never make up facts.
- For math homework, guide the child step by step and explain the idea, not just the final answer.
- When it fits, end with one short question that keeps the child curious.
- If the child asks about something unsafe, adult, violent, medical, or about personal or emotional trouble, kindly say a trusted grown-up such as a parent or teacher is the best person to ask. Do not give details.
- Never ask for or accept personal information such as full name, address, school, phone number or passwords. If the child shares some, gently remind them not to.
- Do not share links. If asked to do something unrelated to learning, gently steer back to learning.
- Reply in the same language the child writes in.`;

/* ---- tiny rate limit: 20 questions per minute per visitor ---- */
const hits = new Map();
const limited = ip => {
  const now = Date.now();
  const a = (hits.get(ip) || []).filter(t => now - t < 60000);
  a.push(now); hits.set(ip, a);
  return a.length > 20;
};

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp' };

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = '';
    req.on('data', c => { b += c; if (b.length > 20000) { reject(new Error('too big')); req.destroy(); } });
    req.on('end', () => resolve(b));
    req.on('error', reject);
  });
}

async function chat(req, res) {
  if (!KEY) return send(res, 500, { error: 'Missing ANTHROPIC_API_KEY. Add it to server/.env and restart.' });
  if (limited(req.socket.remoteAddress)) return send(res, 429, { error: 'Slow down a little, explorer!' });
  let data;
  try { data = JSON.parse(await readBody(req)); } catch (e) { return send(res, 400, { error: 'Bad request' }); }

  let msgs = (Array.isArray(data.messages) ? data.messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map(m => ({ role: m.role, content: m.content.slice(0, 500) }))
    .slice(-8);
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return send(res, 400, { error: 'No question' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 400, system: SYSTEM, messages: msgs })
    });
    const out = await r.json();
    if (!r.ok) {
      console.error('Anthropic API error:', r.status, JSON.stringify(out));
      return send(res, 502, { error: 'The AI could not answer right now.' });
    }
    const text = (out.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    send(res, 200, { reply: text || 'Hmm, I got stuck. Can you ask that another way?' });
  } catch (e) {
    console.error('Request failed:', e.message);
    send(res, 502, { error: 'The AI could not answer right now.' });
  }
}

function serveStatic(req, res) {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.resolve(ROOT, '.' + p);
  const rel = path.relative(ROOT, file);
  const ext = path.extname(file).toLowerCase();
  // never serve the server folder, hidden files, or anything outside the website
  if (rel.startsWith('..') || rel.split(path.sep).some(s => s.startsWith('.') || s === 'server') || !TYPES[ext]) {
    res.writeHead(404); return res.end('Not found');
  }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[ext] });
    res.end(buf);
  });
}

http.createServer((req, res) => {
  if (req.url.startsWith('/api/chat')) {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
      return res.end();
    }
    if (req.method === 'POST') return chat(req, res);
    return send(res, 405, { error: 'Use POST' });
  }
  if (req.method === 'GET') return serveStatic(req, res);
  res.writeHead(405); res.end();
}).listen(PORT, () => {
  console.log(`KIDORA is running: http://localhost:${PORT}`);
  console.log(KEY ? `AI Buddy is ON (model: ${MODEL})` : 'WARNING: no ANTHROPIC_API_KEY found. AI Buddy will use its basic built-in answers.');
});
