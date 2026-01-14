import 'dotenv/config'; // Load environment variables
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import opportunitiesRouter from './routes/opportunities.js';
import accountsRouter from './routes/accounts.js';
import catalogsRouter from './routes/catalogs.js';
import observationsRouter from './routes/observations.js';
import { db } from './db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

app.use(cors()); // Enable CORS for all routes
app.use(express.json());

app.use('/api', opportunitiesRouter);
app.use('/api', accountsRouter);
app.use('/api', catalogsRouter);
app.use('/api', observationsRouter);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ status: 'ok', time: result.rows[0].now, database: 'connected' });
  } catch (err) {
    console.error('Health check failed', err);
    const msg = err instanceof Error ? err.message : 'Database disconnected';
    res.status(500).json({ status: 'error', database: 'disconnected', error: msg });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
