import Link from 'next/link'
import Logo from '@/app/components/Logo'

/* ---- Mock data for demo cards ---- */
const mockStats = [
  { label: 'Net Worth', value: '$24,180', color: 'text-emerald-400' },
  { label: 'Cash', value: '$31,420', color: 'text-lime-400' },
  { label: 'Debt', value: '$7,240', color: 'text-amber-400' },
  { label: 'Monthly Spending', value: '$4,820', color: 'text-blue-400' },
]

const mockTransactions = [
  { name: 'Starbucks Reserve', date: 'Today', amount: '-$6.40', expense: true },
  { name: 'Amazon.com', date: 'Yesterday', amount: '-$47.99', expense: true },
  { name: 'Payroll Deposit', date: 'Mar 15', amount: '+$3,200.00', expense: false },
  { name: 'Uber Eats', date: 'Mar 14', amount: '-$23.50', expense: true },
  { name: 'Netflix', date: 'Mar 13', amount: '-$15.49', expense: true },
]

const mockCategories = [
  { name: 'Dining', pct: 100, amount: '$1,240', color: 'from-orange-500 to-orange-400' },
  { name: 'Shopping', pct: 72, amount: '$893', color: 'from-pink-500 to-pink-400' },
  { name: 'Transportation', pct: 48, amount: '$596', color: 'from-cyan-500 to-cyan-400' },
  { name: 'Subscriptions', pct: 24, amount: '$298', color: 'from-violet-500 to-violet-400' },
]

