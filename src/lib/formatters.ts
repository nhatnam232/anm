/**
 * formatters.ts
 * Shared utility functions for cleaning and localizing data fields.
 */

// ─── Status translation ───────────────────────────────────────────────────────

const STATUS_VI: Record<string, string> = {
  Ongoing: 'Đang chiếu',
  Finished: 'Hoàn thành',
  Upcoming: 'Sắp chiếu',
  'Not yet aired': 'Chưa chiếu',
  Airing: 'Đang chiếu',
  'Currently Airing': 'Đang chiếu',
  'Finished Airing': 'Hoàn thành',
}

export function localizeStatus(status: string | null | undefined, lang: string): string {
  if (!status) return lang === 'vi' ? 'Không rõ' : 'Unknown'
  if (lang === 'vi') return STATUS_VI[status] ?? status
  return status
}

// ─── Genre translation ────────────────────────────────────────────────────────

const GENRE_VI: Record<string, string> = {
  Action: 'Hành động',
  Adventure: 'Phiêu lưu',
  Comedy: 'Hài hước',
  Drama: 'Kịch tính',
  Fantasy: 'Kỳ ảo',
  Horror: 'Kinh dị',
  'Martial Arts': 'Võ thuật',
  Mecha: 'Robot',
  Music: 'Âm nhạc',
  Mystery: 'Bí ẩn',
  Psychological: 'Tâm lý',
  Romance: 'Lãng mạn',
  'Sci-Fi': 'Khoa học viễn tưởng',
  'Slice of Life': 'Đời thường',
  Sports: 'Thể thao',
  Supernatural: 'Siêu nhiên',
  Thriller: 'Hồi hộp',
  Ecchi: 'Ecchi',
  Harem: 'Harem',
  Isekai: 'Isekai',
  Josei: 'Josei',
  Kids: 'Thiếu nhi',
  Magic: 'Phép thuật',
  Military: 'Quân sự',
  Parody: 'Nhại',
  Police: 'Cảnh sát',
  'Post-Apocalyptic': 'Hậu tận thế',
  School: 'Học đường',
  Seinen: 'Seinen',
  Shoujo: 'Shoujo',
  'Shoujo Ai': 'Shoujo Ai',
  Shounen: 'Shounen',
  'Shounen Ai': 'Shounen Ai',
  Space: 'Vũ trụ',
  'Super Power': 'Siêu năng lực',
  Vampire: 'Ma cà rồng',
  Yaoi: 'Yaoi',
  Yuri: 'Yuri',
  Demons: 'Ác quỷ',
  Game: 'Trò chơi',
  Historical: 'Lịch sử',
  Samurai: 'Samurai',
}

export function localizeGenre(genre: string | null | undefined, lang: string): string {
  if (!genre) return ''
  if (lang === 'vi') return GENRE_VI[genre] ?? genre
  return genre
}

export function localizeGenres(genres: string[] | null | undefined, lang: string): string[] {
  if (!genres) return []
  return genres.map((g) => localizeGenre(g, lang))
}

// ─── Season translation ───────────────────────────────────────────────────────

const SEASON_VI: Record<string, string> = {
  Winter: 'Đông',
  Spring: 'Xuân',
  Summer: 'Hè',
  Fall: 'Thu',
  WINTER: 'Đông',
  SPRING: 'Xuân',
  SUMMER: 'Hè',
  FALL: 'Thu',
}

/**
 * Localize season strings like "Fall 2022" → "Thu 2022".
 * Accepts pure season ("Fall"), full string ("Fall 2022"),
 * or AniList enum format ("FALL").
 */
export function localizeSeason(season: string | null | undefined, lang: string): string {
  if (!season) return lang === 'vi' ? 'Không rõ' : 'Unknown'
  if (lang !== 'vi') {
    // Normalize "FALL 2022" → "Fall 2022" for English display
    return season.replace(/^(WINTER|SPRING|SUMMER|FALL)\b/i, (m) =>
      m.charAt(0).toUpperCase() + m.slice(1).toLowerCase(),
    )
  }
  // Vietnamese: replace English season name with VN equivalent
  return season.replace(/\b(Winter|Spring|Summer|Fall|WINTER|SPRING|SUMMER|FALL)\b/g, (m) => SEASON_VI[m] ?? m)
}

