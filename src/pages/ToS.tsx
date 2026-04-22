import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Ban,
  BookOpen,
  Cookie,
  Eye,
  Globe2,
  Mail,
  ScrollText,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import Layout from '@/components/Layout'
import { useLangContext } from '@/providers/LangProvider'

type Section = {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: React.ReactNode
}

export default function ToS() {
  const { lang } = useLangContext()
  const [activeId, setActiveId] = useState<string>('intro')

  // Highlight TOC entry that is currently in view.
  useEffect(() => {
    const ids = sections(lang).map((s) => s.id)
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: [0, 1] },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [lang])

  const all = sections(lang)
  const lastUpdated =
    lang === 'vi' ? 'Cập nhật lần cuối: 22 tháng 4, 2026' : 'Last updated: April 22, 2026'

  return (
    <Layout>
      <div className="container mx-auto max-w-6xl px-4 py-12">
        {/* Hero */}
        <div className="mb-10 overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_55%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(15,23,42,0.9))] p-8 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-pink-500 shadow-lg shadow-primary/30">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary/80">
                {lang === 'vi' ? 'Tài liệu pháp lý' : 'Legal'}
              </p>
              <h1 className="mt-1 text-4xl font-extrabold leading-tight text-white">
                {lang === 'vi' ? 'Điều khoản sử dụng' : 'Terms of Service'}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-300">
                {lang === 'vi'
                  ? 'Bằng việc truy cập Anime Wiki, bạn đồng ý với các điều khoản dưới đây. Vui lòng đọc kỹ — nếu không đồng ý, hãy ngừng sử dụng dịch vụ.'
                  : 'By accessing Anime Wiki, you agree to the terms below. Please read carefully — if you do not agree, please discontinue use of the service.'}
              </p>
              <p className="mt-3 text-xs text-gray-500">{lastUpdated}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Sticky table of contents */}
          <aside className="hidden self-start lg:sticky lg:top-24 lg:block">
            <nav className="rounded-2xl border border-white/10 bg-white/[0.025] p-3 backdrop-blur">
              <p className="mb-2 px-2 text-xs uppercase tracking-widest text-gray-500">
                {lang === 'vi' ? 'Mục lục' : 'Contents'}
              </p>
              <ol className="space-y-0.5">
                {all.map((s, i) => {
                  const Icon = s.icon
                  const active = activeId === s.id
                  return (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                          active
                            ? 'bg-primary/15 text-primary'
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className="w-5 text-right text-xs text-gray-500">{i + 1}.</span>
                        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{s.title}</span>
                      </a>
                    </li>
                  )
                })}
              </ol>
            </nav>
          </aside>

          {/* Body */}
          <article className="space-y-8 leading-relaxed text-gray-300">
            {all.map((s, i) => {
              const Icon = s.icon
              return (
                <section
                  key={s.id}
                  id={s.id}
                  className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.025] p-6 shadow-sm backdrop-blur"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <h2 className="text-xl font-bold text-white">
                      <span className="text-primary">{i + 1}.</span> {s.title}
                    </h2>
                  </div>
                  <div className="space-y-3 text-[15px] text-gray-300">{s.body}</div>
                </section>
              )
            })}

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6 text-center text-sm text-gray-400 backdrop-blur">
              <Sparkles className="mx-auto mb-2 h-5 w-5 text-primary" />
              {lang === 'vi'
                ? 'Cảm ơn bạn đã đọc đến cuối! Hãy thưởng thức Anime Wiki có trách nhiệm 💜'
                : 'Thanks for reading to the end! Enjoy Anime Wiki responsibly 💜'}
              <p className="mt-2 text-xs text-gray-500">{lastUpdated}</p>
            </div>
          </article>
        </div>
      </div>
    </Layout>
  )
}

