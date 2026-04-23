/**
 * Wiki module — shared TypeScript types.
 *
 * Lives at `src/wiki/` so the Wiki feature is self-contained and can be
 * extracted into its own package later if needed. The main app imports
 * exactly two things from here:
 *   - `WIKI_REGISTRY` — the source-of-truth lookup table.
 *   - `<WikiLink>`     — the inline link/HoverCard component.
 *
 * Everything else stays inside `src/wiki/`.
 */

export type WikiCharacter = {
  id: string                    // url-safe slug (also the URL path: /wiki/character/:id)
  name: string
  /** Optional cross-link to AniList character ID — ONLY set when verified. */
  anilistCharacterId?: number | null
  /**
   * Wikipedia slug for the character article.
   *   - `wikipediaSlug` (English title, eg "Frieren_(character)").
   *   - `wikipediaSlugVi` (Vietnamese title — many anime characters lack VI pages).
   * The client `useWikipediaSummary` hook tries VI first, falls back to EN,
   * and runs DeepL/MyMemory translation when only EN exists.
   */
  wikipediaSlug?: string
  wikipediaSlugVi?: string
  avatarUrl: string
  /** 1-2 sentence summary used in the HoverCard preview. */
  shortBio: string
  /** Long-form biography used on the character page itself. May contain
      `[[Name|character_id]]` tags — the WikiParser will turn them into links. */
  bio: string
  affiliations?: string[]
  /** Story/lore IDs the character appears in. */
  storyIds?: string[]
  updatedAt?: string
}

export type WikiStory = {
  id: string                    // slug
  title: string
  /** Optional cross-link to a main-app anime page. ONLY set when verified. */
  anilistAnimeId?: number | null
  /** Wikipedia slug for the anime/manga article (EN + optional VI). */
  wikipediaSlug?: string
  wikipediaSlugVi?: string
  coverUrl?: string | null
  shortSummary: string
  /** Full chapter text. May contain `[[Name|character_id]]` tags. */
  body: string
  characterIds?: string[]
  updatedAt?: string
}

export type WikiRegistry = {
  characters: Record<string, WikiCharacter>
  stories: Record<string, WikiStory>
}