// ─── Episode count cleaning ───────────────────────────────────────────────────

/**
 * Cleans episode count: if value is "?", null, 0, or undefined → returns null.
 * Caller should display "Chưa rõ" / "Unknown" when null.
 */
export function cleanEpisodeCount(episodes: number | string | null | undefined): number | null {
  if (episodes === null || episodes === undefined) return null
  if (episodes === '?' || episodes === 0 || episodes === '0') return null
  const n = typeof episodes === 'string' ? Number.parseInt(episodes, 10) : episodes
  if (Number.isNaN(n) || n <= 0) return null
  return n
}

/**
 * Format episode count for display.
 * Returns "Chưa rõ" / "Unknown" when null.
 */
export function formatEpisodes(
  episodes: number | string | null | undefined,
  lang: string,
  suffix = true,
): string {
  const n = cleanEpisodeCount(episodes)
  if (n === null) return lang === 'vi' ? 'Chưa rõ' : 'Unknown'
  if (!suffix) return String(n)
  return `${n} ${lang === 'vi' ? 'tập' : 'eps'}`
}

// ─── Score cleaning ───────────────────────────────────────────────────────────

export function cleanScore(score: number | string | null | undefined): number | null {
  if (score === null || score === undefined || score === '?' || score === 0) return null
  const n = typeof score === 'string' ? Number.parseFloat(score) : score
  if (Number.isNaN(n) || n <= 0) return null
  return n
}

// ─── Duration cleaning & localization ────────────────────────────────────────

/**
 * Localizes duration strings like "24 min per ep" → "24 phút/tập"
 */
export function cleanDuration(duration: string | null | undefined, lang: string): string {
  if (!duration || duration === '?' || duration.trim() === '') {
    return lang === 'vi' ? 'Chưa rõ' : 'Unknown'
  }
  if (lang !== 'vi') return duration

  // Localize common patterns
  return duration
    .replace(/(\d+)\s*min(?:utes?)?\s*per\s*ep(?:isode)?/gi, '$1 phút/tập')
    .replace(/(\d+)\s*hr(?:s)?\s*(\d+)\s*min(?:utes?)?\s*per\s*ep(?:isode)?/gi, '$1 giờ $2 phút/tập')
    .replace(/(\d+)\s*hr(?:s)?\s*per\s*ep(?:isode)?/gi, '$1 giờ/tập')
    .replace(/(\d+)\s*min(?:utes?)?/gi, '$1 phút')
    .replace(/\bper\s*ep(?:isode)?\b/gi, '/tập')
    .replace(/\bunknown\b/gi, 'Chưa rõ')
}

// ─── Generic unknown field ────────────────────────────────────────────────────

export function orUnknown(value: string | null | undefined, lang: string): string {
  if (!value || value === '?' || value.trim() === '') {
    return lang === 'vi' ? 'Chưa rõ' : 'Unknown'
  }
  return value
}

// ─── Watch status localization ────────────────────────────────────────────────

export function localizeWatchStatus(
  status: string | null | undefined,
  lang: string,
): string {
  if (!status) return ''
  const map: Record<string, { vi: string; en: string }> = {
    watching:       { vi: 'Đang xem',  en: 'Watching' },
    completed:      { vi: 'Đã xem',    en: 'Completed' },
    plan_to_watch:  { vi: 'Muốn xem',  en: 'Plan to Watch' },
    dropped:        { vi: 'Đã bỏ',     en: 'Dropped' },
    on_hold:        { vi: 'Tạm dừng',  en: 'On Hold' },
  }
  const entry = map[status]
  if (!entry) return status
  return lang === 'vi' ? entry.vi : entry.en
}
