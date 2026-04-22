/**
 * Provider re-export.
 *
 * After the AniList migration this is a thin pass-through to `anilist.ts`.
 * It is kept so existing route imports (`../lib/provider.js`) continue to
 * work without a code-wide find/replace.
 */

export {
  getAnimeList,
  getFeaturedAnime,
  getSeasonAnime,
  searchAnime,
  getGenreOptions,
  getAnimeDetails,
  getCharacterDetails,
  getStudioDetails,
} from './anilist.js'
