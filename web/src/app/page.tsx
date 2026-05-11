import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center">
      <div className="text-center max-w-2xl px-6">
        {/* Hero */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            AI-Powered Video Creation
          </span>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Tạo video AI{' '}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              bằng trò chuyện
            </span>
          </h1>
          <p className="text-lg text-gray-400 leading-relaxed">
            Kể câu chuyện của bạn bằng tiếng Việt hoặc tiếng Anh.
            FlowBoard sẽ trích xuất nhân vật, thiết kế cảnh, tạo ảnh tham chiếu
            và sản xuất video — tất cả qua chat.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/flow-studio"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-500 transition shadow-lg shadow-purple-500/25"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Bắt đầu tạo video
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-gray-600 text-gray-300 font-semibold hover:border-gray-400 hover:text-white transition"
          >
            Xem cách hoạt động
          </a>
        </div>

        {/* Steps */}
        <div id="how-it-works" className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 text-left">
          {[
            { step: '1', title: 'Kể câu chuyện', desc: 'Mô tả ý tưởng video bằng ngôn ngữ tự nhiên. AI sẽ trích xuất nhân vật, bối cảnh và kịch bản.' },
            { step: '2', title: 'Duyệt & chỉnh sửa', desc: 'Xem lại kế hoạch được trích xuất. Chỉnh sửa cảnh, thêm nhân vật, đổi phong cách.' },
            { step: '3', title: 'Nhận video', desc: 'AI tạo ảnh tham chiếu, cảnh, và video clip. Theo dõi tiến độ real-time trong chat.' },
          ].map((s) => (
            <div key={s.step} className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold mb-3">{s.step}</div>
              <h3 className="text-white font-semibold mb-2">{s.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
