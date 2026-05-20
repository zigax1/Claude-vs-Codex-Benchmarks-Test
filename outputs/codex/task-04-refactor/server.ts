import express from 'express';
import { authRouter } from './routes/auth';
import { healthRouter } from './routes/health';
import { meRouter } from './routes/me';
import { projectsRouter } from './routes/projects';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(express.json());
app.use('/auth', authRouter);
app.use('/me', meRouter);
app.use('/projects', projectsRouter);
app.use('/health', healthRouter);
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '3000');
app.listen(PORT, () => {
  console.log(`server listening on :${PORT}`);
});
