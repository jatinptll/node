import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, ExternalLink } from 'lucide-react';

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <section id={id} className="scroll-mt-8">
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-primary/10 text-primary text-[11px] font-mono flex items-center justify-center flex-shrink-0">§</span>
            {title}
        </h2>
        <div className="text-sm text-muted-foreground space-y-3 pl-8">{children}</div>
    </section>
);

const Privacy = () => {
    const toc = [
        { id: 'overview', label: 'Overview' },
        { id: 'who', label: 'Who We Are' },
        { id: 'data-collected', label: 'Data We Collect' },
        { id: 'google', label: 'Google APIs & Classroom' },
        { id: 'how-we-use', label: 'How We Use Your Data' },
        { id: 'sharing', label: 'Data Sharing & Disclosure' },
        { id: 'retention', label: 'Data Retention' },
        { id: 'security', label: 'Security' },
        { id: 'children', label: "Children's Privacy" },
        { id: 'rights', label: 'Your Rights' },
        { id: 'changes', label: 'Changes to This Policy' },
        { id: 'contact', label: 'Contact' },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            to="/"
                            className="p-1.5 rounded-lg hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <img src="/favicon.svg" alt="Node" className="w-6 h-6" />
                            <span className="font-semibold text-sm">Node</span>
                        </div>
                    </div>
                    <Link to="/terms" className="text-xs text-muted-foreground hover:text-primary transition-colors font-mono">
                        Terms of Service →
                    </Link>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 flex gap-10">
                {/* Sidebar ToC — desktop only */}
                <aside className="hidden lg:block w-56 flex-shrink-0">
                    <div className="sticky top-24 space-y-1">
                        <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-3">Contents</p>
                        {toc.map(item => (
                            <a
                                key={item.id}
                                href={`#${item.id}`}
                                className="block text-xs text-muted-foreground hover:text-primary py-1 transition-colors"
                            >
                                {item.label}
                            </a>
                        ))}
                    </div>
                </aside>

                {/* Main content */}
                <motion.main
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex-1 min-w-0 space-y-10"
                >
                    {/* Hero */}
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Privacy Policy</h1>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">Effective date: March 10, 2026 · Last updated: March 10, 2026</p>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl border border-border bg-surface-2/50 text-sm text-muted-foreground">
                            This Privacy Policy explains how <strong className="text-foreground">Node</strong> ("we", "us", or "our") collects, uses, and protects your personal information when you use our productivity application. By using Node, you agree to the practices described in this policy.
                        </div>
                    </div>

                    <Section id="overview" title="Overview">
                        <p>
                            Node is a personal productivity application that helps you manage tasks, goals, and academic coursework. We are committed to transparency about the data we handle and to protecting your privacy.
                        </p>
                        <p>
                            We do <strong className="text-foreground">not</strong> sell your personal data. We do <strong className="text-foreground">not</strong> use your data for advertising. Every piece of information we collect exists solely to provide and improve the Node service to you.
                        </p>
                    </Section>

                    <Section id="who" title="Who We Are">
                        <p>
                            Node is an independent productivity tool operated by Jatin Patel. For any privacy-related enquiries, please use the in-app feedback feature. The application is accessible at <a href="https://trynode.in" className="text-primary underline underline-offset-2">trynode.in</a>.
                        </p>
                    </Section>

                    <Section id="data-collected" title="Data We Collect">
                        <p>We collect the following categories of personal data:</p>
                        <div className="space-y-3 mt-2">
                            {[
                                { cat: 'Account Data', desc: 'Your name, email address, and profile photo obtained from Google when you sign in via Google OAuth.' },
                                { cat: 'User Content', desc: 'Tasks, goals, workspace names, and any notes or descriptions you create inside the app. This content is yours and is stored securely.' },
                                { cat: 'Feedback', desc: 'If you voluntarily submit feedback through our in-app feedback form, we collect the content of your message and (optionally) your email.' },
                                { cat: 'Google Classroom Data', desc: 'If you connect Google Classroom, we access your course list and coursework items solely to display and sync them as tasks in Node. We do not read submissions, grades, or student rosters beyond what is required for task display.' },
                                { cat: 'Technical Data', desc: 'Browser type, approximate timezone (for due-date calculations), and standard server logs. We do not install tracking cookies or use advertising trackers.' },
                            ].map(({ cat, desc }) => (
                                <div key={cat} className="rounded-lg border border-border bg-surface-2/40 p-3">
                                    <p className="text-xs font-semibold text-foreground mb-1">{cat}</p>
                                    <p>{desc}</p>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section id="google" title="Google APIs & Classroom">
                        <p>
                            Node's use of information received from Google APIs adheres to the{' '}
                            <a
                                href="https://developers.google.com/terms/api-services-user-data-policy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary inline-flex items-center gap-0.5 underline underline-offset-2"
                            >
                                Google API Services User Data Policy
                                <ExternalLink className="w-3 h-3" />
                            </a>
                            , including the Limited Use requirements.
                        </p>
                        <p>Specifically:</p>
                        <ul className="list-disc pl-4 space-y-1.5">
                            <li>We only request the OAuth scopes strictly necessary to display your courses and coursework.</li>
                            <li>We do <strong className="text-foreground">not</strong> use Google data for serving advertisements.</li>
                            <li>We do <strong className="text-foreground">not</strong> allow humans to read your Google data unless required for security or legal purposes, with your explicit consent, or when aggregated and anonymised beyond individual identification.</li>
                            <li>We do not transfer your Google data to third parties.</li>
                            <li>You can disconnect Google Classroom at any time from Settings within the app, which will revoke our access token.</li>
                        </ul>
                    </Section>

                    <Section id="how-we-use" title="How We Use Your Data">
                        <ul className="list-disc pl-4 space-y-1.5">
                            <li>To authenticate you and maintain your session securely via Supabase Auth.</li>
                            <li>To store and synchronise your tasks, goals, and workspaces across your devices.</li>
                            <li>To display Google Classroom coursework as tasks inside Node.</li>
                            <li>To improve the app based on anonymised, aggregated usage patterns and voluntary feedback.</li>
                            <li>To communicate service-critical updates (e.g., changes to these policies).</li>
                        </ul>
                        <p>We never use your data for profiling, advertising, or sale to third parties.</p>
                    </Section>

                    <Section id="sharing" title="Data Sharing & Disclosure">
                        <p>We share data only in the following limited circumstances:</p>
                        <ul className="list-disc pl-4 space-y-1.5">
                            <li><strong className="text-foreground">Supabase</strong> — our backend-as-a-service provider, used for authentication and database. Data is stored in Supabase's EU region. Supabase's privacy policy applies to data at rest.</li>
                            <li><strong className="text-foreground">Vercel</strong> — our hosting provider. Vercel processes standard HTTP request logs.</li>
                            <li><strong className="text-foreground">Google</strong> — OAuth and Classroom API interactions are governed by Google's Privacy Policy.</li>
                            <li><strong className="text-foreground">Legal requirements</strong> — we may disclose data if required by law, regulation, or a valid court order.</li>
                        </ul>
                        <p>We do not share your data with any other third parties.</p>
                    </Section>

                    <Section id="retention" title="Data Retention">
                        <p>
                            We retain your account data and user content for as long as your account is active. If you wish to delete your account and all associated data, please contact us via the in-app feedback form and we will process your request within 30 days.
                        </p>
                        <p>
                            Anonymised, aggregated analytics data may be retained indefinitely as it cannot be linked back to any individual.
                        </p>
                    </Section>

                    <Section id="security" title="Security">
                        <p>
                            Your data is protected by industry-standard security practices:
                        </p>
                        <ul className="list-disc pl-4 space-y-1.5">
                            <li>All data in transit is encrypted using TLS/HTTPS.</li>
                            <li>Authentication is handled by Supabase Auth with secure session tokens.</li>
                            <li>We use Row Level Security (RLS) policies in Supabase so users can only access their own data.</li>
                            <li>Admin access to feedback data is gated behind verified account email checks.</li>
                        </ul>
                        <p>
                            While we take all reasonable precautions, no system is 100% secure. Please notify us immediately if you suspect any unauthorised access to your account.
                        </p>
                    </Section>

                    <Section id="children" title="Children's Privacy">
                        <p>
                            Node is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.
                        </p>
                        <p>
                            Users aged 13–17 should use the app only with parental or guardian consent.
                        </p>
                    </Section>

                    <Section id="rights" title="Your Rights">
                        <p>
                            Depending on your jurisdiction, you may have the following rights regarding your personal data:
                        </p>
                        <ul className="list-disc pl-4 space-y-1.5">
                            <li><strong className="text-foreground">Access</strong> — request a copy of the data we hold about you.</li>
                            <li><strong className="text-foreground">Correction</strong> — request correction of inaccurate data.</li>
                            <li><strong className="text-foreground">Deletion</strong> — request deletion of your account and personal data.</li>
                            <li><strong className="text-foreground">Portability</strong> — request your data in a machine-readable format.</li>
                            <li><strong className="text-foreground">Restriction</strong> — request that we limit processing of your data in certain circumstances.</li>
                            <li><strong className="text-foreground">Objection</strong> — object to processing based on legitimate interests.</li>
                        </ul>
                        <p>To exercise any of these rights, submit a request via the in-app feedback form.</p>
                    </Section>

                    <Section id="changes" title="Changes to This Policy">
                        <p>
                            We may update this Privacy Policy from time to time. When we make material changes, we will update the "Last updated" date at the top of this page. Continued use of the Service after changes constitutes your acceptance of the revised policy.
                        </p>
                    </Section>

                    <Section id="contact" title="Contact">
                        <p>
                            If you have questions or concerns about this Privacy Policy or our data practices, please reach out via the in-app Feedback button. We aim to respond within 5 business days.
                        </p>
                    </Section>

                    <footer className="pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-muted-foreground font-mono">
                        <p>© 2026 Node. All rights reserved.</p>
                        <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service →</Link>
                    </footer>
                </motion.main>
            </div>
        </div>
    );
};

export default Privacy;
