import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-white to-mint/5 py-28 px-6">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <p className="text-sm font-bold tracking-widest uppercase text-primary mb-6">
            KI-Lernplattform
          </p>
          <h1 className="text-5xl md:text-7xl font-extrabold text-dark leading-tight mb-6">
            Lernen, das sich
            <span className="text-primary"> anpasst.</span>
          </h1>
          <p className="text-lg md:text-xl text-dark/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            LUMI ist die KI-Lernplattform fuer Schueler. Sokratisches Tutoring,
            Bilderkennung, Sprachsteuerung – alles in einer App. Paedagogisch
            fundiert und datenschutzkonform.
          </p>
          <Link
            to="/login"
            className="inline-block bg-primary text-white text-lg font-bold px-10 py-4 rounded-full hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
          >
            Jetzt starten
          </Link>
        </div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-mint/5 rounded-full blur-3xl" />
      </section>

      {/* Bento Feature Grid – Apple Keynote Style */}
      <section className="py-20 px-6 bg-[#f5f5f7]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-extrabold text-dark text-center mb-4">
            Alles, was Lernen braucht.
          </h2>
          <p className="text-dark/50 text-center text-lg mb-14 max-w-2xl mx-auto">
            Eine Plattform. Entwickelt mit Paedagogen, gebaut fuer Schueler.
          </p>

          {/* Desktop Bento Grid – 4 cols × 4 rows, explicit placement */}
          <div className="hidden lg:grid grid-cols-4 grid-rows-[150px_150px_150px_150px] gap-3">

            {/* (1,1)→(2,1) – Sokratisches Tutoring */}
            <div className="col-start-1 row-start-1 row-span-2 bg-gradient-to-b from-primary to-indigo-600 text-white rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-extrabold mb-1">Sokratisches Tutoring</h3>
                <p className="text-white/60 text-xs">KI fragt dich – du denkst selber.</p>
              </div>
              <div className="flex flex-col gap-2 mt-4">
                {['Grundlagen', 'Vertiefung', 'Uebung'].map((s, i) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg ${i === 2 ? 'bg-white/30 ring-2 ring-white/50' : 'bg-white/15'} flex items-center justify-center text-xs font-bold shrink-0`}>{i + 1}</div>
                    <span className="text-white/50 text-xs font-medium">{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* (1,2) – Bilderkennung */}
            <div className="col-start-2 row-start-1 bg-white rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-dark">Bilderkennung</h3>
                <p className="text-dark/40 text-xs mt-1">Foto abfotografieren. Sofort Hilfe.</p>
              </div>
              <div className="flex justify-end">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange to-amber-400 flex items-center justify-center">
                  <div className="w-5 h-5 border-[1.5px] border-white rounded-md relative">
                    <div className="absolute inset-0 flex items-center justify-center"><div className="w-2 h-2 rounded-full border-[1.5px] border-white" /></div>
                  </div>
                </div>
              </div>
            </div>

            {/* (1,3) – 3-Schritte-Methode */}
            <div className="col-start-3 row-start-1 bg-white rounded-3xl p-6 flex flex-col justify-between">
              <h3 className="text-sm font-extrabold text-dark">3-Schritte-Methode</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</div>
                <div className="w-3 h-0.5 bg-dark/10" />
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</div>
                <div className="w-3 h-0.5 bg-dark/10" />
                <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary text-xs font-bold flex items-center justify-center ring-1 ring-primary/30">3</div>
              </div>
            </div>

            {/* (1,4) – Apple Pencil */}
            <div className="col-start-4 row-start-1 bg-white rounded-3xl p-6 flex flex-col justify-between">
              <h3 className="text-sm font-extrabold text-dark">Apple Pencil</h3>
              <div className="flex items-end gap-3">
                <div className="w-1.5 h-12 bg-gradient-to-b from-dark to-dark/60 rounded-full transform rotate-[25deg] origin-bottom" />
                <div className="flex flex-col gap-0.5 pb-1">
                  <div className="w-10 h-[2px] bg-dark/15 rounded" />
                  <div className="w-7 h-[2px] bg-dark/20 rounded" />
                  <div className="w-12 h-[2px] bg-dark/10 rounded" />
                </div>
              </div>
            </div>

            {/* (2,2)→(3,3) – LUMI Intelligence CENTER */}
            <div className="col-start-2 col-span-2 row-start-2 row-span-2 rounded-3xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #f97316 0%, #ec4899 20%, #a855f7 45%, #6366f1 70%, #3b82f6 100%)' }}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
              <div className="relative z-10">
                <p className="text-white/70 text-xs font-bold tracking-widest uppercase mb-2">Powered by Gemini</p>
                <h3 className="text-4xl xl:text-5xl font-extrabold text-white mb-2 leading-tight">
                  LUMI<br />Intelligence
                </h3>
                <p className="text-white/60 text-sm max-w-[240px] mx-auto leading-relaxed">
                  Personalisiertes Lernen mit kuenstlicher Intelligenz.
                </p>
              </div>
              <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute bottom-4 left-4 w-12 h-12 rounded-full bg-white/10 blur-2xl" />
            </div>

            {/* (2,4)→(3,4) – Kursbasiertes Lernen */}
            <div className="col-start-4 row-start-2 row-span-2 bg-gradient-to-b from-blue-50 to-indigo-50 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-dark mb-1">Kursbasiert</h3>
                <p className="text-dark/40 text-xs">Jeder Chat in einem Fach.</p>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                {[
                  { l: 'M', c: 'from-blue-400 to-indigo-500', label: 'Mathe' },
                  { l: 'D', c: 'from-emerald-400 to-teal-500', label: 'Deutsch' },
                  { l: 'E', c: 'from-rose-400 to-orange-400', label: 'Englisch' },
                ].map((s) => (
                  <div key={s.l} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${s.c} flex items-center justify-center shrink-0`}>
                      <span className="text-white text-[10px] font-bold">{s.l}</span>
                    </div>
                    <span className="text-dark/60 text-xs font-semibold">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* (3,1) – Streak */}
            <div className="col-start-1 row-start-3 bg-gradient-to-br from-orange/10 to-amber-50 rounded-3xl p-6 flex flex-col justify-between">
              <h3 className="text-sm font-extrabold text-dark">Streak</h3>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1,2,3,4,5].map((d) => (
                    <div key={d} className={`w-4 h-4 rounded-sm ${d <= 4 ? 'bg-orange' : 'bg-dark/10'} mr-0.5`} />
                  ))}
                </div>
                <span className="text-orange font-extrabold text-xs">4 Tage</span>
              </div>
            </div>

            {/* (4,1) – Spracheingabe */}
            <div className="col-start-1 row-start-4 bg-gradient-to-br from-mint/10 to-emerald-50 rounded-3xl p-6 flex flex-col justify-between">
              <h3 className="text-sm font-extrabold text-dark">Spracheingabe</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-mint flex items-center justify-center">
                    <div className="w-3 h-5 bg-white rounded-full" />
                  </div>
                  <div className="absolute -inset-1 rounded-full border border-mint/30 animate-ping" />
                </div>
                <span className="text-dark/40 text-xs font-medium">Sprechen statt tippen</span>
              </div>
            </div>

            {/* (4,2) – Blast Game */}
            <div className="col-start-2 row-start-4 bg-gradient-to-br from-dark to-slate-800 text-white rounded-3xl p-6 flex flex-col justify-between">
              <h3 className="text-sm font-extrabold">Blast Game</h3>
              <div className="flex items-end gap-2">
                <div className="flex flex-col items-center">
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-orange" />
                  <div className="w-3 h-5 bg-gradient-to-b from-orange to-red-500 rounded-b-sm" />
                </div>
                <div className="flex gap-0.5">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold text-white/60">42</div>
                  <div className="w-5 h-5 rounded-full bg-mint/20 flex items-center justify-center text-[8px] font-bold text-mint ring-1 ring-mint/40">56</div>
                </div>
              </div>
            </div>

            {/* (4,3) – KMK-Standards */}
            <div className="col-start-3 row-start-4 bg-dark text-white rounded-3xl p-6 flex flex-col justify-between">
              <h3 className="text-sm font-extrabold">KMK-Standards</h3>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full border-2 border-mint flex items-center justify-center shrink-0">
                  <span className="text-mint text-sm font-black">✓</span>
                </div>
                <span className="text-white/40 text-[10px] font-medium leading-tight">Gepruefte Lehrplaene</span>
              </div>
            </div>

            {/* (4,4) – DSGVO */}
            <div className="col-start-4 row-start-4 bg-dark text-white rounded-3xl p-6 flex flex-col justify-between">
              <h3 className="text-sm font-extrabold">DSGVO-konform</h3>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <span className="text-white/70 text-[10px] font-black">EU</span>
                </div>
                <span className="text-white/40 text-[10px] font-medium">Hosting in Europa</span>
              </div>
            </div>
          </div>

          {/* Mobile/Tablet Fallback Grid */}
          <div className="grid lg:hidden grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Center Hero */}
            <div className="sm:col-span-2 rounded-3xl p-10 flex flex-col items-center justify-center text-center min-h-[240px] relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #f97316 0%, #ec4899 25%, #a855f7 50%, #6366f1 75%, #3b82f6 100%)' }}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
              <div className="relative z-10">
                <p className="text-white/70 text-sm font-bold tracking-widest uppercase mb-3">Powered by Gemini</p>
                <h3 className="text-4xl font-extrabold text-white mb-3">LUMI Intelligence</h3>
                <p className="text-white/60 text-sm max-w-xs mx-auto">Personalisiertes Lernen mit KI.</p>
              </div>
            </div>
            {/* Feature Cards */}
            {[
              { title: 'Sokratisches Tutoring', sub: 'KI fragt dich – du denkst selber.', bg: 'bg-gradient-to-br from-primary to-indigo-600 text-white' },
              { title: 'Bilderkennung', sub: 'Foto vom Arbeitsblatt. Sofort Hilfe.', bg: 'bg-white' },
              { title: 'Apple Pencil', sub: 'Handschrift wird zu Text.', bg: 'bg-white' },
              { title: '3-Schritte-Methode', sub: 'Grundlagen, Vertiefung, Uebung.', bg: 'bg-white' },
              { title: 'Kursbasiertes Lernen', sub: 'Jeder Chat gehoert zu einem Fach.', bg: 'bg-blue-50' },
              { title: 'Blast Game', sub: 'Mathe als Weltraum-Shooter.', bg: 'bg-dark text-white' },
              { title: 'Spracheingabe', sub: 'Sprechen statt tippen.', bg: 'bg-mint/10' },
              { title: 'Streak', sub: 'Lerne jeden Tag am Stueck.', bg: 'bg-orange/10' },
              { title: 'KMK-Standards', sub: 'Gepruefte Lehrplaene.', bg: 'bg-dark text-white' },
              { title: 'DSGVO-konform', sub: 'Hosting in Europa.', bg: 'bg-dark text-white' },
            ].map((c) => (
              <div key={c.title} className={`${c.bg} rounded-3xl p-6 min-h-[120px] flex flex-col justify-between`}>
                <h3 className="text-base font-extrabold">{c.title}</h3>
                <p className={`text-sm mt-1 ${c.bg.includes('text-white') ? 'text-white/50' : 'text-dark/40'}`}>{c.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust / Partners */}
      <section className="py-16 px-6 bg-gray/50">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm font-bold tracking-widest uppercase text-dark/30 mb-10">
            Vertraut von Schulen und Paedagogen
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {[
              'Gymnasium Muenchen-Nord',
              'Realschule am See',
              'Paedagogisches Institut Bayern',
              'Digitale Bildung e.V.',
            ].map((name) => (
              <span
                key={name}
                className="text-dark/25 font-bold text-base md:text-lg whitespace-nowrap"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-extrabold text-dark text-center mb-4">
            Was andere sagen.
          </h2>
          <p className="text-dark/50 text-center text-lg mb-14 max-w-xl mx-auto">
            Lehrer, Eltern und Schulleiter ueber LUMI.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote:
                  'LUMI hat meinen Unterricht veraendert. Die Schueler arbeiten selbststaendig und motiviert.',
                name: 'Dr. Maria Hofmann',
                role: 'Mathematiklehrerin, Gymnasium Muenchen',
              },
              {
                quote:
                  'Mein Sohn lernt jetzt freiwillig. Die Fortschritte sind sichtbar.',
                name: 'Thomas Weber',
                role: 'Vater, Klasse 7',
              },
              {
                quote:
                  'Endlich eine Plattform, die paedagogisch durchdacht ist und den Datenschutz ernst nimmt.',
                name: 'Prof. Andrea Klein',
                role: 'Schulleiterin, Realschule am See',
              },
            ].map((t) => (
              <div
                key={t.name}
                className="bg-white border border-dark/5 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <p className="text-dark/70 text-base leading-relaxed mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p className="font-bold text-dark text-sm">{t.name}</p>
                  <p className="text-dark/40 text-sm">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* So funktioniert's */}
      <section className="py-20 px-6 bg-gray/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-dark mb-14">
            So funktioniert&apos;s.
          </h2>
          <div className="flex flex-col md:flex-row items-center md:items-start gap-10 md:gap-6">
            {[
              { num: 1, text: 'Anmelden & Profil erstellen' },
              { num: 2, text: 'Fach waehlen' },
              { num: 3, text: 'Mit LUMI lernen' },
            ].map((step, i) => (
              <div key={step.num} className="flex-1 flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center text-xl font-extrabold mb-4 shadow-lg shadow-primary/20">
                  {step.num}
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute translate-x-[calc(100%+0.75rem)] translate-y-6 w-10 h-0.5 bg-dark/10" />
                )}
                <p className="text-lg font-bold text-dark">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-extrabold text-dark mb-6">
            Bereit zum Lernen?
          </h2>
          <p className="text-dark/50 text-lg mb-10">
            Starte jetzt kostenlos und entdecke, wie LUMI dich beim Lernen
            unterstuetzt.
          </p>
          <Link
            to="/login"
            className="inline-block bg-primary text-white text-lg font-bold px-12 py-4 rounded-full hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"
          >
            Jetzt kostenlos starten
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-dark/5 text-center">
        <p className="text-dark/30 text-sm">
          © 2026 LUMI – KI-Lernplattform | Impressum | Datenschutz
        </p>
      </footer>
    </div>
  )
}
