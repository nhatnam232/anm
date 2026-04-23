import type { WikiRegistry, WikiCharacter, WikiStory } from './types'

/**
 * Source-of-truth registry for the Wiki.
 *
 * File-backed (committed JSON inside the bundle) so the Wiki ships without
 * any extra backend. Easily migratable to a Supabase table later — the
 * lookup helpers below are designed to be swappable.
 *
 * Slug rules:
 *   - lowercase, kebab-case, ASCII only.
 *   - Reused as the URL path (`/wiki/character/<slug>`).
 *   - Used inside `[[Name|slug]]` tags in body text.
 *
 * Data sources:
 *   - AniList GraphQL public IDs (anilistCharacterId / anilistAnimeId).
 *   - Plot summaries paraphrased + expanded by hand from official synopses
 *     and well-known fandom wikis (Naruto Wiki, One Piece Wiki, AoT Wiki, etc).
 *   - Cross-references via `[[Display Name|slug]]` tags so the WikiParser
 *     turns them into hover-cards + deep links automatically.
 *
 * IMPORTANT: when slug resolution fails locally (e.g. a `/wiki/character/12345`
 * URL where 12345 is an AniList ID we haven't curated), the page falls back
 * to the `useWikiCharacter` / `useWikiStory` live-fetch hooks which call
 * the existing `/api/character/:id` and `/api/anime/:id` endpoints. So
 * EVERY AniList entity gets a wiki page automatically — this registry is
 * just for the curated, hand-written ones.
 */

