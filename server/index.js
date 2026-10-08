// Explore Karachi — tiny Node backend.
// Dev:  `npm run dev`   → Express + Vite middleware (hot reload)
// Prod: `npm run build && npm start` → Express serves the built client from /dist
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { categories, places } from './content/places.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isProd = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3000;

const app = express();

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/places', (_req, res) => {
  res.json({ categories, places });
});

app.get('/api/places/:id', (req, res) => {
  const place = places.find((p) => p.id === req.params.id);
  if (!place) return res.status(404).json({ error: 'Unknown place' });
  res.json(place);
});

if (isProd) {
  const dist = path.join(root, 'dist');
  app.use(express.static(dist, { index: 'index.html', maxAge: '1h' }));
  app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    root,
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(port, () => {
  console.log(`\n  Explore Karachi running at http://localhost:${port}  (${isProd ? 'production' : 'development'})\n`);
});
