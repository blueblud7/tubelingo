import Link from 'next/link'

const STEPS = [
  { title: 'YouTube 채널 구독', desc: '이미 보고 있는 채널 URL을 붙여넣기만 하면 됩니다.' },
  { title: 'AI가 자동 분석', desc: '새 영상이 올라오면 자막을 분석해 레슨을 자동 생성합니다.' },
  { title: '문장으로 영어 학습', desc: '어휘, 숙어, 문법을 실제 영상 문맥 속에서 배웁니다.' },
]

const FEATURES = [
  { icon: '📺', title: '관심사 기반 학습', desc: '교재 대신 좋아하는 유튜버의 영상으로 공부하세요. 지루할 틈이 없습니다.' },
  { icon: '🤖', title: 'AI 심층 분석', desc: '각 문장의 어휘, 관용구, 문법을 GPT가 한국어로 친절하게 설명합니다.' },
  { icon: '🃏', title: '퀴즈 & 단어장', desc: '빈칸 채우기 퀴즈와 간격 반복 복습으로 오래 기억합니다.' },
]

const FREE_FEATURES = ['채널 2개', '월 레슨 20개', '단어장 100단어', '기본 퀴즈']
const PRO_FEATURES = ['채널 무제한', '레슨 무제한', '단어장 무제한', '오프라인 학습']
const TEAM_FEATURES = ['Pro 기능 전체', '교사 대시보드', '학생 진도 관리', '클래스 채널 관리']

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-[448px]">
        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4">
          <span className="text-lg font-bold text-white">TubeLingo</span>
          <Link href="/auth/sign-in" className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:text-white">
            로그인
          </Link>
        </header>

        {/* Hero */}
        <section className="px-5 pb-10 pt-12 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs text-gray-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
            AI 기반 유튜브 언어 학습
          </div>
          <h1 className="text-[2.25rem] font-bold leading-tight tracking-tight text-white">
            당신이 이미 보는<br />유튜브가 교재입니다
          </h1>
          <p className="mt-4 text-base leading-relaxed text-gray-400">
            구독 중인 YouTube 채널을 AI가 자동으로<br />개인화 영어 레슨으로 변환합니다.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/auth/sign-up"
              className="rounded-2xl bg-blue-500 py-4 text-base font-semibold text-white"
            >
              무료로 시작하기
            </Link>
            <Link
              href="/auth/sign-in"
              className="rounded-2xl border border-gray-800 py-4 text-base font-medium text-gray-400"
            >
              이미 계정이 있어요
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="px-5 py-10">
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-gray-600">
            이렇게 작동해요
          </p>
          <div className="flex flex-col gap-3">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-4 rounded-2xl bg-gray-900 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-sm font-bold text-blue-400">
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-white">{step.title}</p>
                  <p className="mt-0.5 text-sm text-gray-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="px-5 py-10">
          <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-gray-600">
            핵심 기능
          </p>
          <div className="flex flex-col gap-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="rounded-2xl bg-gray-900 p-5">
                <div className="mb-2 text-2xl">{f.icon}</div>
                <h3 className="font-semibold text-white">{f.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="px-5 py-10">
          <p className="mb-1 text-center text-xs font-semibold uppercase tracking-widest text-gray-600">
            요금제
          </p>
          <p className="mb-6 text-center text-xs text-gray-700">언제든 취소 가능 · Stripe 결제</p>
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Free</span>
                <span className="text-xl font-bold text-white">$0</span>
              </div>
              <ul className="mt-3 flex flex-col gap-1.5">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="text-gray-700">•</span> {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">Pro</span>
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">추천</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-blue-400">$6.99</span>
                  <span className="text-sm text-gray-600">/월</span>
                </div>
              </div>
              <ul className="mt-3 flex flex-col gap-1.5">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-blue-400">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Team</span>
                <div className="text-right">
                  <span className="text-xl font-bold text-purple-400">$29.99</span>
                  <span className="text-sm text-gray-600">/월</span>
                </div>
              </div>
              <ul className="mt-3 flex flex-col gap-1.5">
                {TEAM_FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="text-purple-400">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Link
            href="/auth/sign-up"
            className="mt-5 block rounded-2xl bg-blue-500 py-4 text-center text-base font-semibold text-white"
          >
            무료로 시작하기
          </Link>
        </section>

        {/* Footer */}
        <footer className="px-5 py-8 text-center">
          <p className="text-xs text-gray-700">
            © 2025 TubeLingo
          </p>
        </footer>
      </div>
    </div>
  )
}
