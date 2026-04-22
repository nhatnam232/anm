const JIKAN_BASE_URL = 'https://api.jikan.moe/v4'
// Aggressive caching — Jikan ratelimits aggressively, and MAL data changes slowly.
const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000 // 30 min fresh
const DETAIL_CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 h fresh
const GENRE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 1 week fresh
// Stale window: serve cached value instantly while refreshing in background.
const STALE_WHILE_REVALIDATE_MS = 24 * 60 * 60 * 1000

type QueryValue = string | number | boolean | undefined | null

type CacheEntry = {
  expiresAt: number
  staleUntil: number
  value: unknown
}

const responseCache = new Map<string, CacheEntry>()
const inflightRequests = new Map<string, Promise<unknown>>()

const TOP_ANIME_LIMIT = 20

const STATUS_MAP: Record<string, string> = {
  airing: 'airing',
  ongoing: 'airing',
  current: 'airing',
  finished: 'complete',
  complete: 'complete',
  upcoming: 'upcoming',
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildUrl(path: string, params?: Record<string, QueryValue>) {
  const url = new URL(`${JIKAN_BASE_URL}${path}`)

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  return url.toString()
}

function startBackgroundRefresh<T>(
  url: string,
  path: string,
  params: Record<string, QueryValue> | undefined,
  ttlMs: number,
) {
  if (inflightRequests.has(url)) return
  // Fire-and-forget refresh; errors are swallowed so stale data continues to serve.
  const refresh = fetchJson<T>(path, params, ttlMs, 2, true).catch(() => undefined)
  inflightRequests.set(url, refresh as Promise<unknown>)
  refresh.finally(() => {
    if (inflightRequests.get(url) === (refresh as Promise<unknown>)) {
      inflightRequests.delete(url)
    }
  })
}

async function fetchJson<T>(
  path: string,
  params?: Record<string, QueryValue>,
  ttlMs = DEFAULT_CACHE_TTL_MS,
  retries = 3,
  bypassCache = false,
): Promise<T> {
  const url = buildUrl(path, params)
  const now = Date.now()
  const cached = responseCache.get(url)

  if (!bypassCache && cached) {
    if (cached.expiresAt > now) {
      return cached.value as T
    }
    // Stale-while-revalidate: return stale immediately and refresh in the background.
    if (cached.staleUntil > now) {
      startBackgroundRefresh<T>(url, path, params, ttlMs)
      return cached.value as T
    }
  }

  const inflight = inflightRequests.get(url)
  if (inflight && !bypassCache) {
    return inflight as Promise<T>
  }

  const requestPromise = (async () => {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (response.status === 429) {
      if (cached?.value) {
        return cached.value as T
      }

      if (retries > 0) {
        const retryAfter = Number(response.headers.get('retry-after') ?? '1')
        const delayMs = Number.isFinite(retryAfter)
          ? retryAfter * 1000
          : (4 - retries) * 1000

        await sleep(delayMs)
        inflightRequests.delete(url)
        return fetchJson<T>(path, params, ttlMs, retries - 1, bypassCache)
      }
    }

    if (!response.ok) {
      // On upstream failure, keep serving stale if available rather than surfacing a 5xx.
      if (cached?.value) return cached.value as T

      // 404 from MyAnimeList means "not found" — surface a typed error so
      // callers can convert it to a 404 instead of a 500.
      if (response.status === 404) {
        const err = new Error(`Resource not found: ${url}`) as Error & { status?: number }
        err.status = 404
        throw err
      }

      const message = await response.text()
      throw new Error(message || `Upstream request failed with ${response.status}`)
    }

    const json = (await response.json()) as T
    const freshUntil = Date.now() + ttlMs
    responseCache.set(url, {
      expiresAt: freshUntil,
      staleUntil: freshUntil + STALE_WHILE_REVALIDATE_MS,
      value: json,
    })

    return json
  })()

  inflightRequests.set(url, requestPromise)

  try {
    return await requestPromise
  } finally {
    inflightRequests.delete(url)
  }
}

function titleCase(value?: string | null) {
  if (!value) {
    return ''
  }

  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizeStatus(status?: string | null) {
  switch (status) {
    case 'Currently Airing':
      return 'Ongoing'
    case 'Finished Airing':
      return 'Finished'
    case 'Not yet aired':
      return 'Upcoming'
    default:
      return status || 'Unknown'
  }
}

function normalizeMALImageUrl(url?: string) {
  if (!url) {
    return ''
  }

  return url.replace('https://myanimelist.net/images/', 'https://cdn.myanimelist.net/images/')
}

function getImageUrl(images?: any) {
  return normalizeMALImageUrl(
    images?.jpg?.large_image_url ||
    images?.jpg?.image_url ||
    images?.webp?.large_image_url ||
    images?.webp?.image_url ||
    '',
  )
}

function getCharacterImageUrl(images?: any) {
  return normalizeMALImageUrl(
    images?.jpg?.image_url ||
    images?.webp?.image_url ||
    images?.webp?.small_image_url ||
    '',
  )
}

function cleanSynopsis(value?: string | null) {
  return (value || '')
    .replace(/\[Written by MAL Rewrite\]\s*$/m, '')
    .trim()
}

function extractYear(value?: string | null) {
  if (!value) {
    return undefined
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return undefined
  }

  return parsed.getUTCFullYear()
}

function pickStudio(anime: any) {
  return anime?.studios?.[0] || anime?.producers?.[0] || null
}

function getDisplayTitle(anime: any) {
  return anime?.title_english || anime?.title || 'Unknown Title'
}

function getBannerImageUrl(anime: any) {
  return normalizeMALImageUrl(
    anime?.trailer?.images?.maximum_image_url ||
      anime?.trailer?.images?.large_image_url ||
      anime?.trailer?.images?.medium_image_url ||
      '',
  )
}

export function mapAnimeSummary(anime: any) {
  const studio = pickStudio(anime)
  const score = typeof anime?.score === 'number' ? anime.score : 0

  return {
    id: anime?.mal_id,
    title: getDisplayTitle(anime),
    title_jp: anime?.title_japanese || '',
    cover_image: getImageUrl(anime?.images),
    banner_image: getBannerImageUrl(anime),
    score,
    episodes: anime?.episodes ?? 0,
    status: normalizeStatus(anime?.status),
    season: anime?.season && anime?.year ? `${titleCase(anime.season)} ${anime.year}` : anime?.aired?.string || 'Unknown',
    synopsis: cleanSynopsis(anime?.synopsis) || 'Synopsis unavailable.',
    studio_id: studio?.mal_id ?? null,
    studio_name: studio?.name || 'Unknown',
    created_year: anime?.year ?? extractYear(anime?.aired?.from) ?? null,
    genres: (anime?.genres ?? []).map((genre: any) => genre.name),
    popularity: anime?.popularity ?? null,
    members: anime?.members ?? 0,
    type: anime?.type ?? 'Unknown',
    rating: anime?.rating ?? 'Unknown',
    source: anime?.source ?? 'Unknown',
  }
}

function buildPagination(payload: any, fallbackLimit: number) {
  const fallbackTotal =
    (payload?.pagination?.last_visible_page ?? 0) * fallbackLimit

  return {
    total: payload?.pagination?.items?.total ?? fallbackTotal,
    page: payload?.pagination?.current_page ?? 1,
    limit: payload?.pagination?.items?.per_page ?? fallbackLimit,
    has_next_page: Boolean(payload?.pagination?.has_next_page),
    last_visible_page: payload?.pagination?.last_visible_page ?? 1,
  }
}

async function fetchGenreLookup() {
  const payload = await fetchJson<any>('/genres/anime', undefined, GENRE_CACHE_TTL_MS)
  const entries = payload?.data ?? []

  return new Map<string, number>(
    entries.map((genre: any) => [genre.name.toLowerCase(), genre.mal_id]),
  )
}

export async function getGenreOptions() {
  const payload = await fetchJson<any>('/genres/anime', undefined, GENRE_CACHE_TTL_MS)

  return (payload?.data ?? [])
    .map((genre: any) => ({
      id: genre.mal_id,
      name: genre.name,
    }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name))
}

async function resolveGenreId(genreName?: string) {
  if (!genreName || genreName === 'All') {
    return undefined
  }

  const lookup = await fetchGenreLookup()
  return lookup.get(genreName.toLowerCase())
}

export async function getAnimeList(params: {
  page?: number
  limit?: number
  genre?: string
  status?: string
  sort?: string
  min_score?: number
  max_score?: number
}) {
  const page = params.page ?? 1
  const limit = params.limit ?? TOP_ANIME_LIMIT
  const genreId = await resolveGenreId(params.genre)
  const status = STATUS_MAP[(params.status ?? '').toLowerCase()]

  const query: Record<string, QueryValue> = {
    page,
    limit,
    sfw: true,
    order_by: 'score',
    sort: 'desc',
  }

  let endpoint = '/top/anime'

  if (genreId || status || params.sort === 'popularity' || params.sort === 'newest' || params.min_score !== undefined || params.max_score !== undefined) {
    endpoint = '/anime'
    query.order_by =
      params.sort === 'popularity' ? 'popularity' : params.sort === 'newest' ? 'start_date' : 'score'
    query.sort = 'desc'
    query.genres = genreId
    query.status = status
    query.min_score = params.min_score
    query.max_score = params.max_score
  }

  const payload = await fetchJson<any>(endpoint, query)

  return {
    data: (payload?.data ?? []).map(mapAnimeSummary),
    ...buildPagination(payload, limit),
  }
}

export async function getSeasonAnime(params: {
  season: string
  year: number
  sort?: string
  limit?: number
}) {
  const limit = Math.min(params.limit ?? 40, 25) // Jikan per-page cap is 25
  const payload = await fetchJson<any>(
    `/seasons/${params.year}/${params.season.toLowerCase()}`,
    {
      page: 1,
      limit,
      sfw: true,
    },
    DEFAULT_CACHE_TTL_MS,
  )

  let data = (payload?.data ?? []).map(mapAnimeSummary)

  // Client-side sort (Jikan /seasons doesn't accept order_by reliably)
  if (params.sort === 'popularity') {
    data = data.sort(
      (a: any, b: any) => (a.popularity ?? 1e9) - (b.popularity ?? 1e9),
    )
  } else if (params.sort === 'newest') {
    data = data.sort(
      (a: any, b: any) => (b.created_year ?? 0) - (a.created_year ?? 0),
    )
  } else {
    data = data.sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0))
  }

  return {
    data,
    ...buildPagination(payload, limit),
  }
}