// Generate mock heatmap (52 weeks x 7 days)
const heatColors = ['bg-[#161b22]', 'bg-[#0e4429]', 'bg-[#006d32]', 'bg-[#26a641]', 'bg-[#39d353]']
const mockHeatmap = Array.from({ length: 364 }, (_, i) => {
  const seed = Math.sin(i * 0.3) * 0.5 + 0.5
  const level = i > 180 ? Math.floor(seed * 5) : Math.floor(seed * 3)
  return heatColors[Math.min(level, 4)]
})

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-32 h-[28rem] w-[28rem] rounded-full bg-teal-500/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between py-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <Logo size={38} />
            <span className="text-base font-semibold tracking-wide text-emerald-400">Hoff Labs</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800/70 hover:text-slate-100"
            >
              Sign In
            </Link>
            <Link href="/auth/register" className="btn-primary px-4 py-2 text-sm">
              Get Started
            </Link>
          </div>
        </header>

        <main className="flex-1 pb-16 pt-8">
          {/* Hero */}
          <section className="text-center animate-fade-in-up">
            <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-emerald-200">
              For people who hate looking at finances
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
              Debt cleanup without
              <span className="block bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                spreadsheet pain.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-300">
              Track spending, roast bad habits, and build a real payoff plan in a private-by-default dashboard.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/auth/register" className="btn-primary px-6 py-3 text-sm sm:text-base">
                Generate my account
              </Link>
              <Link
                href="/auth/login"
                className="rounded-lg border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/70 sm:text-base"
              >
                I already have an account
              </Link>
            </div>
          </section>

          {/* Demo Cards Section */}
          <section className="mt-16 space-y-5 animate-fade-in-up stagger-2">
            <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-slate-500">What your dashboard looks like</p>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {mockStats.map(s => (
                <div key={s.label} className="glass-card p-4">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Middle row: Spending Trend + Heatmap */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Mock Spending Trend */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Spending Trend</h3>
                <div className="h-40 flex items-end gap-[3px]">
                  {[35, 48, 42, 65, 52, 78, 45, 62, 38, 55, 72, 40].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: 'linear-gradient(to top, #1e40af, #3b82f6)' }} />
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m => (
                    <span key={m} className="text-[8px] text-slate-600 flex-1 text-center">{m}</span>
                  ))}
                </div>
              </div>

              {/* Mock Heatmap */}
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Spending Activity</h3>
                  <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">14d streak</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(52, 1fr)', gap: '2px' }}>
                  {mockHeatmap.map((color, i) => (
                    <div key={i} className={`aspect-square rounded-[1.5px] ${color}`} />
                  ))}
                </div>
                <div className="flex items-center justify-end gap-1 mt-2">
                  <span className="text-[8px] text-slate-600">Less</span>
                  {heatColors.map((c, i) => <div key={i} className={`w-2 h-2 rounded-[1.5px] ${c}`} />)}
                  <span className="text-[8px] text-slate-600">More</span>
                </div>
              </div>
            </div>

            {/* Bottom row: Categories + Recent Transactions + Alert */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Mock Categories */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Top Categories</h3>
                <div className="space-y-3">
                  {mockCategories.map(cat => (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-200">{cat.name}</span>
                        <span className="text-sm font-semibold text-slate-100">{cat.amount}</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${cat.color} rounded-full`} style={{ width: `${cat.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mock Transactions */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Recent Transactions</h3>
                <div className="space-y-1">
                  {mockTransactions.map(tx => (
                    <div key={tx.name} className="flex items-center justify-between py-2 px-2 rounded-lg">
                      <div>
                        <p className="text-sm text-slate-200">{tx.name}</p>
                        <p className="text-[10px] text-slate-600">{tx.date}</p>
                      </div>
                      <span className={`text-sm font-semibold tabular-nums ${tx.expense ? 'text-slate-300' : 'text-emerald-400'}`}>
                        {tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mock Alert + Debt calc */}
              <div className="space-y-5">
                <div className="glass-card p-4 bg-amber-500/5 border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-xs font-semibold text-amber-400">Transaction Alert</span>
                  </div>
                  <p className="text-xs text-slate-400">Unusually large transaction: MICRO CENTER $1,279 is 4x your average purchase.</p>
                </div>

                <div className="glass-card p-4">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Debt Freedom</h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">$7,240 remaining</span>
                    <span className="text-lg font-bold text-emerald-400">17 months</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-lime-500 rounded-full" style={{ width: '38%' }} />
                  </div>
                  <p className="text-[10px] text-slate-600 mt-2">Paying $500/mo at current pace</p>
                </div>
              </div>
            </div>
          </section>

          {/* Feature highlights */}
          <section className="mt-16 grid gap-5 md:grid-cols-3">
            {[
              { title: 'One brutally clear command center', description: 'Accounts, subscriptions, and debt goals in one screen that updates instantly.', accent: 'from-emerald-500/20 to-teal-500/20' },
              { title: 'Spending intel with attitude', description: 'Spot category spikes and recurring waste before they quietly drain your cash flow.', accent: 'from-cyan-500/20 to-sky-500/20' },
              { title: 'Anonymous by design', description: 'No email. No password. Bank-grade encryption keeps your financial signal locked down.', accent: 'from-emerald-400/20 to-lime-500/20' },
            ].map((feature, index) => (
              <article
                key={feature.title}
                className={`group rounded-2xl border border-slate-700/60 bg-gradient-to-b ${feature.accent} from-0% to-100% p-[1px] animate-fade-in-up`}
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className="h-full rounded-2xl bg-slate-900/90 p-6 transition group-hover:bg-slate-900">
                  <h2 className="text-lg font-semibold text-slate-100">{feature.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{feature.description}</p>
                </div>
              </article>
            ))}
          </section>

          {/* CTA */}
          <section className="mt-14 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-6 text-center backdrop-blur sm:p-8">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Ready for financial tough love?</p>
            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">Spend smarter. Roast harder. Pay debt faster.</h2>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/auth/register" className="btn-primary px-6 py-3 text-sm sm:text-base">
                Create anonymous account
              </Link>
              <Link
                href="/auth/login"
                className="rounded-lg border border-slate-700 px-6 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/70 sm:text-base"
              >
                Sign In
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
