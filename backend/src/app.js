import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { env } from './config/env.js';
import routes from './routes.js';
import { notFound, errorHandler } from './middlewares/error.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || env.clientOrigin.includes(origin) || env.clientOrigin.includes('*')) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
// SSE must not be buffered by compression, and the stream URL carries a token we
// don't want in access logs.
app.use(compression({ filter: (req, res) => !req.path.endsWith('/notifications/stream') && compression.filter(req, res) }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
if (!env.isProd) app.use(morgan('dev', { skip: (req) => req.path.endsWith('/notifications/stream') }));

app.use('/uploads', express.static(env.uploadDir, { maxAge: '30d' }));

app.get('/', (req, res) => res.json({ success: true, data: { name: 'AuraCraft API', version: '1.0.0' } }));
app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
