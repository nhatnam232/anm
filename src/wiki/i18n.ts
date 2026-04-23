/**
 * Wiki module — i18n strings for VI / EN.
 *
 * Keeps the wiki self-contained: instead of growing the main app's
 * `lib/i18n.ts`, the wiki module ships its own tiny translator that
 * still reads the active language from `useLangContext()`.
 */
import { useLangContext } from '@/providers/LangProvider'

export type WikiText = {
  fandomWiki: string
  communityCurated: string
  homeTitle: string
  homeSubtitle: string
  topCharacters: string
  storiesAndLore: string
  charactersCount: (n: number) => string
  storiesCount: (n: number) => string
  charactersAppearing: string
  appearsIn: string
  biography: string
  shortSummary: string
  fullDetails: string
  editThisPage: string
  characterLabel: string
  storyLabel: string
  wikiId: string
  affiliations: string
  updatedAt: string
  viewOnMainApp: string
  crossLink: string
  notFoundCharacter: (id: string) => string
  notFoundStory: (id: string) => string
  backToWikiHome: string
  searchPlaceholder: string
  noResults: (q: string) => string
  loading: string
  liveFromAnilist: string
  contributeHint: string
  // Edit page
  editing: string
  bold: string
  italic: string
  strike: string
  insertLink: string
  editSummaryLabel: string
  editSummaryPlaceholder: string
  cancel: string
  submitForReview: string
  submitted: string
  // Story / cross-app actions
  watchSchedule: string
  addToLibrary: string
  // Empty bio fallback (used when AniList description is missing)
  emptyBioFallback: string
}

const VI: WikiText = {
  fandomWiki: 'Fandom Wiki',
  communityCurated: 'Tổng hợp bởi cộng đồng',
  homeTitle: 'Fandom Wiki — Tóm tắt thế giới',
  homeSubtitle:
    'Toàn bộ tiểu sử nhân vật, cốt truyện và các mối liên kết do người dùng đóng góp. Click vào tên nhân vật trong văn bản để mở thẻ preview hoặc nhảy thẳng tới trang tiểu sử.',
  topCharacters: 'Nhân vật nổi bật',
  storiesAndLore: 'Cốt truyện & Lore',
  charactersCount: (n) => `${n} nhân vật`,
  storiesCount: (n) => `${n} bài viết`,
  charactersAppearing: 'Nhân vật xuất hiện',
  appearsIn: 'Xuất hiện trong',
  biography: 'Tiểu sử',
  shortSummary: 'Tóm tắt',
  fullDetails: 'Nội dung chi tiết',
  editThisPage: 'Chỉnh sửa trang này',
  characterLabel: 'Nhân vật',
  storyLabel: 'Cốt truyện / Lore',
  wikiId: 'Wiki ID',
  affiliations: 'Tổ chức / Phe',
  updatedAt: 'Cập nhật',
  viewOnMainApp: 'Xem trên Anime Wiki gốc',
  crossLink: 'Liên kết chéo',
  notFoundCharacter: (id) => `Không tìm thấy nhân vật "${id}"`,
  notFoundStory: (id) => `Không tìm thấy story "${id}"`,
  backToWikiHome: '← Về trang chủ Wiki',
  searchPlaceholder: 'Tìm nhân vật trong wiki...',
  noResults: (q) => `Không có nhân vật nào khớp "${q}". Có thể chưa được thêm vào wiki.`,
  loading: 'Đang tải...',
  liveFromAnilist: 'Dữ liệu live từ AniList — chưa có lore chi tiết do cộng đồng viết.',
  contributeHint: 'Bạn có thể đóng góp bằng nút "Chỉnh sửa" ở trên.',
  editing: '✏️ Đang sửa',
  bold: 'Đậm',
  italic: 'Nghiêng',
  strike: 'Gạch ngang',
  insertLink: 'Chèn link nhân vật',
  editSummaryLabel: 'Tóm tắt nội dung bạn vừa sửa',
  editSummaryPlaceholder: 'Vd: Sửa năm sinh nhân vật, thêm liên kết tới Himmel...',
  cancel: 'Huỷ',
  submitForReview: 'Gửi chờ duyệt',
  submitted: 'Đã gửi!',
  watchSchedule: 'Xem chi tiết / Lịch chiếu',
  addToLibrary: 'Thêm vào thư viện',
  emptyBioFallback:
    'Chưa có tiểu sử chi tiết. Bạn có thể đóng góp bằng nút "Chỉnh sửa" ở trên.',
}

const EN: WikiText = {
  fandomWiki: 'Fandom Wiki',
  communityCurated: 'Community-curated lore',
  homeTitle: 'Fandom Wiki — World overview',
  homeSubtitle:
    'Character bios, story arcs and cross-references contributed by the community. Click any character name in the text to open a preview card or jump straight to their bio page.',
  topCharacters: 'Featured characters',
  storiesAndLore: 'Stories & Lore',
  charactersCount: (n) => `${n} character${n === 1 ? '' : 's'}`,
  storiesCount: (n) => `${n} article${n === 1 ? '' : 's'}`,
  charactersAppearing: 'Characters in this story',
  appearsIn: 'Appears in',
  biography: 'Biography',
  shortSummary: 'Summary',
  fullDetails: 'Full lore',
  editThisPage: 'Edit this page',
  characterLabel: 'Character',
  storyLabel: 'Story / Lore',
  wikiId: 'Wiki ID',
  affiliations: 'Affiliations',
  updatedAt: 'Updated',
  viewOnMainApp: 'View on the main Anime Wiki',
  crossLink: 'Cross-link',
  notFoundCharacter: (id) => `No character found for "${id}"`,
  notFoundStory: (id) => `No story found for "${id}"`,
  backToWikiHome: '← Back to Wiki home',
  searchPlaceholder: 'Search characters in the wiki...',
  noResults: (q) =>
    `No character matches "${q}". It might not be in the wiki yet.`,
  loading: 'Loading...',
  liveFromAnilist:
    'Live data pulled from AniList — no community-written lore yet.',
  contributeHint: 'You can contribute by clicking "Edit this page" above.',
  editing: '✏️ Editing',
  bold: 'Bold',
  italic: 'Italic',
  strike: 'Strike',
  insertLink: 'Insert character link',
  editSummaryLabel: 'Summary of your edit',
  editSummaryPlaceholder: 'E.g. fixed character birth year, added link to Himmel...',
  cancel: 'Cancel',
  submitForReview: 'Submit for Review',
  submitted: 'Submitted!',
  watchSchedule: 'View details / Schedule',
  addToLibrary: 'Add to library',
  emptyBioFallback:
    'No detailed bio yet. You can contribute by clicking "Edit this page" above.',
}

export function useWikiText(): WikiText {
  const { lang } = useLangContext()
  return lang === 'vi' ? VI : EN
}
