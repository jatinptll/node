import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform, Variants } from 'framer-motion';
import { ArrowUpRight, BarChart3, Brain, Clock3, GraduationCap, Menu, Target, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const markVisited = () => localStorage.setItem('node_visited', 'true');

const reveal: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
  }),
};

const INTELLIGENCE_POINTS = [
  {
    number: '01',
    title: 'Know what to do next',
    description: 'Node reads your tasks, deadlines, and goals — then tells you exactly what deserves your attention right now.',
  },
  {
    number: '02',
    title: 'Node learns how you work',
    description: 'Node tracks when you focus best, what you defer, and how your energy shifts — then uses those signals to guide you every day.',
  },
  {
    number: '03',
    title: 'Less managing. More doing.',
    description: 'Stop organizing your system. Node keeps itself updated so you stay in motion and do what actually matters.',
  },
];

const FEATURES = [
  {
    icon: Brain,
    title: 'Node Mind AI',
    description: 'Ask anything about your tasks and goals. Get direct, data-grounded answers instantly.',
  },
  {
    icon: Target,
    title: 'Smart Daily Planning',
    description: 'Every morning, Node suggests your best plan for the day based on your patterns and priorities.',
  },
  {
    icon: BarChart3,
    title: 'Behavioral Insights',
    description: 'See your peak hours, consistency score, and procrastination patterns — updated every week.',
  },
  {
    icon: Clock3,
    title: 'Focus Sessions',
    description: 'Lock into a single task with a timer. Node logs your actual time and learns your pace.',
  },
  {
    icon: GraduationCap,
    title: 'Google Classroom Sync',
    description: 'Assignments import automatically with due dates. Deadlines update if your professor changes them.',
  },
  {
    icon: ArrowUpRight,
    title: 'Goals & Progress',
    description: 'Set long-term goals and link tasks to them. Watch your progress build day by day.',
  },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const navShadow = useTransform(scrollYProgress, [0, 0.08], ['0 0 0 rgba(0,0,0,0)', '0 18px 40px rgba(5, 8, 20, 0.22)']);

  const handleGetStarted = () => {
    markVisited();
    navigate('/login');
  };

  const handleSignIn = () => {
    markVisited();
    navigate('/login');
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#090611] text-[#fff8f3]">
      <div className="landing-gradient pointer-events-none fixed inset-0" />
      <div className="landing-noise pointer-events-none fixed inset-0 opacity-40" />

      <motion.nav className="fixed left-1/2 top-5 z-50 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 overflow-hidden rounded-full">
        <motion.div
          className="flex w-full max-w-3xl items-center justify-between rounded-full p-2.5 text-[#151515]"
          style={{
            boxShadow: navShadow,
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center justify-center"
          >
            <img src="/node-logo-alt-1-3d.svg" alt="Node" className="h-auto w-[90px]" />
          </button>

          <div className="hidden md:block">
            <button
              type="button"
              onClick={handleSignIn}
              className="rounded-full bg-[#0f0b17] px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.04] hover:bg-[#181224]"
            >
              Log in
            </button>
          </div>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0f0b17] text-white md:hidden"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </motion.div>
      </motion.nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[#0b0812]/88 px-6 pt-28 backdrop-blur-2xl md:hidden"
          >
            <div className="mx-auto flex max-w-sm flex-col gap-3 rounded-[28px] border border-white/10 bg-white/[0.05] p-4">
              <button
                type="button"
                onClick={handleSignIn}
                className="rounded-2xl bg-[#fff8ee] px-4 py-4 text-left text-base font-medium text-[#151515]"
              >
                Log in
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10">
        <section className="flex min-h-[100svh] items-center justify-center px-5 pb-32 pt-52 md:px-8 md:pb-44 md:pt-56">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center text-center">
            <motion.div initial="hidden" animate="visible" className="max-w-4xl">
              <motion.div
                custom={0}
                variants={reveal}
                className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 font-['IBM_Plex_Mono',monospace] text-[11px] uppercase tracking-[0.2em] text-white/78"
              >
                <span className="inline-flex items-center justify-center">
                  <svg
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                    className="h-[12px] w-[12px] animate-[spin_4s_linear_infinite]"
                    fill="none"
                  >
                    <path d="M8 1.75V14.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M2.6 4.9L13.4 11.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M13.4 4.9L2.6 11.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
                Work Intelligence Layer
              </motion.div>

              <motion.h1
                custom={0.08}
                variants={reveal}
                className="mx-auto mt-8 max-w-4xl font-['Fraunces',serif] text-[clamp(3.8rem,8vw,7rem)] leading-[0.9] tracking-[-0.05em] text-[#fff5ec]"
              >
                Your work life, made intelligent.
              </motion.h1>

              <motion.p
                custom={0.16}
                variants={reveal}
                className="mx-auto mt-6 max-w-2xl font-['IBM_Plex_Mono',monospace] text-[13px] font-thin leading-7 text-white/78 md:text-[17px] md:leading-9"
              >
                Plan less. Execute more. A system that truly understands you always knows what's next.
              </motion.p>

              <motion.div
                custom={0.24}
                variants={reveal}
                className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
              >
                <button
                  type="button"
                  onClick={handleGetStarted}
                  className="group inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/[0.05] px-7 py-4 text-base font-semibold text-white/90 transition-colors hover:bg-white/[0.09]"
                >
                  Get started
                  <ArrowUpRight
                    size={17}
                    strokeWidth={2.4}
                    className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                  />
                </button>
              </motion.div>
            </motion.div>

          </div>
        </section>

        <section className="px-5 pb-10 pt-4 md:px-8 md:pb-12 md:pt-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="mx-auto max-w-6xl rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-6 backdrop-blur-xl md:p-8"
          >
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
              <div>
                <div className="font-['IBM_Plex_Mono',monospace] text-[11px] uppercase tracking-[0.18em] text-white/62">
                  WHY NODE
                </div>
                <h2 className="mt-4 max-w-lg font-['Fraunces',serif] text-4xl leading-tight text-[#fff5ec] md:text-5xl">
                  You bring the ambition. Node brings the intelligence.
                </h2>
                <p className="mt-5 max-w-md text-sm leading-7 text-white/68 md:text-base">
                  Most productivity tools add complexity. Node removes it — by learning how you work and doing the thinking for you.
                </p>
              </div>

              <div className="space-y-4">
                {INTELLIGENCE_POINTS.map((point, index) => (
                  <motion.div
                    key={point.number}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: index * 0.08 }}
                    className="grid gap-4 rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-5 md:grid-cols-[80px_minmax(0,1fr)] md:items-start"
                  >
                    <div className="font-['IBM_Plex_Mono',monospace] text-sm text-white/48">{point.number}</div>
                    <div>
                      <h3 className="font-['IBM_Plex_Mono',monospace] text-sm font-bold text-[#fff8f3]">{point.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-white/68">{point.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <section id="features" className="px-5 pb-12 pt-16 md:px-8 md:pb-16 md:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="mx-auto max-w-6xl"
          >
            <div className="font-['IBM_Plex_Mono',monospace] text-[11px] uppercase tracking-[0.18em] text-white/62">
              WHAT YOU GET
            </div>
            <h2 className="mt-4 max-w-4xl font-['Fraunces',serif] text-4xl leading-tight text-[#fff5ec] md:text-5xl">
              Everything your productivity needs. Nothing it doesn't.
            </h2>

            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: index * 0.05 }}
                    className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-6 backdrop-blur-xl transition-all duration-300 hover:border-white/14 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.05))]"
                  >
                    <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-white/78">
                      <Icon size={18} strokeWidth={1.8} />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-[#fff8f3]">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-white/72">{feature.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </section>

        <section className="px-5 pb-16 pt-20 md:px-8 md:pb-24 md:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="mx-auto flex max-w-4xl flex-col items-center justify-center py-16 text-center md:py-24"
          >
            <h2 className="font-['Fraunces',serif] text-4xl leading-tight text-[#fff5ec] md:text-5xl">
              Start working with intelligence.
            </h2>
            <p className="mt-5 text-sm text-white/68 md:text-base">
              Free to use. No setup. Just clarity from day one.
            </p>
            <button
              type="button"
              onClick={handleGetStarted}
              className="group mt-8 inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/[0.05] px-7 py-4 text-base font-semibold text-white/90 transition-colors hover:bg-white/[0.09]"
            >
              Get started
              <ArrowUpRight
                size={17}
                strokeWidth={2.4}
                className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
              />
            </button>
          </motion.div>
        </section>
      </main>

      <footer id="contact" className="relative z-10 px-5 pb-8 md:px-8">
        <div className="mx-auto max-w-6xl border-t border-white/10 py-8 md:py-10">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <img src="/node-logo-alt-1-3d.svg" alt="Node" className="h-auto w-[92px]" />
              <p className="mt-4 text-sm text-white/64">Your work life, made intelligent.</p>
              <p className="mt-3 text-sm text-white/50">© 2026 Node · trynode.in</p>
            </div>

            <div>
              <div className="font-['IBM_Plex_Mono',monospace] text-[11px] uppercase tracking-[0.18em] text-white/52">
                PLATFORM
              </div>
              <div className="mt-4 flex flex-col gap-3 text-sm text-white/64">
                <button type="button" onClick={() => scrollToSection('features')} className="text-left transition-colors hover:text-white/85">
                  Features
                </button>
                <button type="button" onClick={() => scrollToSection('how-it-works')} className="text-left transition-colors hover:text-white/85">
                  How it works
                </button>
                <a href="#" className="transition-colors hover:text-white/85">
                  Changelog
                </a>
              </div>
            </div>

            <div>
              <div className="font-['IBM_Plex_Mono',monospace] text-[11px] uppercase tracking-[0.18em] text-white/52">
                COMPANY
              </div>
              <div className="mt-4 flex flex-col gap-3 text-sm text-white/64">
                <a href="/privacy" className="transition-colors hover:text-white/85">
                  Privacy
                </a>
                <a href="/terms" className="transition-colors hover:text-white/85">
                  Terms
                </a>
                <a href="mailto:hello@trynode.in" className="transition-colors hover:text-white/85">
                  Contact
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