const SEED_CHARACTERS: WikiCharacter[] = [
  // ─── Frieren: Beyond Journey's End ─────────────────────────────────────
  {
    id: 'frieren',
    name: 'Frieren',
    // anilistCharacterId intentionally null — IDs were unreliable. Cross-link
    // is now driven by wikipediaSlug + name match.
    anilistCharacterId: null,
    wikipediaSlug: 'Frieren',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b219472-uHfeszSE0Y4u.png',
    shortBio: 'Pháp sư Elf trường thọ, từng đồng hành cùng đoàn anh hùng Himmel để đánh bại Ma Vương. / A long-lived elven mage who once accompanied the Hero Himmel to defeat the Demon King.',
    bio:
      `Frieren là một pháp sư tộc Elf đã sống hàng nghìn năm. Cô là thành viên duy nhất còn lại của đoàn anh hùng [[Himmel|himmel]] đã đánh bại Ma Vương 80 năm trước trong [[Frieren: Beyond Journey's End|frieren-beyond]].

Khác biệt thời gian giữa Elf và con người là chủ đề trung tâm của câu chuyện — với Frieren, 50 hay 100 năm chỉ như vài tháng. Sau cái chết của Himmel, cô nhận ra mình chưa bao giờ thực sự cố gắng hiểu các bạn đồng hành con người. Hành trình mới của cô không phải để chiến đấu, mà để học cách yêu thương và để hiểu thứ mà thời gian thực sự có ý nghĩa.

**Khả năng:** Một trong những pháp sư mạnh nhất từng sống. Chuyên thu thập và nghiên cứu mọi loại phép thuật — từ phép vô hại như tạo ra trường hoa, cho đến phép sát thương cấp cao như Zoltraak. Trong suốt chiều dài của câu chuyện, cô đào tạo học trò [[Fern|fern]] và [[Stark|stark]].

**Tính cách:** Lạnh lùng, ít biểu cảm, thường lơ đễnh, nhưng giấu bên trong là sự ấm áp sâu sắc với những người cô coi trọng. Hài hước đặc trưng của cô đến từ việc cô không hiểu cảm xúc con người theo cách thông thường.

— English —

Frieren is an elven mage who has lived for over a thousand years. She is the only surviving member of the Hero's Party — led by [[Himmel|himmel]] — that defeated the Demon King 80 years before the events of [[Frieren: Beyond Journey's End|frieren-beyond]].

The asymmetry of time between elves and humans is the central theme of the story. To Frieren, 50 or 100 years feels like only a few months. After Himmel's death, she realizes she had never truly tried to understand her human companions. Her new journey is not to fight, but to learn how to love and to understand what time truly means.`,
    affiliations: ['Hero Party', 'Mage Association'],
    storyIds: ['frieren-beyond'],
    updatedAt: '2026-04-23',
  },
  {
    id: 'himmel',
    name: 'Himmel',
    anilistCharacterId: null,
    wikipediaSlug: 'Frieren', // No standalone Wikipedia page — falls back to series page.
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b220033-x73R03dpvBKL.png',
    shortBio: 'Kiếm sĩ anh hùng dẫn dắt đoàn đánh bại Ma Vương, có tình cảm sâu sắc với Frieren. / The hero swordsman who led the party to defeat the Demon King, deeply in love with Frieren.',
    bio:
      `Himmel là thủ lĩnh của đoàn anh hùng đã đánh bại Ma Vương trong cuộc chiến vĩ đại 80 năm trước. Là một con người, anh có tuổi thọ ngắn hơn rất nhiều so với [[Frieren|frieren]] — và sự thật đó định hình toàn bộ câu chuyện của họ.

Anh nổi tiếng với lòng tốt vô điều kiện và thói quen giúp đỡ bất cứ ai trên đường đi. Trong khi Frieren coi cuộc phiêu lưu chỉ là một khoảnh khắc thoáng qua, Himmel xem từng ngày bên cô là báu vật.

**Mối quan hệ với Frieren:** Anh có tình cảm sâu đậm với Frieren mà cô chỉ nhận ra sau khi anh đã chết. Cảnh đám tang của anh — nơi Frieren khóc lần đầu — là một trong những phân cảnh được khen ngợi nhất trong manga hiện đại.

— English —

Himmel was the leader of the Hero's Party that defeated the Demon King 80 years before the present timeline. As a human, his lifespan was vastly shorter than [[Frieren|frieren]]'s — a truth that shapes their entire story.

He is famous for his unconditional kindness, regularly stopping to help strangers on the road. While Frieren saw their adventure as a fleeting moment, Himmel treasured every day with her.`,
    affiliations: ['Hero Party'],
    storyIds: ['frieren-beyond'],
    updatedAt: '2026-04-23',
  },

  // ─── Demon Slayer (Kimetsu no Yaiba) ─────────────────────────────────
  {
    id: 'tanjiro-kamado',
    name: 'Tanjiro Kamado',
    anilistCharacterId: null,
    wikipediaSlug: 'Tanjiro_Kamado',
    wikipediaSlugVi: 'Kamado_Tanjirou',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b126514-OKuf3a82P0n3.png',
    shortBio: 'Cậu bé hiền lành mang gánh nặng tìm cách biến em gái Nezuko trở lại làm người. / A kind-hearted boy carrying the burden of turning his sister Nezuko back into a human.',
    bio:
      `Tanjiro Kamado là nhân vật chính của [[Kimetsu no Yaiba|kimetsu-no-yaiba]]. Sống thời Taisho ở Nhật Bản, cậu là con trai cả của một gia đình nông dân nghèo bán than ở miền núi.

Vào một ngày đông giá lạnh, sau khi xuống làng bán than, Tanjiro trở về và phát hiện cả gia đình đã bị thảm sát bởi quỷ Muzan Kibutsuji. Người duy nhất còn sống sót — em gái [[Nezuko Kamado|nezuko-kamado]] — đã bị biến thành quỷ.

**Hành trình:** Tanjiro thề sẽ tìm cách phục hồi nhân tính cho em và trả thù cho gia đình. Cậu được kiếm sĩ Giyu Tomioka giới thiệu đến Đoàn Diệt Quỷ và bắt đầu hai năm khổ luyện dưới chỉ dạy của Sakonji Urokodaki.

**Khả năng:**
- **Khứu giác siêu nhân:** Có thể đánh hơi cảm xúc và nhận diện kẻ thù.
- **Hơi thở Nước → Hơi thở Mặt Trời (Hinokami Kagura):** Phong cách kiếm thuật cổ xưa nhất, di sản từ tổ tiên.
- **Tinh thần bất khuất:** Sức bền và ý chí phi thường ngay cả khi bị thương nặng.

**Tính cách:** Hiền lành, đồng cảm, không bao giờ căm thù quỷ đến mức không thể thương tiếc khi chúng chết. Cảm xúc cuối cùng của những con quỷ Tanjiro giết là yên bình.

— English —

Tanjiro Kamado is the protagonist of [[Kimetsu no Yaiba|kimetsu-no-yaiba]]. Set in Taisho-era Japan, he is the eldest son of a poor mountain charcoal-seller family.

After returning from selling charcoal in the village one winter day, he found his entire family slaughtered by the demon Muzan Kibutsuji. The only survivor — his sister [[Nezuko Kamado|nezuko-kamado]] — had been turned into a demon. He swore to find a cure for her and avenge his family by joining the Demon Slayer Corps.`,
    affiliations: ['Demon Slayer Corps', 'Hashira candidate'],
    storyIds: ['kimetsu-no-yaiba'],
    updatedAt: '2026-04-23',
  },
  {
    id: 'nezuko-kamado',
    name: 'Nezuko Kamado',
    anilistCharacterId: null,
    wikipediaSlug: 'Nezuko_Kamado',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b126515-DVbVJC7s0epH.png',
    shortBio: 'Em gái Tanjiro, bị biến thành quỷ nhưng vẫn giữ lương tâm và bảo vệ con người. / Tanjiro\'s sister, turned into a demon but retains her humanity and protects humans.',
    bio:
      `Nezuko Kamado là em gái của [[Tanjiro Kamado|tanjiro-kamado]]. Cô bị quỷ vương Muzan biến thành quỷ vào ngày gia đình bị tàn sát, nhưng nhờ ý chí kiên cường và máu của Muzan đặc biệt phản ứng trong cô, Nezuko không tấn công người mà còn bảo vệ họ.

**Đặc điểm độc nhất:**
- **Không ăn thịt người:** Khác mọi quỷ khác, cô ngủ thay vì ăn.
- **Chống lại ánh mặt trời:** Sau một thử thách kéo dài, cô là quỷ đầu tiên trong lịch sử có thể đứng dưới ánh sáng mặt trời mà không cháy.
- **Pháp Huyết Quỷ Thuật — Lửa Bùng Nổ:** Sản sinh ra ngọn lửa đỏ chỉ thiêu đốt quỷ, không gây hại con người.

**Vai trò:** Sự tồn tại của Nezuko là chìa khóa để Đoàn Diệt Quỷ tìm ra cách chuyển quỷ trở lại thành người — mối hy vọng cuối cùng trong cuộc chiến chống Muzan.

— English —

Nezuko Kamado is [[Tanjiro Kamado|tanjiro-kamado]]'s younger sister. Turned into a demon by Muzan on the day her family was massacred, she retains her humanity due to sheer willpower and a unique reaction to Muzan's blood. Unlike other demons, she doesn't eat humans — she sleeps instead — and after a prolonged trial becomes the first demon in history to walk in sunlight without burning.`,
    affiliations: ['Demon Slayer Corps (companion)'],
    storyIds: ['kimetsu-no-yaiba'],
    updatedAt: '2026-04-23',
  },

  // ─── Attack on Titan ──────────────────────────────────────────────────
  {
    id: 'eren-yeager',
    name: 'Eren Yeager',
    anilistCharacterId: null,
    wikipediaSlug: 'Eren_Yeager',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b40882-O8dZmBMpLzeu.png',
    shortBio: 'Thanh niên ám ảnh tự do, người sở hữu Titan Tấn Công và Titan Kiến Tạo. / A young man obsessed with freedom, holder of the Attack and Founding Titans.',
    bio:
      `Eren Yeager là nhân vật trung tâm của [[Attack on Titan|attack-on-titan]]. Sinh ra ở quận Shiganshina sau bức tường Maria, cuộc sống bình yên của cậu kết thúc vào năm 845 khi Titan Khổng Lồ phá vỡ tường và Titan Khôi Giáp tràn vào thành phố.

**Bi kịch khởi đầu:** Mẹ cậu bị Titan ăn thịt ngay trước mắt. Cha cậu — bác sĩ Grisha — biến mất bí ẩn ngay sau đó. Eren thề sẽ tiêu diệt mọi Titan trên đời và gia nhập Survey Corps cùng [[Mikasa Ackerman|mikasa-ackerman]] và Armin Arlert.

**Sức mạnh Titan:** Sau cái chết được cho là của cậu trong trận Trost, Eren phát hiện mình có thể biến thành Titan 15m — Titan Tấn Công (Attack Titan). Sau này cậu thừa kế cả Titan Kiến Tạo (Founding Titan) — sức mạnh có thể điều khiển toàn bộ giống loài Titan.

**Bước ngoặt:** Sau timeskip, sau khi khám phá sự thật về thế giới ngoài bức tường — về Marley, Eldians và cuộc thảm sát kéo dài hàng thế kỷ — Eren biến từ anh hùng thành người gây ra "Rumbling": cuộc tàn sát toàn cầu để bảo vệ dân tộc mình.

**Đạo đức của câu chuyện:** Eren là một trong những phản anh hùng phức tạp nhất trong shounen anime hiện đại. Tác giả Hajime Isayama không cho khán giả câu trả lời rõ ràng về việc cậu đúng hay sai.

— English —

Eren Yeager is the central character of [[Attack on Titan|attack-on-titan]]. Born in Shiganshina district behind Wall Maria, his peaceful life ended in year 845 when the Colossal Titan breached the wall.

After watching his mother eaten alive, he swore to exterminate every Titan and enlisted in the Survey Corps with [[Mikasa Ackerman|mikasa-ackerman]] and Armin Arlert. He later inherits the Attack and Founding Titans, and after the timeskip becomes the morally complex architect of the Rumbling.`,
    affiliations: ['Survey Corps', 'Yeagerist'],
    storyIds: ['attack-on-titan'],
    updatedAt: '2026-04-23',
  },
  {
    id: 'mikasa-ackerman',
    name: 'Mikasa Ackerman',
    anilistCharacterId: null,
    wikipediaSlug: 'Mikasa_Ackerman',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b40881-NKwbk0gM6Vd9.png',
    shortBio: 'Chị em họ của Eren, chiến binh xuất sắc nhất của thế hệ 104. / Eren\'s adoptive sister and the most skilled warrior of the 104th cadet corps.',
    bio:
      `Mikasa Ackerman là chiến binh xuất sắc nhất tại Survey Corps trong [[Attack on Titan|attack-on-titan]]. Cô được gia đình [[Eren Yeager|eren-yeager]] cứu khỏi tay kẻ buôn người khi còn nhỏ — Eren tự tay giết những kẻ bắt cóc, đánh thức trong cô bản năng chiến đấu của dòng họ Ackerman.

**Dòng họ Ackerman:** Một dòng họ con người có gen biến đổi, sở hữu sức mạnh phi thường khi kích hoạt. Trong những khoảnh khắc nguy hiểm, Ackerman có thể "thức tỉnh" — truy cập vào ký ức chiến đấu di truyền và đạt sức mạnh ngang ngửa Titan.

**Đặc điểm:** Tốc độ và phản xạ vượt xa con người bình thường. Khả năng sử dụng ODM (Omni-Directional Mobility) gear đỉnh cao. Lòng trung thành tuyệt đối với Eren — tới mức đôi khi mâu thuẫn với chính nguyên tắc đạo đức của cô.

**Khăn quàng đỏ:** Vật phẩm biểu tượng — chính Eren tặng cô vào ngày đầu tiên họ gặp nhau. Trở thành biểu tượng cho mối tình câm lặng giữa hai người trong suốt câu chuyện.

— English —

Mikasa Ackerman is the most skilled warrior in the Survey Corps. Saved by [[Eren Yeager|eren-yeager]]'s family from human traffickers as a child, she carries the awakened bloodline of the Ackerman clan — a human lineage with genetic strength rivaling Titans. Her loyalty to Eren is absolute, sometimes conflicting with her own moral compass.`,
    affiliations: ['Survey Corps', '104th Cadet Corps'],
    storyIds: ['attack-on-titan'],
    updatedAt: '2026-04-23',
  },

  // ─── Jujutsu Kaisen ───────────────────────────────────────────────────
  {
    id: 'yuji-itadori',
    name: 'Yuji Itadori',
    anilistCharacterId: null,
    wikipediaSlug: 'Yuji_Itadori',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b164471-PUyTpGaaybLk.png',
    shortBio: 'Học sinh trung học nuốt phải ngón tay Sukuna và trở thành "vật chứa" của vua chú thuật. / High schooler who swallowed Sukuna\'s finger and became the vessel of the King of Curses.',
    bio:
      `Yuji Itadori là nhân vật chính của [[Jujutsu Kaisen|jujutsu-kaisen]]. Một học sinh trung học bình thường ở Sendai, cậu nổi bật chỉ vì sức mạnh thể chất phi thường — chạy 50m trong 3 giây và ném tạ tới 30m.

**Bước ngoặt:** Khi câu lạc bộ huyền học của trường vô tình mở khóa con dấu chứa ngón tay của Ryomen Sukuna — Vua Chú Thuật cổ đại — và nguyền chú tấn công, Yuji nuốt một trong 20 ngón tay để cứu bạn và tự nguyện trở thành vật chứa của Sukuna.

**Cuộc sống mới:** Bị Đại Trường Pháp Thuật Tokyo phát hiện, cậu được gửi tới đó học cách kiểm soát Sukuna. Mục tiêu cuối cùng: nuốt cả 20 ngón tay rồi để mình bị xử tử — diệt vĩnh viễn Sukuna cùng với mình.

**Sức mạnh:**
- **Sức mạnh thể chất phi thường:** Có thể đấm vỡ kim loại, chịu đựng nội thương cấp tử.
- **Black Flash:** Kỹ thuật cấp cao của pháp sư — đánh đòn với khoảng cách dưới 0.000001 giây giữa cú đánh và áp lực, tạo ra "lóe sáng đen" khuếch đại sức mạnh.
- **Vật chứa của Sukuna:** Khi Sukuna nắm quyền điều khiển, cơ thể cậu sở hữu sức mạnh ngang Đặc Cấp.

**Mối quan hệ với Gojo:** [[Satoru Gojo|satoru-gojo]] là giáo viên và người bảo trợ của Yuji.

— English —

Yuji Itadori is the protagonist of [[Jujutsu Kaisen|jujutsu-kaisen]]. An ordinary high schooler in Sendai, his only standout trait was supernatural physical strength. When his school's occult club accidentally unsealed one of Ryomen Sukuna's twenty fingers, he swallowed it to save his friends — voluntarily becoming the vessel of the King of Curses.`,
    affiliations: ['Tokyo Jujutsu High'],
    storyIds: ['jujutsu-kaisen'],
    updatedAt: '2026-04-23',
  },
  {
    id: 'satoru-gojo',
    name: 'Satoru Gojo',
    anilistCharacterId: null,
    wikipediaSlug: 'Satoru_Gojo',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b132374-CWHfu8sH8tSg.png',
    shortBio: 'Pháp sư mạnh nhất hiện tại, sở hữu Six Eyes và kỹ thuật Limitless. / The strongest sorcerer alive, possessor of the Six Eyes and Limitless technique.',
    bio:
      `Satoru Gojo là pháp sư mạnh nhất trong thế giới [[Jujutsu Kaisen|jujutsu-kaisen]] và là giáo viên của [[Yuji Itadori|yuji-itadori]]. Anh là người duy nhất sống thừa kế CẢ HAI dị bẩm di truyền của dòng họ Gojo: **Six Eyes** và **Limitless** — sự kết hợp này chỉ xuất hiện một lần mỗi vài thế kỷ.

**Six Eyes:** Cho phép thấy được dòng chảy của năng lượng nguyền và kiểm soát Limitless với hiệu suất gần hoàn hảo.

**Limitless (Vô Hạn):** Kỹ thuật bẩm sinh — cho phép Gojo điều khiển không gian xung quanh thông qua khái niệm "vô hạn" trong toán học. Phép biến thể:
- **Infinity:** Tạo ra khoảng vô hạn quanh cơ thể, không gì có thể chạm được.
- **Cursed Technique Lapse: Blue:** Hút mọi thứ về một điểm.
- **Cursed Technique Reversal: Red:** Đẩy mọi thứ ra ngoài với lực vô tận.
- **Hollow Purple:** Kết hợp Blue và Red — vũ khí mạnh nhất.

**Domain Expansion — Unlimited Void:** Lãnh địa của Gojo nhồi đầy đầu nạn nhân với vô hạn thông tin, khiến họ tê liệt hoàn toàn.

**Tính cách:** Tự tin tới mức kiêu ngạo, hài hước, thích đùa cợt. Cùng lúc đó là người duy nhất nhận thức rõ về sự bất lực của hệ thống pháp sư cổ hủ và muốn đào tạo một thế hệ mới sẵn sàng phá vỡ nó.

— English —

Satoru Gojo is the strongest sorcerer alive in [[Jujutsu Kaisen|jujutsu-kaisen]] and teacher of [[Yuji Itadori|yuji-itadori]]. He is the only person in centuries to inherit BOTH of the Gojo clan's genetic gifts: the Six Eyes (perfect cursed-energy perception) and Limitless (mathematical-infinity-based spatial manipulation), making him effectively unbeatable.`,
    affiliations: ['Tokyo Jujutsu High', 'Gojo Clan'],
    storyIds: ['jujutsu-kaisen'],
    updatedAt: '2026-04-23',
  },

  // ─── One Piece ────────────────────────────────────────────────────────
  {
    id: 'monkey-d-luffy',
    name: 'Monkey D. Luffy',
    anilistCharacterId: null,
    wikipediaSlug: 'Monkey_D._Luffy',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/b40-K2QxQXIAQGmV.png',
    shortBio: 'Thuyền trưởng Băng Mũ Rơm, người mơ ước trở thành Vua Hải Tặc. / Captain of the Straw Hat Pirates, dreaming of becoming the Pirate King.',
    bio:
      `Monkey D. Luffy là thuyền trưởng và linh hồn của Băng Mũ Rơm trong [[One Piece|one-piece]]. Ước mơ duy nhất của anh: trở thành Vua Hải Tặc — kẻ tự do nhất thế giới.

**Tuổi thơ:** Sinh ra ở làng Foosha, Đông Hải. Được Hải Tặc Đỏ "Shanks" Tóc Đỏ truyền cảm hứng và nhận chiếc mũ rơm — món quà mà sau này anh thề sẽ trả lại khi trở thành thuyền trưởng vĩ đại.

**Trái Ác Quỷ:** Vô tình ăn trái Gomu Gomu (tên thật: Hito Hito no Mi, Model: Nika — phục sinh thần thoại "Mặt Trời" Nika). Cơ thể có khả năng co giãn như cao su; dạng thức Gear 5 tối thượng cho phép anh "biến hoạt hình thành sự thật".

**Haki:** Sở hữu cả 3 loại — Quan Sát (Observation), Vũ Trang (Armament), và Bá Vương (Conqueror's Haki — chỉ 1 trong 1 triệu người có).

**Băng Mũ Rơm:** Zoro (kiếm sĩ), Nami (hoa tiêu), Usopp (xạ thủ), Sanji (đầu bếp), Chopper (bác sĩ), Robin (khảo cổ), Franky (thợ máy), Brook (nhạc sĩ), Jinbe (timoneiro). Mỗi người gia nhập sau một câu chuyện khiến họ tin Luffy có thể đưa họ đến giấc mơ riêng.

**Tính cách:** Đơn giản tới mức ngu ngơ — chỉ hiểu hai khái niệm: "ăn" và "phiêu lưu". Nhưng đằng sau sự ngây thơ là một bộ óc chiến lược lì lợm và khả năng truyền cảm hứng phi thường.

— English —

Monkey D. Luffy is captain of the Straw Hat Pirates in [[One Piece|one-piece]]. After eating the Gomu Gomu Devil Fruit (revealed to be the mythical Hito Hito no Mi, Model: Nika), his body became rubber. Trained briefly by the Red-Haired Pirate Shanks as a child, his single-minded dream is to become the Pirate King — the freest person in the world.`,
    affiliations: ['Straw Hat Pirates', 'Worst Generation', 'Cross Guild target'],
    storyIds: ['one-piece'],
    updatedAt: '2026-04-23',
  },

  // ─── Naruto ───────────────────────────────────────────────────────────
  {
    id: 'naruto-uzumaki',
    name: 'Naruto Uzumaki',
    anilistCharacterId: null,
    wikipediaSlug: 'Naruto_Uzumaki',
    wikipediaSlugVi: 'Uzumaki_Naruto',
    avatarUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/17.jpg',
    shortBio: 'Ninja làng Lá ấp ủ giấc mơ trở thành Hokage và được cả làng công nhận. / A Konoha ninja with the dream of becoming Hokage and earning the village\'s acknowledgment.',
    bio:
      `Naruto Uzumaki là ninja của làng Konohagakure trong [[Naruto|naruto]]. Ngày sinh ra (10/10), Cửu Vĩ Hồ Ly Kurama tấn công làng — cha cậu, Hokage Đệ Tứ Minato Namikaze, đã phong ấn quỷ thú vào cơ thể trẻ sơ sinh để cứu làng, đổi lại bằng mạng sống của mình và mẹ Kushina Uzumaki.

**Tuổi thơ cô độc:** Lớn lên không cha mẹ, bị cả làng xa lánh vì sự sợ hãi không nói ra với Cửu Vĩ bên trong cậu. Nhưng thay vì căm hận, cậu chọn cách phấn đấu để được công nhận — ấp ủ ước mơ trở thành Hokage.

**Team 7:** Đội ninja đầu tiên của cậu — cùng Sasuke Uchiha (đối thủ/người bạn duy nhất hiểu cậu) và Sakura Haruno, dưới chỉ đạo của Kakashi Hatake. Sự ám ảnh "đưa Sasuke về làng" sau khi anh đi theo bóng tối là dây cốt cảm xúc của cả manga.

**Sức mạnh:**
- **Kage Bunshin no Jutsu:** Kĩ thuật phân thân vượt cấp.
- **Rasengan:** Kĩ thuật của cha — quả cầu xoáy Chakra thuần.
- **Sage Mode:** Hợp thể với năng lượng tự nhiên.
- **Six Paths Sage Mode:** Sức mạnh của Lục Đạo Tiên Nhân, mở khoá ở arc cuối.

**Vai trò:** Sau cuộc Đại Chiến Ninja Đệ Tứ, Naruto trở thành Hokage Đệ Thất. Có gia đình (Hinata, con Boruto và Himawari), đứng đầu một làng yên bình mà cậu đã hy sinh tuổi thơ để bảo vệ.

— English —

Naruto Uzumaki is a ninja of the Hidden Leaf Village (Konohagakure) in [[Naruto|naruto]]. On the day of his birth, the Nine-Tails Kurama attacked the village; his father, the Fourth Hokage Minato, sealed the beast inside the newborn Naruto at the cost of his and his wife's lives. Shunned by villagers as a child for the unspoken fear of the demon inside him, Naruto channeled isolation into ambition: becoming Hokage and earning their acknowledgment.`,
    affiliations: ['Konohagakure', 'Team 7', 'Allied Shinobi Forces'],
    storyIds: ['naruto'],
    updatedAt: '2026-04-23',
  },
]

