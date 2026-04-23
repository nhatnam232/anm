import { useEffect, useState } from 'react'
import { Shield } from 'lucide-react'
import ReloadLink from '@/components/ReloadLink'
import { useLangContext } from '@/providers/LangProvider'
import { isBotEnvironment } from '@/lib/bot'

const TOS_ACCEPTED_KEY = 'anm-tos-accepted'

export default function TosModal() {
  const { lang } = useLangContext()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Don't bother search-engine crawlers / unfurlers with the popup — let
    // them see the actual content so previews render correctly.
    if (isBotEnvironment()) return

    // Show modal only if user hasn't accepted yet
    const accepted = localStorage.getItem(TOS_ACCEPTED_KEY)
    if (!accepted) {
      // Small delay so it doesn't flash on first paint
      const timer = setTimeout(() => setOpen(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])


  const handleAccept = () => {
    localStorage.setItem(TOS_ACCEPTED_KEY, '1')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
        {/* Header */}
        <div className="border-b border-white/10 bg-gradient-to-r from-primary/20 via-sky-500/10 to-emerald-400/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/20">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {lang === 'vi' ? 'Điều Khoản Sử Dụng' : 'Terms of Service'}
              </h2>
              <p className="text-sm text-gray-400">Anime Wiki</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 text-sm text-gray-300">
          {lang === 'vi' ? (
            <div className="space-y-3">
              <p>
                Chào mừng bạn đến với <strong className="text-primary">Anime Wiki</strong>! Trước khi tiếp tục, vui lòng đọc và đồng ý với các điều khoản sau:
              </p>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">•</span>
                  Anime Wiki là dự án <strong className="text-white">phi chính thức</strong>, không liên kết với bất kỳ hãng anime nào.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">•</span>
                  Dữ liệu được tổng hợp từ nguồn công khai cho mục đích thông tin và giáo dục.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">•</span>
                  Bạn đồng ý không đăng nội dung vi phạm pháp luật hoặc quấy rối người khác.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">•</span>
                  Dịch vụ được cung cấp "nguyên trạng" — chúng tôi không đảm bảo tính chính xác tuyệt đối.
                </li>
              </ul>
              <p>
                Xem đầy đủ tại{' '}
                <ReloadLink to="/tos" className="text-primary underline hover:text-primary/80">
                  Trang Điều Khoản
                </ReloadLink>
                .
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p>
                Welcome to <strong className="text-primary">Anime Wiki</strong>! Before continuing, please read and agree to the following terms:
              </p>
              <ul className="space-y-2 text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">•</span>
                  Anime Wiki is an <strong className="text-white">unofficial</strong> project, not affiliated with any anime studio.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">•</span>
                  Data is aggregated from public sources for informational and educational purposes.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">•</span>
                  You agree not to post illegal content or harass other users.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">•</span>
                  The service is provided "as-is" — we do not guarantee absolute data accuracy.
                </li>
              </ul>
              <p>
                Read the full terms at{' '}
                <ReloadLink to="/tos" className="text-primary underline hover:text-primary/80">
                  Terms of Service
                </ReloadLink>
                .
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-white/10 px-6 py-4">
          <button
            onClick={handleAccept}
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary/90"
          >
            {lang === 'vi' ? '✓ Tôi đồng ý & Tiếp tục' : '✓ I Agree & Continue'}
          </button>
          <ReloadLink
            to="/tos"
            onClick={handleAccept}
            className="flex items-center justify-center rounded-xl border border-gray-700 px-4 py-2.5 text-sm text-gray-300 transition-colors hover:border-primary hover:text-white"
          >
            {lang === 'vi' ? 'Đọc thêm' : 'Read More'}
          </ReloadLink>
        </div>
      </div>
    </div>
  )
}
