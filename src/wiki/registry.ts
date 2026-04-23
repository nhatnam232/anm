import type { WikiRegistry, WikiCharacter, WikiStory } from './types'

/**
 * Source-of-truth registry for the Wiki.
 *
 * Currently file-backed (committed JSON inside the bundle) so the Wiki
 * can ship without any extra backend. Migrate to a Supabase table later
 * — the lookup helpers below are designed to be swappable.
 *
 * Slug rules:
 *   - lowercase, kebab-case, ASCII only.
 *   - Reused as the URL path (`/wiki/character/<slug>`).
 *   - Used inside `[[Name|slug]]` tags in body text.
 *
 * Data sources (all images via CDN AniList / Anilist Co.):
 *   - AniList GraphQL public IDs (anilistCharacterId / anilistAnimeId)
 *   - Bio summaries hand-written in Vietnamese to match site tone
 *   - Cross-references via `[[Display Name|slug]]` tags so the WikiParser
 *     turns them into hover-cards + deep links automatically.
 */
const SEED_CHARACTERS: WikiCharacter[] = [
  // ─── Frieren: Beyond Journey's End ─────────────────────────────────────
  {
    id: 'frieren',
    name: 'Frieren',
    anilistCharacterId: 219472,
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b219472-uHfeszSE0Y4u.png',
    shortBio: 'Pháp sư Elf trường thọ, từng đồng hành cùng đoàn anh hùng Himmel để đánh bại Ma Vương.',
    bio:
      'Frieren là một pháp sư tộc Elf đã sống hàng nghìn năm. Sau khi cùng [[Himmel|himmel]] và đồng đội đánh bại Ma Vương, cô bắt đầu một hành trình mới — không phải để chiến đấu, mà để hiểu loài người. Câu chuyện của cô được kể trong [[Frieren: Beyond Journey\'s End|frieren-beyond]].',
    affiliations: ['Hero Party'],
    storyIds: ['frieren-beyond'],
    updatedAt: '2026-04-23',
  },
  {
    id: 'himmel',
    name: 'Himmel',
    anilistCharacterId: 220033,
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b220033-x73R03dpvBKL.png',
    shortBio: 'Kiếm sĩ anh hùng dẫn dắt đoàn đánh bại Ma Vương, có tình cảm sâu sắc với Frieren.',
    bio:
      'Himmel là thủ lĩnh của đoàn anh hùng đánh bại Ma Vương. Anh là một con người, nên tuổi thọ ngắn hơn rất nhiều so với [[Frieren|frieren]]. Cái chết của anh nhiều thập kỷ sau cuộc chiến chính là động lực khiến Frieren bắt đầu cuộc hành trình tìm hiểu lại nhân loại.',
    affiliations: ['Hero Party'],
    storyIds: ['frieren-beyond'],
    updatedAt: '2026-04-23',
  },

  // ─── Demon Slayer (Kimetsu no Yaiba) ─────────────────────────────────
  {
    id: 'tanjiro-kamado',
    name: 'Tanjiro Kamado',
    anilistCharacterId: 126514,
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b126514-OKuf3a82P0n3.png',
    shortBio: 'Cậu bé hiền lành mang gánh nặng tìm cách biến em gái Nezuko trở lại làm người.',
    bio:
      'Tanjiro Kamado là nhân vật chính của [[Kimetsu no Yaiba|kimetsu-no-yaiba]]. Sau khi gia đình bị quỷ Muzan thảm sát và em gái [[Nezuko Kamado|nezuko-kamado]] bị biến thành quỷ, cậu gia nhập Đoàn Diệt Quỷ với hai mục tiêu: trả thù và tìm cách phục hồi nhân tính cho em.',
    affiliations: ['Demon Slayer Corps'],
    storyIds: ['kimetsu-no-yaiba'],
    updatedAt: '2026-04-23',
  },
  {
    id: 'nezuko-kamado',
    name: 'Nezuko Kamado',
    anilistCharacterId: 126515,
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b126515-DVbVJC7s0epH.png',
    shortBio: 'Em gái Tanjiro, bị biến thành quỷ nhưng vẫn giữ lương tâm và bảo vệ con người.',
    bio:
      'Nezuko Kamado là em gái của [[Tanjiro Kamado|tanjiro-kamado]]. Khác với những con quỷ thông thường, cô vẫn giữ được lương tâm và sức mạnh ý chí, không ăn thịt người. Sự tồn tại của cô là chìa khóa cho cuộc chiến chống lại Muzan trong [[Kimetsu no Yaiba|kimetsu-no-yaiba]].',
    affiliations: ['Demon Slayer Corps (companion)'],
    storyIds: ['kimetsu-no-yaiba'],
    updatedAt: '2026-04-23',
  },

  // ─── Attack on Titan ──────────────────────────────────────────────────
  {
    id: 'eren-yeager',
    name: 'Eren Yeager',
    anilistCharacterId: 40882,
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b40882-O8dZmBMpLzeu.png',
    shortBio: 'Thanh niên ám ảnh tự do, người sở hữu Titan Tấn Công và Titan Kiến Tạo.',
    bio:
      'Eren Yeager là nhân vật trung tâm của [[Attack on Titan|attack-on-titan]]. Sau khi chứng kiến mẹ bị Titan ăn thịt, cậu thề sẽ tiêu diệt mọi Titan. Hành trình của Eren biến thành một câu hỏi đạo đức phức tạp khi cậu phát hiện sự thật về thế giới bên ngoài bức tường.',
    affiliations: ['Survey Corps', 'Yeagerist'],
    storyIds: ['attack-on-titan'],
    updatedAt: '2026-04-23',
  },
  {
    id: 'mikasa-ackerman',
    name: 'Mikasa Ackerman',
    anilistCharacterId: 40881,
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b40881-NKwbk0gM6Vd9.png',
    shortBio: 'Chị em họ của Eren, chiến binh xuất sắc nhất của thế hệ 104.',
    bio:
      'Mikasa Ackerman được gia đình [[Eren Yeager|eren-yeager]] cứu khỏi tay kẻ buôn người và lớn lên cùng anh như chị em. Cô là chiến binh xuất sắc nhất tại Survey Corps trong [[Attack on Titan|attack-on-titan]], và mang trong mình dòng máu Ackerman với sức mạnh phi thường.',
    affiliations: ['Survey Corps'],
    storyIds: ['attack-on-titan'],
    updatedAt: '2026-04-23',
  },

  // ─── Jujutsu Kaisen ───────────────────────────────────────────────────
  {
    id: 'yuji-itadori',
    name: 'Yuji Itadori',
    anilistCharacterId: 164471,
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b164471-PUyTpGaaybLk.png',
    shortBio: 'Học sinh trung học nuốt phải ngón tay Sukuna và trở thành "vật chứa" của vua chú thuật.',
    bio:
      'Yuji Itadori là nhân vật chính của [[Jujutsu Kaisen|jujutsu-kaisen]]. Sau khi nuốt một trong 20 ngón tay của Ryomen Sukuna để cứu bạn, cậu trở thành vật chứa của vua chú thuật và buộc phải gia nhập trường Pháp thuật Tokyo để kiểm soát sức mạnh đó.',
    affiliations: ['Tokyo Jujutsu High'],
    storyIds: ['jujutsu-kaisen'],
    updatedAt: '2026-04-23',
  },
  {
    id: 'satoru-gojo',
    name: 'Satoru Gojo',
    anilistCharacterId: 132374,
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b132374-CWHfu8sH8tSg.png',
    shortBio: 'Pháp sư mạnh nhất hiện tại, sở hữu Six Eyes và kỹ thuật Limitless.',
    bio:
      'Gojo Satoru là giáo viên của [[Yuji Itadori|yuji-itadori]] và là pháp sư mạnh nhất trong thế giới [[Jujutsu Kaisen|jujutsu-kaisen]]. Anh sở hữu hai dị bẩm di truyền: Six Eyes và Limitless, biến anh thành thực thể gần như bất khả chiến bại.',
    affiliations: ['Tokyo Jujutsu High'],
    storyIds: ['jujutsu-kaisen'],
    updatedAt: '2026-04-23',
  },

  // ─── One Piece ────────────────────────────────────────────────────────
  {
    id: 'monkey-d-luffy',
    name: 'Monkey D. Luffy',
    anilistCharacterId: 40,
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b40-K2QxQXIAQGmV.png',
    shortBio: 'Thuyền trưởng Băng Mũ Rơm, người mơ ước trở thành Vua Hải Tặc.',
    bio:
      'Luffy là thuyền trưởng và linh hồn của Băng Mũ Rơm trong [[One Piece|one-piece]]. Sau khi ăn trái Gomu Gomu, cơ thể anh có khả năng co giãn như cao su. Mục tiêu cuối cùng của anh là tìm thấy kho báu One Piece và trở thành Vua Hải Tặc.',
    affiliations: ['Straw Hat Pirates'],
    storyIds: ['one-piece'],
    updatedAt: '2026-04-23',
  },

  // ─── Naruto ───────────────────────────────────────────────────────────
  {
    id: 'naruto-uzumaki',
    name: 'Naruto Uzumaki',
    anilistCharacterId: 17,
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/17.jpg',
    shortBio: 'Ninja làng Lá ấp ủ giấc mơ trở thành Hokage và được cả làng công nhận.',
    bio:
      'Naruto Uzumaki là ninja làng Konohagakure trong [[Naruto|naruto]]. Bị xa lánh từ nhỏ vì mang trong mình Cửu Vĩ Hồ Ly, cậu nỗ lực vượt qua mọi định kiến để chứng minh giá trị bản thân và bảo vệ làng. Câu chuyện xoay quanh tình bạn, sự bền chí và ý nghĩa của "Nindo".',
    affiliations: ['Konohagakure', 'Team 7'],
    storyIds: ['naruto'],
    updatedAt: '2026-04-23',
  },
]

