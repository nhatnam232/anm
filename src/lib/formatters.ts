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