export async function getFeaturedAnime(limit = 5) {
  const payload = await fetchJson<any>('/top/anime', {
    page: 1,
    limit,
    sfw: true,
  })

  return (payload?.data ?? []).map(mapAnimeSummary)
}

function toYoutubeEmbed(url?: string | null) {
  if (!url) return null
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/)
  if (!match) return url
  return `https://www.youtube.com/embed/${match[1]}`
}

function formatNumber(value?: number | null) {
  if (typeof value !== 'number') return null
  return value
}

function mapNameList(list?: any[]) {
  return (list ?? []).map((item: any) => ({
    id: item?.mal_id ?? null,
    name: item?.name ?? 'Unknown',
    url: item?.url ?? null,
  }))
}

export async function getAnimeDetails(id: number) {
  const [animePayload, characterPayload, recommendationPayload, statisticsPayload] =
    await Promise.all([
      fetchJson<any>(`/anime/${id}/full`, undefined, DETAIL_CACHE_TTL_MS),
      fetchJson<any>(`/anime/${id}/characters`, undefined, DETAIL_CACHE_TTL_MS).catch(() => null),
      fetchJson<any>(`/anime/${id}/recommendations`, { page: 1 }, DETAIL_CACHE_TTL_MS).catch(
        () => null,
      ),
      fetchJson<any>(`/anime/${id}/statistics`, undefined, DETAIL_CACHE_TTL_MS).catch(() => null),
    ])
  const anime = animePayload?.data

  if (!anime) {
    return null
  }

  const mappedAnime = mapAnimeSummary(anime)
  const studio = pickStudio(anime)

  const relations = (anime?.relations ?? []).flatMap((relation: any) =>
    (relation?.entry ?? []).map((entry: any) => ({
      relation: relation?.relation ?? 'Related',
      id: entry?.mal_id ?? null,
      name: entry?.name ?? 'Unknown',
      type: entry?.type ?? '',
    })),
  )

  const stats = statisticsPayload?.data
  const scoreBreakdown = (stats?.scores ?? []).map((bucket: any) => ({
    score: bucket?.score ?? 0,
    votes: bucket?.votes ?? 0,
    percentage: bucket?.percentage ?? 0,
  }))

  return {
    ...mappedAnime,
    title_english: anime?.title_english || '',
    title_synonyms: anime?.title_synonyms ?? [],
    titles: (anime?.titles ?? []).map((title: any) => ({
      type: title?.type ?? 'Other',
      title: title?.title ?? '',
    })),
    background: (anime?.background || '').trim(),
    aired_string: anime?.aired?.string || '',
    aired_from: anime?.aired?.from || null,
    aired_to: anime?.aired?.to || null,
    broadcast: anime?.broadcast?.string || null,
    duration: anime?.duration || 'Unknown',
    rating: anime?.rating || 'Unknown',
    source: anime?.source || 'Unknown',
    rank: anime?.rank ?? null,
    popularity: anime?.popularity ?? null,
    members: anime?.members ?? 0,
    favorites: anime?.favorites ?? 0,
    scored_by: anime?.scored_by ?? null,
    score: typeof anime?.score === 'number' ? anime.score : mappedAnime.score,
    episodes: anime?.episodes ?? mappedAnime.episodes,
    trailer_url: anime?.trailer?.url || anime?.trailer?.embed_url || null,
    trailer_embed: toYoutubeEmbed(anime?.trailer?.embed_url || anime?.trailer?.url),
    trailer_image:
      anime?.trailer?.images?.maximum_image_url ||
      anime?.trailer?.images?.large_image_url ||
      null,
    studio_id: studio?.mal_id ?? null,
    studio_name: studio?.name || mappedAnime.studio_name,
    studios: mapNameList(anime?.studios),
    producers: mapNameList(anime?.producers),
    licensors: mapNameList(anime?.licensors),
    explicit_genres: mapNameList(anime?.explicit_genres),
    themes_tags: mapNameList(anime?.themes),
    demographics: mapNameList(anime?.demographics),
    opening_themes: anime?.theme?.openings ?? [],
    ending_themes: anime?.theme?.endings ?? [],
    external_links: (anime?.external ?? []).map((item: any) => ({
      name: item?.name ?? 'Link',
      url: item?.url ?? '#',
    })),
    streaming: (anime?.streaming ?? []).map((item: any) => ({
      name: item?.name ?? 'Stream',
      url: item?.url ?? '#',
    })),
    statistics: stats
      ? {
          watching: formatNumber(stats?.watching),
          completed: formatNumber(stats?.completed),
          on_hold: formatNumber(stats?.on_hold),
          dropped: formatNumber(stats?.dropped),
          plan_to_watch: formatNumber(stats?.plan_to_watch),
          total: formatNumber(stats?.total),
          score_breakdown: scoreBreakdown,
        }
      : null,
    characters: (characterPayload?.data ?? []).slice(0, 18).map((entry: any) => {
      const japaneseVA = (entry?.voice_actors ?? []).find(
        (va: any) => va?.language === 'Japanese',
      )
      return {
        id: entry?.character?.mal_id,
        name: entry?.character?.name,
        image: getCharacterImageUrl(entry?.character?.images),
        role: entry?.role || 'Supporting',
        favorites: entry?.favorites ?? 0,
        voice_actor: japaneseVA
          ? {
              id: japaneseVA?.person?.mal_id ?? null,
              name: japaneseVA?.person?.name ?? 'Unknown',
              image: getCharacterImageUrl(japaneseVA?.person?.images),
            }
          : null,
      }
    }),
    relations,
    related_anime: Array.from(
      new Map(
        (recommendationPayload?.data ?? [])
          .map((item: any) => item?.entry)
          .filter(Boolean)
          .map((entry: any) => [
            entry?.mal_id,
            {
              id: entry?.mal_id,
              title: entry?.title || 'Unknown Title',
              cover_image: getImageUrl(entry?.images),
              banner_image: getBannerImageUrl(entry),
              score: null,
              episodes: 0,
              status: '',
            },
          ]),
      ).values(),
    ).slice(0, 4),
  }
}

