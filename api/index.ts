/**
 * Vercel deploy entry handler.
 *
 * This is the ONLY file under `api/` so Vercel creates a single Serverless
 * Function (Hobby plan limits to 12). All actual route logic lives under
 * `../server/` and is imported here.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import app from '../server/app.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res)
}
