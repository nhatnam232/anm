import express, { Request, Response } from 'express'
import { getCharacterDetails } from '../lib/provider.js'

const router = express.Router()

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number.parseInt(req.params.id, 10)
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid character id' })
    }

    const data = await getCharacterDetails(id)

    if (!data) {
      return res.status(404).json({ success: false, error: 'Character not found' })
    }

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=604800')
    return res.json({
      success: true,
      data,
    })
  } catch (error: any) {
    // Forward upstream "not found" as a 404 instead of 500 so the client can
    // render the proper "character not found" UI rather than a generic error.
    if (error?.status === 404 || /404/.test(error?.message ?? '')) {
      return res.status(404).json({ success: false, error: 'Character not found' })
    }
    console.error(`[character/:id] failed for ${req.params.id}:`, error?.message ?? error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

export default router
