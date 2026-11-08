import express from 'express';
import fs from 'fs';
import path from 'path';
import { apiRouter } from './server/api.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve project ZIP for Appmint wrapper download
app.get('/gmit-betel-fuimelang.zip', (_req, res) => {
  const publicZip = path.resolve(process.cwd(), 'public', 'gmit-betel-fuimelang.zip');
  if (fs.existsSync(publicZip)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="gmit-betel-fuimelang.zip"');
    return res.sendFile(publicZip);
  }
  res.status(404).send('ZIP file not found');
});

// API endpoints
app.use('/api', apiRouter);

// Serve static frontend assets
const distPath = path.resolve(process.cwd(), 'dist');
const publicPath = path.resolve(process.cwd(), 'public');
app.use(express.static(publicPath));
app.use(express.static(distPath));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SYSJEGER V2.0 Server running on port ${PORT}`);
});
