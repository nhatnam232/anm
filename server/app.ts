/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import animeRoutes from './routes/anime.js'
import characterRoutes from './routes/character.js'
import studioRoutes from './routes/studio.js'
import searchRoutes from './routes/search.js'
import translateRoutes from './routes/translate.js'
import seasonRoutes from './routes/season.js'
import scheduleRoutes from './routes/schedule.js'
import imageRoutes from './routes/image.js'
import adminRoutes from './routes/admin.js'
import wikiImportRoutes from './routes/wiki-import.js'

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/anime', animeRoutes)
app.use('/api/character', characterRoutes)
app.use('/api/studio', studioRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/translate', translateRoutes)
app.use('/api/season', seasonRoutes)
app.use('/api/schedule', scheduleRoutes)
app.use('/api/image', imageRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/wiki-import', wikiImportRoutes)

/**
 * health
 */
app.get('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'ok',
  })
})

/**
 * 404 handler — registered after all routes, before the error handler.
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

/**
 * error handler middleware — must be registered last so Express treats it as
 * the terminal error handler for anything passed to next(err).
 */
app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[server] Unhandled error:', error?.message || error)
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

export default app