const SEED_STORIES: WikiStory[] = [
  {
    id: 'frieren-beyond',
    title: 'Frieren: Beyond Journey\'s End',
    anilistAnimeId: 154587,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-fJzOkbnwxMUI.png',
    shortSummary:
      'Câu chuyện theo chân pháp sư Elf [[Frieren|frieren]] sau khi cuộc chiến đánh bại Ma Vương kết thúc.',
    body:
      `Sau cuộc chiến đánh bại Ma Vương, đoàn anh hùng giải tán. [[Frieren|frieren]], pháp sư Elf trường thọ, hứa với bạn bè rằng cô sẽ quay lại sau 50 năm. Nhưng với cô, 50 năm chỉ như chớp mắt.

Khi đoàn tụ, cô phát hiện đồng đội con người đã già đi rất nhiều. Cái chết của [[Himmel|himmel]] khiến Frieren nhận ra cô chưa bao giờ thực sự hiểu các bạn của mình. Hành trình mới bắt đầu — không phải để chinh phục, mà để học cách yêu thương đúng cách.

Tác phẩm được viết bởi Kanehito Yamada và minh hoạ bởi Tsukasa Abe, đã đoạt nhiều giải thưởng manga lớn ở Nhật.`,
    characterIds: ['frieren', 'himmel'],
    updatedAt: '2026-04-23',
  },
  {
    id: 'kimetsu-no-yaiba',
    title: 'Kimetsu no Yaiba (Demon Slayer)',
    anilistAnimeId: 101922,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-PEn1CTc93blC.jpg',
    shortSummary:
      '[[Tanjiro Kamado|tanjiro-kamado]] gia nhập Đoàn Diệt Quỷ để cứu em gái [[Nezuko Kamado|nezuko-kamado]].',
    body:
      `Vào thời Taisho ở Nhật Bản, [[Tanjiro Kamado|tanjiro-kamado]] sống cuộc sống bình yên với gia đình bằng nghề bán than. Một ngày nọ, cả gia đình bị thảm sát bởi quỷ — chỉ còn em gái [[Nezuko Kamado|nezuko-kamado]] sống sót, nhưng đã bị biến thành quỷ.

Tanjiro thề sẽ tìm cách trả lại nhân tính cho em và trả thù cho gia đình. Hành trình đưa cậu gia nhập Đoàn Diệt Quỷ — tổ chức bí mật chuyên săn lùng quỷ. Tác phẩm của Koyoharu Gotouge đã trở thành hiện tượng văn hóa toàn cầu.`,
    characterIds: ['tanjiro-kamado', 'nezuko-kamado'],
    updatedAt: '2026-04-23',
  },
  {
    id: 'attack-on-titan',
    title: 'Attack on Titan',
    anilistAnimeId: 16498,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-C6FPmWm59CyP.jpg',
    shortSummary:
      'Nhân loại bị giam trong các bức tường khổng lồ để tránh Titan. [[Eren Yeager|eren-yeager]] thề sẽ tiêu diệt chúng.',
    body:
      `Hơn 100 năm trước, nhân loại bị đẩy đến bờ vực tuyệt chủng bởi những Titan ăn thịt người. Số ít sống sót xây ba bức tường khổng lồ — Maria, Rose, Sina — để bảo vệ thành phố cuối cùng.

[[Eren Yeager|eren-yeager]] và bạn thân [[Mikasa Ackerman|mikasa-ackerman]] sống yên ổn cho đến ngày Titan Khổng Lồ phá vỡ tường Maria. Sau khi mẹ bị ăn thịt trước mặt, Eren thề sẽ tiêu diệt mọi Titan và gia nhập Survey Corps.

Câu chuyện của Hajime Isayama dần lột tả những bí mật khủng khiếp về thế giới bên ngoài bức tường, biến từ shounen action thành tragedy về dân tộc và chiến tranh.`,
    characterIds: ['eren-yeager', 'mikasa-ackerman'],
    updatedAt: '2026-04-23',
  },
  {
    id: 'jujutsu-kaisen',
    title: 'Jujutsu Kaisen',
    anilistAnimeId: 113415,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-bbBWj4pEFseh.jpg',
    shortSummary:
      'Học sinh [[Yuji Itadori|yuji-itadori]] nuốt phải ngón tay vua chú thuật và bước vào thế giới pháp thuật.',
    body:
      `Trong một thế giới song song nơi chú nguyền có thật, [[Yuji Itadori|yuji-itadori]] — một học sinh trung học bình thường — vô tình nuốt phải một trong 20 ngón tay của Ryomen Sukuna, vua chú thuật cổ đại. Để cứu bạn, cậu chấp nhận trở thành "vật chứa" của Sukuna.

Bị Đại Trường Pháp Thuật Tokyo phát hiện, Yuji được gửi đến đó học cách kiểm soát sức mạnh và phải nuốt nốt 19 ngón tay còn lại để tiêu diệt vĩnh viễn Sukuna. Tại đây cậu gặp giáo viên [[Satoru Gojo|satoru-gojo]] — pháp sư mạnh nhất thời đại.

Tác phẩm của Gege Akutami nổi tiếng với hệ thống chiến đấu phức tạp và những trận chiến cao trào.`,
    characterIds: ['yuji-itadori', 'satoru-gojo'],
    updatedAt: '2026-04-23',
  },
  {
    id: 'one-piece',
    title: 'One Piece',
    anilistAnimeId: 21,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-tXMN3Y20PIL9.png',
    shortSummary:
      '[[Monkey D. Luffy|monkey-d-luffy]] và Băng Mũ Rơm tìm kiếm kho báu huyền thoại One Piece.',
    body:
      `Hơn 25 năm trước, Vua Hải Tặc Gold Roger trước khi bị xử tử đã tuyên bố cất giấu kho báu vĩ đại nhất thế giới — One Piece — ở đâu đó trên Grand Line. Câu nói đó mở đầu kỷ nguyên hải tặc vĩ đại.

[[Monkey D. Luffy|monkey-d-luffy]], cậu bé từng ăn trái Gomu Gomu, ấp ủ giấc mơ trở thành Vua Hải Tặc. Cùng Băng Mũ Rơm — Zoro, Nami, Usopp, Sanji, Chopper, Robin, Franky, Brook, Jinbe — anh chinh phục Grand Line và tìm kiếm sự thật bị che giấu.

Tác phẩm của Eiichiro Oda là manga bán chạy nhất mọi thời đại với hơn 500 triệu bản trên toàn thế giới.`,
    characterIds: ['monkey-d-luffy'],
    updatedAt: '2026-04-23',
  },
  {
    id: 'naruto',
    title: 'Naruto',
    anilistAnimeId: 20,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20-XK2MQEeOCBpd.png',
    shortSummary:
      '[[Naruto Uzumaki|naruto-uzumaki]] — ninja con nhà cô độc — phấn đấu trở thành Hokage.',
    body:
      `[[Naruto Uzumaki|naruto-uzumaki]] sinh ra mang trong mình Cửu Vĩ Hồ Ly — quái thú từng tàn phá làng Konoha 12 năm trước. Bị dân làng xa lánh, cậu lớn lên cô độc nhưng luôn ấp ủ ước mơ trở thành Hokage để được công nhận.

Câu chuyện của Masashi Kishimoto theo chân Naruto từ một học sinh ninja bốc đồng đến anh hùng cứu thế giới. Trên hành trình đó, cậu xây dựng tình bạn sâu đậm với Sasuke và Sakura — Team 7 — và đối mặt với những bí mật về dòng họ Uzumaki, về tổ chức Akatsuki và về vận mệnh thế giới ninja.

Naruto là một trong "Big 3" của shounen anime cùng với [[One Piece|one-piece]] và Bleach.`,
    characterIds: ['naruto-uzumaki'],
    updatedAt: '2026-04-23',
  },
]

