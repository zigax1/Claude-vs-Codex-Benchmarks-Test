import express from 'express';
import { config } from './config.js';
import { authRouter } from './routes/auth.routes.js';
import { projectsRouter } from './routes/projects.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(authRouter);
  app.use(projectsRouter);
  app.use(healthRouter);
  app.use(errorHandler);
  return app;
}

const app = createApp();
app.listen(config.port, () => {
  console.log(`server listening on :${config.port}`);
});
