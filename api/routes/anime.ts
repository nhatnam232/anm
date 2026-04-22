import express, { Request, Response } from 'express'
import { getAnimeDetails, getAnimeList, getFeaturedAnime } from '../lib/jikan.js'

const store = new Map<string, { data: any; expires: number }>()

function getCache(key: string) {
  const item = store.get(key)
  if (!item || Date.now() > item.expires) return null
  return item.data
}

function setCache(key: string, data: any, ttlSeconds = 600) {
  store.set(key, { data, expires: Date.now() + ttlSeconds * 1000 })
}

const router = express.Router()

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Number.parseInt(req.query.page as string, 10) || 1
    const limit = Number.parseInt(req.query.limit as string, 10) || 20
    const minScore = Number.parseFloat(req.query.min_score as string)
    const maxScore = Number.parseFloat(req.query.max_score as string)

    const key = `anime:${JSON.stringify(req.query)}`
    const cached = getCache(key)
    if (cached) {
      res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400')
      return res.json({ success: true, ...cached })
    }

    const result = await getAnimeList({
      page,
      limit,
      genre: req.query.genre as string,
      status: req.query.status as string,
      sort: req.query.sort as string,
      min_score: Number.isNaN(minScore) ? undefined : minScore,
      max_score: Number.isNaN(maxScore) ? undefined : maxScore,
    })

    setCache(key, result, 600)
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400')
    return res.json({ success: true, ...result })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/featured', async (_req: Request, res: Response) => {
  try {
    const cached = getCache('featured')
    if (cached) {
      res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400')
      return res.json({ success: true, data: cached })
    }

    const data = await getFeaturedAnime(5)
    setCache('featured', data, 1800)
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400')
    return res.json({ success: true, data })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number.parseInt(req.params.id, 10)

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid anime id' })
    }

    const cached = getCache(`anime:${id}`)
    if (cached) {
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=604800')
      return res.json({ success: true, data: cached })
    }

    const data = await getAnimeDetails(id)

    if (!data) {
      return res.status(404).json({ success: false, error: 'Anime not found' })
    }

    setCache(`anime:${id}`, data, 3600)
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=604800')
    return res.json({ success: true, data })
  } catch (error: any) {
    console.error(`[anime/:id] failed for ${req.params.id}:`, error?.message || error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

export default router