const SEED_STORIES: WikiStory[] = [
  {
    id: 'frieren-beyond',
    title: "Frieren: Beyond Journey's End",
    anilistAnimeId: 154587,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-fJzOkbnwxMUI.png',
    shortSummary:
      'Câu chuyện theo chân pháp sư Elf [[Frieren|frieren]] sau khi cuộc chiến đánh bại Ma Vương kết thúc. / The story of the elven mage [[Frieren|frieren]] after the war against the Demon King ended.',
    body:
      `**Bối cảnh — Sau Đại Chiến**

Sau cuộc chiến đánh bại Ma Vương, đoàn anh hùng giải tán. [[Frieren|frieren]] — pháp sư Elf trường thọ — hứa với bạn bè rằng cô sẽ quay lại sau 50 năm. Nhưng với cô, 50 năm chỉ như chớp mắt.

**Cái chết của Himmel**

Khi đoàn tụ, cô phát hiện đồng đội con người đã già đi rất nhiều. Cái chết của [[Himmel|himmel]] khiến Frieren nhận ra cô chưa bao giờ thực sự hiểu các bạn của mình. Trong tang lễ, cô khóc lần đầu trong đời — nước mắt của hối tiếc.

**Hành trình mới**

Hành trình mới bắt đầu — không phải để chinh phục, mà để học cách yêu thương đúng cách. Frieren nhận học trò Fern — pháp sư trẻ con người do thầy cũ của cô (Heiter, một thành viên đoàn anh hùng) nuôi dạy. Sau đó là Stark — chiến binh trẻ với trái tim hèn nhát nhưng dũng cảm khi cần.

**Đích đến: Ende**

Họ đi về phương Bắc, tới Ende — nơi linh hồn người chết được cho là tụ về. Frieren muốn gặp lại Himmel một lần nữa, ngay cả khi chỉ là để nói lời chào tạm biệt mà cô chưa từng nói.

**Phong cách kể chuyện**

Tác phẩm của Kanehito Yamada (kịch bản) và Tsukasa Abe (minh họa) đảo ngược công thức RPG truyền thống: thay vì kể về cuộc phiêu lưu, nó kể về những gì xảy ra SAU cuộc phiêu lưu. Nhịp chậm, chiêm nghiệm, thường được so sánh với "Mushishi" và "Natsume's Book of Friends" — đã đoạt Manga Taisho và Shogakukan Manga Award.

— English —

After defeating the Demon King, the Hero's Party disbands. [[Frieren|frieren]] — the long-lived elven mage — promises to visit her companions again in 50 years. To her, that's a mere blink.

When she returns, her human friends have aged dramatically. [[Himmel|himmel]]'s death makes Frieren realize she never truly tried to understand the people who shared her adventure. Her new quest is not to conquer evil but to learn how to love correctly — a journey that takes her north to Ende, where the souls of the dead are said to gather.

The series by Kanehito Yamada and Tsukasa Abe inverts the typical RPG formula: instead of telling an adventure, it tells what happens AFTER one. It has won the Manga Taisho and Shogakukan Manga Award.`,
    characterIds: ['frieren', 'himmel'],
    updatedAt: '2026-04-23',
  },
  {
    id: 'kimetsu-no-yaiba',
    title: 'Kimetsu no Yaiba (Demon Slayer)',
    anilistAnimeId: 101922,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-PEn1CTc93blC.jpg',
    shortSummary:
      '[[Tanjiro Kamado|tanjiro-kamado]] gia nhập Đoàn Diệt Quỷ để cứu em gái [[Nezuko Kamado|nezuko-kamado]]. / [[Tanjiro Kamado|tanjiro-kamado]] joins the Demon Slayer Corps to save his sister [[Nezuko Kamado|nezuko-kamado]].',
    body:
      `**Bối cảnh — Thời Taisho, Nhật Bản đầu thế kỷ 20**

Vào thời Taisho ở Nhật Bản, [[Tanjiro Kamado|tanjiro-kamado]] sống cuộc sống bình yên với gia đình bằng nghề bán than ở vùng núi xa xôi. Một ngày nọ, sau khi xuống làng, cậu trở về và phát hiện cả gia đình bị quỷ thảm sát — chỉ còn em gái [[Nezuko Kamado|nezuko-kamado]] sống sót, nhưng đã bị biến thành quỷ.

**Đoàn Diệt Quỷ**

Tanjiro thề sẽ tìm cách trả lại nhân tính cho em và trả thù cho gia đình. Hành trình đưa cậu gia nhập Đoàn Diệt Quỷ — tổ chức bí mật chuyên săn lùng quỷ tồn tại từ thời Heian. Cậu được Sakonji Urokodaki — Cựu Trụ Cột Nước — nhận làm đệ tử và trải qua hai năm khổ luyện trước khi vượt qua Kì Thi Tuyển Cuối Cùng tại núi Fujikasane.

**Hashira (Trụ Cột)**

9 chiến binh mạnh nhất của Đoàn Diệt Quỷ — mỗi người đại diện cho một kiểu Hơi Thở chính. Trong câu chuyện, Tanjiro làm việc với mọi Trụ Cột ở các arc khác nhau: Giyu Tomioka (Nước), Shinobu Kocho (Côn Trùng), Kyojuro Rengoku (Lửa), Tengen Uzui (Âm Thanh), Mitsuri Kanroji (Tình Yêu), Muichiro Tokito (Sương Mù), Sanemi Shinazugawa (Gió), Obanai Iguro (Rắn), và Gyomei Himejima (Đá).

**12 Quỷ Trăng**

Lực lượng tinh nhuệ của Muzan Kibutsuji — chia thành Thượng Huyền (1-6) và Hạ Huyền (1-6). Mỗi quỷ là kẻ thù riêng cho từng arc, từng có quá khứ con người bi kịch trước khi bị Muzan biến đổi.

**Arc cuối — Cuộc Chiến Vô Hạn Lâu Đài**

Toàn bộ Đoàn Diệt Quỷ bị hút vào Lâu Đài Vô Hạn — căn cứ của Muzan. Cuộc chiến cuối cùng kéo dài một đêm, kết thúc bằng cái chết của Muzan dưới ánh mặt trời và Nezuko trở thành quỷ đầu tiên — và cuối cùng — chuyển hóa lại thành con người.

**Di sản**

Tác phẩm của Koyoharu Gotouge đã trở thành hiện tượng văn hóa toàn cầu, đặc biệt sau bộ phim "Mugen Train" — phim hoạt hình có doanh thu cao nhất mọi thời đại tại Nhật Bản.

— English —

In Taisho-era Japan, [[Tanjiro Kamado|tanjiro-kamado]] lives peacefully with his family selling charcoal in the mountains. One day he returns to find them all slaughtered by a demon — except his sister [[Nezuko Kamado|nezuko-kamado]], who has been turned into one. He swears to restore her humanity and joins the Demon Slayer Corps, training under former Water Hashira Sakonji Urokodaki and battling Muzan Kibutsuji's Twelve Kizuki demons across multiple arcs, culminating in the Infinity Castle final battle.`,
    characterIds: ['tanjiro-kamado', 'nezuko-kamado'],
    updatedAt: '2026-04-23',
  },
  {
    id: 'attack-on-titan',
    title: 'Attack on Titan',
    anilistAnimeId: 16498,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-C6FPmWm59CyP.jpg',
    shortSummary:
      'Nhân loại bị giam trong các bức tường khổng lồ để tránh Titan. [[Eren Yeager|eren-yeager]] thề sẽ tiêu diệt chúng. / Humanity is caged behind massive walls to avoid Titans. [[Eren Yeager|eren-yeager]] swears to exterminate them.',
    body:
      `**Bối cảnh — 100 năm sau Đại Họa**

Hơn 100 năm trước, nhân loại bị đẩy đến bờ vực tuyệt chủng bởi những Titan ăn thịt người — sinh vật khổng lồ không có cơ quan tiêu hóa và dường như tồn tại với mục đích duy nhất: ăn thịt người. Số ít sống sót xây ba bức tường khổng lồ — Maria, Rose, Sina — để bảo vệ thành phố cuối cùng.

**Sự sụp đổ của Wall Maria — năm 845**

Cuộc sống bình yên kết thúc khi Titan Khổng Lồ (Bertholdt) đá vỡ cổng quận Shiganshina, theo sau là Titan Khôi Giáp (Reiner). [[Eren Yeager|eren-yeager]] — 10 tuổi — chứng kiến mẹ bị Titan ăn thịt trước mắt. Cùng [[Mikasa Ackerman|mikasa-ackerman]] và Armin Arlert, cậu chạy trốn về phía sau Wall Rose.

**Survey Corps**

Ba năm sau, ba bạn nhập ngũ và gia nhập Survey Corps — đội ninja duy nhất dám vượt tường và mạo hiểm tính mạng. Dưới chỉ huy của Erwin Smith và Levi Ackerman — chiến binh mạnh nhất nhân loại — Eren khám phá ra mình có thể biến thành Titan 15m: Titan Tấn Công.

**Sự thật về thế giới**

Sau hành trình tới biển, đoàn phát hiện sự thật khủng khiếp: thế giới bên ngoài bức tường KHÔNG bị Titan thống trị. Nó là một thế giới văn minh — với Marley, Eldians (dân của bức tường) và một cuộc thảm sát kéo dài hàng thế kỷ giữa hai dân tộc. Bức tường thực ra là vũ khí cuối cùng: hàng triệu Titan Wall ngủ trong tường.

**The Rumbling**

Sau timeskip 4 năm, Eren — lúc này thừa kế cả Titan Tấn Công và Titan Kiến Tạo — quyết định "rung lên" Titan Wall và xóa sổ 80% nhân loại để bảo vệ dân tộc Eldian khỏi cuộc tận diệt của Marley.

**Kết thúc bi kịch**

Bạn bè của Eren, biết đây là kế hoạch tàn ác nhưng hiểu được lý do, vẫn phải tự tay giết anh để cứu phần còn lại của thế giới. Mikasa — người yêu Eren cả đời — là người ra tay cuối cùng.

**Di sản**

Tác phẩm của Hajime Isayama lột tả những bí mật khủng khiếp về thế giới bên ngoài bức tường, biến từ shounen action thành tragedy về dân tộc, chiến tranh và chu kỳ thù hận. Là một trong những manga có ảnh hưởng văn hóa lớn nhất thập kỷ 2010s.

— English —

Over a century ago, humanity was driven to the brink of extinction by man-eating Titans. Survivors built three massive walls. Peace ends in year 845 when the Colossal Titan breaches Wall Maria; [[Eren Yeager|eren-yeager]] watches his mother eaten alive and swears revenge. He joins the Survey Corps with [[Mikasa Ackerman|mikasa-ackerman]] and Armin Arlert, eventually inheriting the Attack and Founding Titans. After discovering the world beyond the walls is a civilized place engaged in a centuries-long genocide of his people, he initiates the Rumbling — a planet-wide extinction event — forcing his closest friends to kill him to save the remainder of humanity.`,
    characterIds: ['eren-yeager', 'mikasa-ackerman'],
    updatedAt: '2026-04-23',
  },
  {
    id: 'jujutsu-kaisen',
    title: 'Jujutsu Kaisen',
    anilistAnimeId: 113415,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-bbBWj4pEFseh.jpg',
    shortSummary:
      'Học sinh [[Yuji Itadori|yuji-itadori]] nuốt phải ngón tay vua chú thuật và bước vào thế giới pháp thuật. / Student [[Yuji Itadori|yuji-itadori]] swallows the King of Curses\' finger and enters the world of jujutsu sorcery.',
    body:
      `**Bối cảnh — Nhật Bản hiện đại, thế giới song song**

Trong [[Jujutsu Kaisen|jujutsu-kaisen]], chú nguyền (curses) tồn tại thật — sinh ra từ cảm xúc tiêu cực của con người. Pháp sư (jujutsu sorcerers) là những người được sinh ra với khả năng cảm nhận và chiến đấu chống chú nguyền, bảo vệ xã hội khỏi chúng.

**Bước ngoặt — Vật chứa của Sukuna**

[[Yuji Itadori|yuji-itadori]] — một học sinh trung học bình thường ở Sendai — vô tình nuốt phải một trong 20 ngón tay của Ryomen Sukuna, vua chú thuật cổ đại tồn tại 1000 năm trước. Để cứu bạn, cậu chấp nhận trở thành "vật chứa" của Sukuna — bị Đại Trường Pháp Thuật Tokyo phát hiện ngay lập tức.

**Án tử trì hoãn**

Đại Trường ra phán quyết: Yuji sẽ bị xử tử sau khi nuốt nốt 19 ngón tay còn lại — đảm bảo Sukuna chết hoàn toàn cùng cậu. Trong thời gian đó, Yuji được gửi tới đó học cách kiểm soát sức mạnh dưới chỉ đạo của giáo viên — pháp sư mạnh nhất thời đại — [[Satoru Gojo|satoru-gojo]].

**Đồng đội**

Cùng học với Yuji là Megumi Fushiguro — pháp sư trẻ thừa kế Mười Bóng — và Nobara Kugisaki — pháp sư nông thôn dùng đinh và búa. Ba người tạo thành "Năm Một Tokyo" và là tâm điểm của câu chuyện.

**Domain Expansion (Lãnh Địa)**

Kỹ thuật cao cấp nhất — pháp sư kiến tạo một không gian song song nơi kỹ thuật của họ áp dụng tự động và chính xác. Mỗi pháp sư mạnh có một lãnh địa độc đáo. Lãnh địa của Sukuna — Malevolent Shrine — là một trong những thứ kinh hoàng nhất trong câu chuyện.

**Shibuya Arc — Trận chiến đẫm máu nhất**

Cuộc chiến tại quận Shibuya vào lễ Halloween 2018 đánh dấu bước ngoặt. Sukuna phá vỡ thoả thuận với Yuji, gây thiệt hại hàng triệu sinh mạng. Gojo bị phong ấn vào Hộp Vô Hạn Tù — không thể can thiệp. Câu chuyện trở nên đen tối hơn rất nhiều sau đây.

**Di sản**

Tác phẩm của Gege Akutami nổi tiếng với hệ thống chiến đấu phức tạp nhất shounen, những trận chiến cao trào, và sự sẵn sàng giết bỏ nhân vật chính bất kỳ lúc nào.

— English —

In a parallel modern Japan, curses (born from human negativity) coexist with humanity. Sorcerers fight them. When ordinary high schooler [[Yuji Itadori|yuji-itadori]] accidentally swallows one of Ryomen Sukuna's twenty fingers (the King of Curses, dead 1000 years), he becomes Sukuna's vessel. The Jujutsu High sentences him to delayed execution: he must consume all 20 fingers, then be killed to destroy Sukuna for good. Trained by the strongest sorcerer alive, [[Satoru Gojo|satoru-gojo]], Yuji forms a class with Megumi Fushiguro and Nobara Kugisaki — facing increasingly catastrophic threats culminating in the Shibuya Incident.`,
    characterIds: ['yuji-itadori', 'satoru-gojo'],
    updatedAt: '2026-04-23',
  },
  {
    id: 'one-piece',
    title: 'One Piece',
    anilistAnimeId: 21,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-tXMN3Y20PIL9.png',
    shortSummary:
      '[[Monkey D. Luffy|monkey-d-luffy]] và Băng Mũ Rơm tìm kiếm kho báu huyền thoại One Piece. / [[Monkey D. Luffy|monkey-d-luffy]] and the Straw Hats search for the legendary One Piece treasure.',
    body:
      `**Bối cảnh — Thời đại Hải Tặc Vĩ Đại**

Hơn 25 năm trước câu chuyện chính, Vua Hải Tặc Gold Roger trước khi bị xử tử đã tuyên bố cất giấu kho báu vĩ đại nhất thế giới — One Piece — ở đâu đó trên Grand Line. Câu nói đó mở đầu kỷ nguyên hải tặc vĩ đại: hàng nghìn người ra biển tìm kiếm kho báu và tự do.

**East Blue Saga — Khởi đầu**

[[Monkey D. Luffy|monkey-d-luffy]], cậu bé từng ăn trái Gomu Gomu, ấp ủ giấc mơ trở thành Vua Hải Tặc từ ngày Hải Tặc Đỏ Shanks tặng cậu chiếc mũ rơm. Năm 17 tuổi, anh ra biển và tuyển dụng:
- **Roronoa Zoro** — kiếm sĩ tay ba kiếm muốn trở thành kiếm sĩ vĩ đại nhất.
- **Nami** — hoa tiêu/trộm cướp mơ vẽ bản đồ thế giới.
- **Usopp** — xạ thủ nói dối nhưng dũng cảm khi cần.
- **Sanji** — đầu bếp mơ tìm All Blue, biển kết hợp 4 đại dương.

**Grand Line — Hành trình thật bắt đầu**

Sau khi đóng tàu Going Merry, đoàn vào Grand Line — đại dương không thể đoán định nơi mọi đảo có khí hậu, thời tiết, sinh vật đặc biệt. Họ tuyển thêm:
- **Tony Tony Chopper** — bác sĩ-tuần lộc ăn trái Hito Hito.
- **Nico Robin** — khảo cổ học cuối cùng có thể đọc Poneglyph.
- **Franky** — thợ máy chế tàu Thousand Sunny.
- **Brook** — nhạc sĩ-bộ xương 50 năm.
- **Jinbei** — timoneiro ngư-nhân, thành viên thứ 10.

**Tứ Hoàng & New World**

Sau timeskip 2 năm, đoàn tiến vào New World — nửa sau Grand Line, nơi cai trị bởi Tứ Hoàng (Yonko): Kaido (Bách Thú), Big Mom (Charlotte Linlin), Shanks (Tóc Đỏ), và Blackbeard. Mỗi arc trong New World là cuộc đụng độ với một Yonko: Whole Cake Island vs Big Mom, Wano Country vs Kaido, Egghead Island vs Marines/Cipher Pol.

**Sức mạnh trong One Piece**

- **Devil Fruits:** Trao siêu năng lực đặc biệt nhưng mất khả năng bơi.
- **Haki:** Năng lượng tinh thần — Observation, Armament, Conqueror's.
- **Six Powers (Rokushiki):** Kĩ thuật chiến đấu tay không siêu phàm của Marine.

**Di sản**

Tác phẩm của Eiichiro Oda là manga bán chạy nhất mọi thời đại với hơn **523 triệu bản** trên toàn thế giới (hơn cả Batman và Spider-Man cộng lại). Đã phát hành liên tục từ 1997 và dự kiến kết thúc trong vài năm tới.

— English —

25 years before the main story, Pirate King Gold Roger announced before his execution that he had hidden the greatest treasure — One Piece — somewhere on the Grand Line, kicking off the Great Pirate Era. [[Monkey D. Luffy|monkey-d-luffy]], inspired as a child by Red-Haired Shanks, sets out at 17 with the dream of becoming Pirate King. He recruits the Straw Hats — Zoro, Nami, Usopp, Sanji, Chopper, Robin, Franky, Brook, Jinbei — and sails through East Blue, the Grand Line, and the New World, clashing with the Four Emperors (Yonko). Eiichiro Oda's manga is the best-selling of all time with over 523 million copies sold worldwide.`,
    characterIds: ['monkey-d-luffy'],
    updatedAt: '2026-04-23',
  },
  {
    id: 'naruto',
    title: 'Naruto',
    anilistAnimeId: 20,
    coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20-XK2MQEeOCBpd.png',
    shortSummary:
      '[[Naruto Uzumaki|naruto-uzumaki]] — ninja con nhà cô độc — phấn đấu trở thành Hokage. / [[Naruto Uzumaki|naruto-uzumaki]] — an orphaned ninja — strives to become Hokage.',
    body:
      `**Bối cảnh — Thế giới Ninja**

[[Naruto Uzumaki|naruto-uzumaki]] sống trong thế giới ninja chia thành 5 quốc gia lớn — Hỏa, Thủy, Phong, Lôi, Thổ — mỗi nước có một làng ninja chính: Konohagakure (Lá), Kirigakure (Sương Mù), Sunagakure (Cát), Kumogakure (Mây), Iwagakure (Đá).

**Tuổi thơ — Cửu Vĩ Hồ Ly**

Naruto sinh ngày 10/10, đúng ngày Cửu Vĩ Hồ Ly Kurama tấn công Konoha. Cha cậu, Hokage Đệ Tứ Minato Namikaze, phong ấn quỷ thú vào cơ thể trẻ sơ sinh — đổi lại bằng mạng sống của mình và mẹ Kushina Uzumaki. Bị dân làng xa lánh từ nhỏ vì sợ hãi không nói ra với Cửu Vĩ bên trong, Naruto lớn lên cô độc nhưng luôn ấp ủ ước mơ trở thành Hokage để được công nhận.

**Naruto (Phần 1) — Tuổi 12-15**

Tốt nghiệp Học Viện Ninja, Naruto được phân vào Team 7 cùng:
- **Sasuke Uchiha** — thiên tài u sầu, người sống sót cuối cùng của tộc Uchiha sau khi anh trai Itachi giết cả nhà.
- **Sakura Haruno** — cô gái thông minh có chakra control tuyệt vời nhưng ban đầu yếu.

Dưới chỉ đạo của Kakashi Hatake — "Sao Chép Ninja" với Sharingan — đội trải qua các missions từ Wave Country (gặp Zabuza và Haku) đến Kì Thi Chunin (gặp Gaara) và Cuộc Xâm Lược Konoha của Orochimaru.

**Naruto Shippuden (Phần 2) — Tuổi 15-17**

Sau khi Sasuke chạy theo Orochimaru để tìm sức mạnh, Naruto rời làng huấn luyện 3 năm với Jiraiya — học Rasengan, Sage Mode. Trở về để đối đầu với:
- **Akatsuki** — tổ chức tội phạm gồm 10 ninja S-rank tìm cách bắt 9 Bijuu (quỷ thú).
- **Pain (Nagato)** — gây thảm họa lớn nhất Konoha sau Kurama.
- **Madara Uchiha & Obito** — kẻ chủ mưu thật sự đằng sau Akatsuki.

**Cuộc Đại Chiến Ninja Đệ Tứ**

Cuộc chiến cuối cùng: Naruto + Sasuke + Liên Minh Ninja vs Madara + Kaguya Otsutsuki — nữ thần ngoài hành tinh là tổ tiên của mọi chakra. Naruto mở khóa Six Paths Sage Mode; Sasuke mở khóa Rinnegan. Hai người cuối cùng đối đầu nhau ở Thung Lũng Cuối — hồi kết vĩ đại của câu chuyện 700 chương.

**Hậu Naruto**

Naruto trở thành Hokage Đệ Thất, lấy Hinata Hyuga và có hai con: Boruto (chính của series tiếp) và Himawari. Sasuke trở thành ninja lưu vong bảo vệ làng từ bóng tối, lấy Sakura và có con gái Sarada.

**Di sản**

Tác phẩm của Masashi Kishimoto là một trong "Big 3" của shounen anime cùng với [[One Piece|one-piece]] và Bleach. Đã bán hơn 250 triệu bản và là một trong những bộ anime có ảnh hưởng văn hóa lớn nhất ngoài Nhật Bản.

— English —

[[Naruto Uzumaki|naruto-uzumaki]] grew up shunned in the Hidden Leaf Village (Konohagakure) due to the Nine-Tailed Fox sealed inside him. Channeling isolation into ambition, he set out to become Hokage. Assigned to Team 7 with rival Sasuke Uchiha, Sakura Haruno, and teacher Kakashi Hatake, he confronts the snake-sage Orochimaru, the criminal organization Akatsuki, and ultimately the Otsutsuki goddess Kaguya in the Fourth Great Ninja War. After 700 chapters, he becomes the Seventh Hokage. The series is one of shounen anime's "Big Three" alongside [[One Piece|one-piece]] and Bleach.`,
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