function sections(lang: 'vi' | 'en'): Section[] {
  const isVi = lang === 'vi'
  return [
    {
      id: 'intro',
      icon: ScrollText,
      title: isVi ? 'Giới thiệu' : 'Introduction',
      body: (
        <p>
          {isVi ? (
            <>
              Chào mừng bạn đến với <strong className="text-primary">Anime Wiki</strong> — một dự án
              cộng đồng phi chính thức nhằm tổng hợp, dịch và thảo luận về anime. Khi bạn truy cập
              hoặc tạo tài khoản, bạn xác nhận đã đọc và đồng ý với toàn bộ điều khoản dưới đây.
            </>
          ) : (
            <>
              Welcome to <strong className="text-primary">Anime Wiki</strong> — an unofficial
              community project that aggregates, translates, and discusses anime. By accessing or
              creating an account, you confirm that you have read and agree to all of the terms
              below.
            </>
          )}
        </p>
      ),
    },
    {
      id: 'unofficial',
      icon: AlertTriangle,
      title: isVi ? 'Tính chất phi chính thức' : 'Unofficial nature',
      body: (
        <p>
          {isVi
            ? 'Anime Wiki không có liên kết với MyAnimeList, AniList, Crunchyroll, Netflix hay bất kỳ studio sản xuất / nhà phát hành nào. Toàn bộ metadata anime hiển thị được lấy từ AniList GraphQL API công khai và phục vụ mục đích thông tin / giáo dục.'
            : 'Anime Wiki is not affiliated with MyAnimeList, AniList, Crunchyroll, Netflix, or any production studio / distributor. All anime metadata shown is fetched from the public AniList GraphQL API and is provided for informational and educational purposes only.'}
        </p>
      ),
    },
    {
      id: 'ip',
      icon: BookOpen,
      title: isVi ? 'Quyền sở hữu trí tuệ' : 'Intellectual property',
      body: (
        <p>
          {isVi
            ? 'Tất cả poster, ảnh nhân vật, tên thương hiệu, logo và tóm tắt thuộc sở hữu của các chủ sở hữu bản quyền tương ứng. Anime Wiki chỉ hiển thị, không bán hoặc tái phân phối nội dung. Nếu bạn là chủ sở hữu bản quyền và muốn yêu cầu gỡ bỏ, vui lòng liên hệ qua email ở mục 14.'
            : 'All posters, character images, brand names, logos, and synopses are the property of their respective copyright holders. Anime Wiki only displays content; it does not sell or redistribute any media. If you are a rights holder and want to request a takedown, contact us via the email in section 14.'}
        </p>
      ),
    },
    {
      id: 'eligibility',
      icon: Users,
      title: isVi ? 'Điều kiện sử dụng' : 'Eligibility',
      body: (
        <ul className="list-disc space-y-1 pl-5">
          <li>
            {isVi
              ? 'Bạn phải đủ 13 tuổi (hoặc tuổi tối thiểu hợp pháp để dùng dịch vụ trực tuyến tại quốc gia của bạn).'
              : 'You must be at least 13 years old (or the minimum legal age to use online services in your country).'}
          </li>
          <li>
            {isVi
              ? 'Bạn cam kết cung cấp thông tin chính xác khi đăng ký tài khoản.'
              : 'You agree to provide accurate information when creating an account.'}
          </li>
          <li>
            {isVi
              ? 'Một người chỉ nên giữ một tài khoản chính. Tài khoản phụ phải dùng đúng mục đích.'
              : 'One person should maintain one primary account. Secondary accounts must be used in good faith.'}
          </li>
        </ul>
      ),
    },
    {
      id: 'accounts',
      icon: Shield,
      title: isVi ? 'Tài khoản & bảo mật' : 'Accounts & security',
      body: (
        <ul className="list-disc space-y-1 pl-5">
          <li>
            {isVi
              ? 'Bạn chịu trách nhiệm bảo mật mật khẩu / token đăng nhập của mình.'
              : 'You are responsible for keeping your password and auth tokens secret.'}
          </li>
          <li>
            {isVi
              ? 'Thông báo cho chúng tôi ngay nếu phát hiện bất kỳ truy cập trái phép nào.'
              : 'Notify us immediately if you detect any unauthorized access.'}
          </li>
          <li>
            {isVi
              ? 'Chúng tôi không chịu trách nhiệm cho thiệt hại do chia sẻ tài khoản.'
              : 'We are not liable for losses caused by sharing accounts.'}
          </li>
        </ul>
      ),
    },
    {
      id: 'content',
      icon: Upload,
      title: isVi ? 'Nội dung do người dùng đăng' : 'User-generated content',
      body: (
        <>
          <p>
            {isVi
              ? 'Khi đăng bình luận, hình ảnh, đánh giá hoặc liên kết Spotify, bạn cấp cho Anime Wiki giấy phép phi độc quyền, miễn phí, toàn cầu để hiển thị nội dung đó trên dịch vụ của chúng tôi.'
              : 'When you post comments, images, reviews, or Spotify links, you grant Anime Wiki a non-exclusive, royalty-free, worldwide license to display that content on our service.'}
          </p>
          <p>
            {isVi
              ? 'Bạn KHÔNG được đăng nội dung:'
              : 'You may NOT post content that:'}
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>{isVi ? 'Vi phạm bản quyền hoặc quyền riêng tư của người khác.' : 'Infringes copyright or another person\'s privacy.'}</li>
            <li>{isVi ? 'Quấy rối, đe dọa hoặc kích động thù hận.' : 'Harasses, threatens, or incites hatred.'}</li>
            <li>{isVi ? 'Có tính chất khiêu dâm rõ ràng (NSFW), bạo lực cực đoan hoặc bất hợp pháp.' : 'Is sexually explicit (NSFW), extremely violent, or illegal.'}</li>
            <li>{isVi ? 'Là spam, lừa đảo, hoặc quảng cáo trái phép.' : 'Is spam, scam, or unauthorized advertising.'}</li>
          </ul>
        </>
      ),
    },
    {
      id: 'moderation',
      icon: Eye,
      title: isVi ? 'Kiểm duyệt' : 'Moderation',
      body: (
        <p>
          {isVi
            ? 'Chúng tôi có toàn quyền (nhưng không có nghĩa vụ) gỡ bỏ bất kỳ nội dung nào và đình chỉ / xóa tài khoản vi phạm điều khoản. Trong trường hợp nghiêm trọng, chúng tôi có thể chia sẻ thông tin với cơ quan có thẩm quyền theo yêu cầu hợp pháp.'
            : 'We reserve the right (but not the obligation) to remove any content and suspend/delete accounts that violate these terms. In serious cases we may share information with authorities if legally required.'}
        </p>
      ),
    },
    {
      id: 'prohibited',
      icon: Ban,
      title: isVi ? 'Hành vi bị cấm' : 'Prohibited conduct',
      body: (
        <ul className="list-disc space-y-1 pl-5">
          <li>{isVi ? 'Scrape / cào dữ liệu Anime Wiki bằng bot không được cấp phép.' : 'Scraping Anime Wiki with unauthorized bots.'}</li>
          <li>{isVi ? 'Tấn công bảo mật, brute-force, DoS hoặc khai thác lỗi.' : 'Security attacks, brute-force, DoS, or vulnerability exploitation.'}</li>
          <li>{isVi ? 'Tạo nhiều tài khoản giả để vote thao túng / lừa hệ thống.' : 'Creating fake accounts to manipulate votes or game the system.'}</li>
          <li>{isVi ? 'Tải lên malware hoặc nội dung gây hại.' : 'Uploading malware or harmful content.'}</li>
        </ul>
      ),
    },
    {
      id: 'privacy',
      icon: Cookie,
      title: isVi ? 'Quyền riêng tư & dữ liệu' : 'Privacy & data',
      body: (
        <p>
          {isVi
            ? 'Chúng tôi lưu trữ email, tên hiển thị, ảnh đại diện, sở thích anime, bình luận và (nếu bạn cung cấp) ngày sinh / giới tính / link Spotify trên Supabase. Dữ liệu chỉ dùng để vận hành dịch vụ. Bạn có quyền yêu cầu xóa tài khoản và toàn bộ dữ liệu liên quan bất kỳ lúc nào.'
            : 'We store your email, display name, avatar, anime preferences, comments, and (if provided) birthday / gender / Spotify link on Supabase. Data is used solely to operate the service. You may request deletion of your account and all associated data at any time.'}
        </p>
      ),
    },
    {
      id: 'thirdparty',
      icon: Globe2,
      title: isVi ? 'Dịch vụ bên thứ ba' : 'Third-party services',
      body: (
        <p>
          {isVi
            ? 'Anime Wiki tích hợp AniList (data anime), Supabase (auth + database + storage), Spotify (embed nhạc), DeepL / LibreTranslate / MyMemory (dịch tự động) và Vercel (hosting). Việc sử dụng các tính năng đó cũng tuân theo điều khoản của bên thứ ba liên quan.'
            : 'Anime Wiki integrates AniList (anime data), Supabase (auth + database + storage), Spotify (music embeds), DeepL / LibreTranslate / MyMemory (auto translation), and Vercel (hosting). Using those features is also subject to the third-party providers\' terms.'}
        </p>
      ),
    },
    {
      id: 'liability',
      icon: AlertTriangle,
      title: isVi ? 'Giới hạn trách nhiệm' : 'Limitation of liability',
      body: (
        <p>
          {isVi
            ? 'Anime Wiki được cung cấp "nguyên trạng" (AS IS) và "có thế nào dùng thế nấy" (AS AVAILABLE), không có bảo hành thuộc bất kỳ loại nào. Trong phạm vi tối đa pháp luật cho phép, chúng tôi không chịu trách nhiệm cho mọi thiệt hại trực tiếp / gián tiếp / ngẫu nhiên / hệ quả phát sinh từ việc bạn sử dụng dịch vụ.'
            : 'Anime Wiki is provided "AS IS" and "AS AVAILABLE" with no warranty of any kind. To the maximum extent permitted by law, we shall not be liable for any direct, indirect, incidental, or consequential damages arising from your use of the service.'}
        </p>
      ),
    },
    {
      id: 'termination',
      icon: Trash2,
      title: isVi ? 'Chấm dứt sử dụng' : 'Termination',
      body: (
        <p>
          {isVi
            ? 'Bạn có thể xóa tài khoản bất kỳ lúc nào trong trang Hồ sơ. Chúng tôi cũng có thể chấm dứt quyền truy cập của bạn nếu bạn vi phạm nghiêm trọng các điều khoản này. Sau khi chấm dứt, một số dữ liệu có thể vẫn được giữ lại trong bản sao lưu trong tối đa 30 ngày trước khi xóa hoàn toàn.'
            : 'You may delete your account at any time from the Profile page. We may also terminate your access if you seriously violate these terms. After termination, some data may remain in backups for up to 30 days before being permanently erased.'}
        </p>
      ),
    },
    {
      id: 'changes',
      icon: ScrollText,
      title: isVi ? 'Thay đổi điều khoản' : 'Changes to these terms',
      body: (
        <p>
          {isVi
            ? 'Chúng tôi có thể cập nhật điều khoản này theo thời gian. Khi có thay đổi đáng kể, chúng tôi sẽ thông báo trên trang chủ hoặc qua email. Việc tiếp tục sử dụng dịch vụ sau khi cập nhật đồng nghĩa với việc bạn chấp nhận điều khoản mới.'
            : 'We may update these terms from time to time. For material changes, we will notify you on the home page or via email. Continued use of the service after the update means you accept the new terms.'}
        </p>
      ),
    },
    {
      id: 'contact',
      icon: Mail,
      title: isVi ? 'Liên hệ' : 'Contact',
      body: (
        <p>
          {isVi ? (
            <>
              Mọi câu hỏi về điều khoản, vui lòng mở issue tại{' '}
              <a
                href="https://github.com/nhatnam232/anm/issues"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                kho GitHub của dự án
              </a>{' '}
              hoặc gửi email tới{' '}
              <a className="text-primary" href="mailto:nhatnam232@users.noreply.github.com">
                nhatnam232@users.noreply.github.com
              </a>
              .
            </>
          ) : (
            <>
              For questions about these terms please open an issue on the{' '}
              <a
                href="https://github.com/nhatnam232/anm/issues"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                project\'s GitHub repository
              </a>{' '}
              or email{' '}
              <a className="text-primary" href="mailto:nhatnam232@users.noreply.github.com">
                nhatnam232@users.noreply.github.com
              </a>
              .
            </>
          )}
        </p>
      ),
    },
  ]
}