export async function searchAnime(params: {
  q?: string
  genre?: string
  status?: string
  min_score?: number
  max_score?: number
  sort?: string
  page?: number
  limit?: number
}) {
  const genreId = await resolveGenreId(params.genre)
  const status = STATUS_MAP[(params.status ?? '').toLowerCase()]
  const page = params.page ?? 1
  const limit = params.limit ?? TOP_ANIME_LIMIT

  const payload = await fetchJson<any>('/anime', {
    q: params.q,
    genres: genreId,
    status,
    min_score: params.min_score,
    max_score: params.max_score,
    order_by:
      params.sort === 'popularity' ? 'popularity' : params.sort === 'newest' ? 'start_date' : 'score',
    sort: 'desc',
    page,
    limit,
    sfw: true,
  })

  return {
    data: (payload?.data ?? []).map(mapAnimeSummary),
    ...buildPagination(payload, limit),
  }
}

export async function getCharacterDetails(id: number) {
  // /full sometimes 404s for characters that exist via /anime/:id/characters
  // (Jikan inconsistency). Try /full first, then plain /:id, and only fail if
  // both come back as not-found. The companion /anime call is best-effort.
  let characterPayload: any = null
  try {
    characterPayload = await fetchJson<any>(`/characters/${id}/full`, undefined, DETAIL_CACHE_TTL_MS)
  } catch (err: any) {
    if (err?.status === 404) {
      try {
        characterPayload = await fetchJson<any>(`/characters/${id}`, undefined, DETAIL_CACHE_TTL_MS)
      } catch (err2: any) {
        if (err2?.status === 404) return null
        throw err2
      }
    } else {
      throw err
    }
  }

  const animePayload = await fetchJson<any>(`/characters/${id}/anime`, undefined, DETAIL_CACHE_TTL_MS).catch(
    () => null,
  )

  const character = characterPayload?.data

  if (!character) {
    return null
  }

  return {
    id: character?.mal_id,
    name: character?.name,
    name_kanji: character?.name_kanji || '',
    nicknames: character?.nicknames ?? [],
    image: getCharacterImageUrl(character?.images),
    favorites: character?.favorites ?? 0,
    description: (character?.about || '').trim() || 'Biography unavailable.',
    appears_in: (animePayload?.data ?? []).slice(0, 12).map((entry: any) => ({
      id: entry?.anime?.mal_id,
      title: entry?.anime?.title || 'Unknown Title',
      cover_image: getImageUrl(entry?.anime?.images),
      role: entry?.role || 'Unknown',
    })),
  }
}

function getProducerTitle(producer: any) {
  return producer?.titles?.[0]?.title || producer?.name || 'Unknown Studio'
}

export async function getStudioDetails(id: number) {
  const [producerPayload, animePayload] = await Promise.all([
    fetchJson<any>(`/producers/${id}/full`),
    fetchJson<any>('/anime', {
      producers: id,
      order_by: 'score',
      sort: 'desc',
      page: 1,
      limit: 20,
      sfw: true,
    }),
  ])

  const producer = producerPayload?.data

  if (!producer) {
    return null
  }

  return {
    id: producer?.mal_id,
    name: getProducerTitle(producer),
    name_jp: producer?.titles?.find((title: any) => title.type === 'Japanese')?.title || '',
    logo: getImageUrl(producer?.images),
    description: (producer?.about || '').trim() || 'Studio profile unavailable.',
    favorites: producer?.favorites ?? 0,
    established: producer?.established || null,
    count: producer?.count ?? animePayload?.pagination?.items?.total ?? 0,
    anime: (animePayload?.data ?? []).map(mapAnimeSummary),
  }
}
