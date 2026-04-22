import Layout from '@/components/Layout'
import { useLangContext } from '@/providers/LangProvider'
import { Shield } from 'lucide-react'

export default function ToS() {
  const { lang } = useLangContext()

  return (
    <Layout>
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white">
            {lang === 'vi' ? 'Điều Khoản Sử Dụng' : 'Terms of Service'}
          </h1>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-gray-300">
          {lang === 'vi' ? (
            <>
              <section>
                <h2 className="mb-3 text-xl font-bold text-white">1. Giới thiệu</h2>
                <p>
                  Chào mừng bạn đến với <strong className="text-primary">ANM WIKI</strong> — nền tảng cơ sở dữ liệu và theo dõi anime phi chính thức. Bằng cách truy cập hoặc sử dụng dịch vụ của chúng tôi, bạn đồng ý tuân thủ các điều khoản dưới đây.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold text-white">2. Tính chất phi chính thức</h2>
                <p>
                  ANM WIKI là một dự án cộng đồng <strong>không chính thức</strong> và không có liên kết với bất kỳ hãng sản xuất anime, nhà phát hành, hay nền tảng phân phối nào. Dữ liệu được tổng hợp từ các nguồn công khai nhằm mục đích thông tin và giáo dục.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold text-white">3. Quyền sở hữu trí tuệ</h2>
                <p>
                  Tất cả hình ảnh, tên nhân vật, logo và nội dung liên quan đến anime thuộc quyền sở hữu của các chủ sở hữu bản quyền tương ứng. ANM WIKI không tuyên bố quyền sở hữu đối với bất kỳ nội dung nào của bên thứ ba.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold text-white">4. Tài khoản người dùng</h2>
                <ul className="list-disc space-y-1 pl-5">
                  <li>Bạn chịu trách nhiệm bảo mật thông tin tài khoản của mình.</li>
                  <li>Không được sử dụng tài khoản để đăng nội dung vi phạm pháp luật, spam hoặc quấy rối người khác.</li>
                  <li>Chúng tôi có quyền tạm khóa hoặc xóa tài khoản vi phạm điều khoản.</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold text-white">5. Nội dung người dùng</h2>
                <p>
                  Khi đăng bình luận hoặc đánh giá, bạn đồng ý rằng nội dung đó không vi phạm bản quyền, không chứa ngôn ngữ thù địch, và phù hợp với cộng đồng anime. Chúng tôi có quyền xóa nội dung không phù hợp mà không cần thông báo trước.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold text-white">6. Giới hạn trách nhiệm</h2>
                <p>
                  ANM WIKI được cung cấp "nguyên trạng" (as-is). Chúng tôi không đảm bảo tính chính xác tuyệt đối của dữ liệu và không chịu trách nhiệm về bất kỳ thiệt hại nào phát sinh từ việc sử dụng dịch vụ.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold text-white">7. Thay đổi điều khoản</h2>
                <p>
                  Chúng tôi có thể cập nhật điều khoản này bất kỳ lúc nào. Việc tiếp tục sử dụng dịch vụ sau khi có thay đổi đồng nghĩa với việc bạn chấp nhận điều khoản mới.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold text-white">8. Liên hệ</h2>
                <p>
                  Nếu bạn có câu hỏi về điều khoản này, vui lòng liên hệ qua trang GitHub của dự án.
                </p>
              </section>

              <p className="text-sm text-gray-500">
                Cập nhật lần cuối: Tháng 4, 2026
              </p>
            </>
          ) : (
            <>
              <section>
                <h2 className="mb-3 text-xl font-bold text-white">1. Introduction</h2>
                <p>
                  Welcome to <strong className="text-primary">ANM WIKI</strong> — an unofficial anime database and tracking platform. By accessing or using our service, you agree to comply with the following terms.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold text-white">2. Unofficial Nature</h2>
                <p>
                  ANM WIKI is an <strong>unofficial</strong> community project and is not affiliated with any anime studio, publisher, or distribution platform. Data is aggregated from public sources for informational and educational purposes.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold text-white">3. Intellectual Property</h2>
                <p>
                  All images, character names, logos, and anime-related content belong to their respective copyright holders. ANM WIKI does not claim ownership of any third-party content.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold text-white">4. User Accounts</h2>
                <ul className="list-disc space-y-1 pl-5">
                  <li>You are responsible for maintaining the security of your account.</li>
                  <li>Accounts must not be used to post illegal content, spam, or harass others.</li>
                  <li>We reserve the right to suspend or delete accounts that violate these terms.</li>
                </ul>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold text-white">5. User Content</h2>
                <p>
                  When posting comments or reviews, you agree that the content does not infringe copyright, does not contain hate speech, and is appropriate for the anime community. We reserve the right to remove inappropriate content without prior notice.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold text-white">6. Limitation of Liability</h2>
                <p>
                  ANM WIKI is provided "as-is." We do not guarantee the absolute accuracy of data and are not liable for any damages arising from the use of the service.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold text-white">7. Changes to Terms</h2>
                <p>
                  We may update these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-xl font-bold text-white">8. Contact</h2>
                <p>
                  If you have questions about these terms, please reach out via the project's GitHub page.
                </p>
              </section>

              <p className="text-sm text-gray-500">
                Last updated: April 2026
              </p>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