export const WIKI_REGISTRY: WikiRegistry = {
  characters: Object.fromEntries(SEED_CHARACTERS.map((c) => [c.id, c])),
  stories:    Object.fromEntries(SEED_STORIES.map((s) => [s.id, s])),
}

// ─── Lookup helpers ────────────────────────────────────────────────────────

export function getCharacter(id: string): WikiCharacter | null {
  return WIKI_REGISTRY.characters[id] ?? null
}

export function getStory(id: string): WikiStory | null {
  return WIKI_REGISTRY.stories[id] ?? null
}

export function listCharacters(): WikiCharacter[] {
  return Object.values(WIKI_REGISTRY.characters)
}

export function listStories(): WikiStory[] {
  return Object.values(WIKI_REGISTRY.stories)
}

/**
 * Reverse lookup: given an AniList character ID (used by the main-app's
 * `<CharacterDetail>` page), find the matching wiki entry. Returns null
 * if the character isn't yet documented in the wiki.
 */
export function findCharacterByAnilistId(anilistId: number): WikiCharacter | null {
  for (const c of listCharacters()) {
    if (c.anilistCharacterId === anilistId) return c
  }
  return null
}

export function findStoryByAnilistAnimeId(animeId: number): WikiStory | null {
  for (const s of listStories()) {
    if (s.anilistAnimeId === animeId) return s
  }
  return null
}

/** Naive fuzzy search over character names (used by the omnibar). */
export function searchCharacters(query: string, limit = 8): WikiCharacter[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return listCharacters()
    .filter((c) => c.name.toLowerCase().includes(q) || c.id.includes(q))
    .slice(0, limit)
}
