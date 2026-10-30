import express from 'express';
import { apiRouter } from '../server/api.ts';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Support both /api/* and direct route hits on Vercel Serverless Functions
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
