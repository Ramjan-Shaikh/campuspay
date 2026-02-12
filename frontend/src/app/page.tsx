import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-[family-name:var(--font-geist-sans)]">
      {/* Hero Section */}
      <main className="relative overflow-hidden pt-20 pb-16 sm:pt-32 sm:pb-24">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full -z-10" />

        <div className="max-w-7xl mx-auto px-6 text-center lg:text-left lg:grid lg:grid-cols-2 lg:items-center gap-12">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Next-Gen Campus Payments
            </div>

            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white leading-tight">
              Pay, Share & <br /> Explore your <br />
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Campus Life</span>
            </h1>

            <p className="max-w-2xl mx-auto lg:mx-0 text-lg text-slate-400 leading-relaxed">
              CampusPay brings the power of the Algorand blockchain to your university. Effortless expense splitting, seamless event ticketing, and instant peer-to-peer transfers.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <Link
                href="/dashboard"
                className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 py-4 font-semibold text-lg transition-all hover:scale-105"
              >
                Dashboard
              </Link>
              <Link
                href="/events"
                className="rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 px-8 py-4 font-semibold text-lg transition-all"
              >
                Events
              </Link>
              <Link
                href="/fundraisers"
                className="rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 px-8 py-4 font-semibold text-lg transition-all"
              >
                Fundraisers
              </Link>
              <Link
                href="/savings"
                className="rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/20 px-8 py-4 font-semibold text-lg transition-all"
              >
                Savings
              </Link>
            </div>
          </div>

          <div className="hidden lg:block relative">
            <div className="relative z-10 p-8 rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-2xl">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="h-8 w-32 rounded bg-slate-800 animate-pulse" />
                  <div className="h-8 w-8 rounded-full bg-emerald-500/20" />
                </div>
                <div className="h-40 w-full rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-20 rounded-xl bg-slate-800/50 border border-slate-700" />
                  <div className="h-20 rounded-xl bg-slate-800/50 border border-slate-700" />
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-cyan-500/20 blur-2xl rounded-full" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-emerald-500/20 blur-3xl rounded-full" />
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-24 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group p-8 rounded-3xl border border-slate-800 bg-slate-950 hover:bg-slate-900/50 transition-all hover:-translate-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                💳
              </div>
              <h3 className="text-xl font-bold mb-4">Fast Payments</h3>
              <p className="text-slate-400 leading-relaxed">Instant peer-to-peer transfers powered by the Algorand blockchain. No more waiting.</p>
            </div>

            <div className="group p-8 rounded-3xl border border-slate-800 bg-slate-950 hover:bg-slate-900/50 transition-all hover:-translate-y-2">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                🎫
              </div>
              <h3 className="text-xl font-bold mb-4">Event Ticketing</h3>
              <p className="text-slate-400 leading-relaxed">Secure, blockchain-verified tickets for campus events. Say goodbye to fraud.</p>
            </div>

            <div className="group p-8 rounded-3xl border border-slate-800 bg-slate-950 hover:bg-slate-900/50 transition-all hover:-translate-y-2">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:bg-purple-500 group-hover:text-slate-950 transition-colors">
                🤝
              </div>
              <h3 className="text-xl font-bold mb-4">Expense Splitting</h3>
              <p className="text-slate-400 leading-relaxed">Split bills with roommates or club members without the awkward conversations.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-900 text-center text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-6">
          <p>© 2024 CampusPay. Built for the future of campus finance.</p>
        </div>
      </footer>
    </div>
  );
}

