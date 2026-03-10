import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <section id={id} className="scroll-mt-8">
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-primary/10 text-primary text-[11px] font-mono flex items-center justify-center flex-shrink-0">§</span>
            {title}
        </h2>
        <div className="text-sm text-muted-foreground space-y-3 pl-8">{children}</div>
    </section>
);

const Terms = () => {
    const toc = [
        { id: 'acceptance', label: 'Acceptance of Terms' },
        { id: 'description', label: 'Service Description' },
        { id: 'accounts', label: 'Accounts & Access' },
        { id: 'content', label: 'User Content' },
        { id: 'google', label: 'Google Integration' },
        { id: 'acceptable-use', label: 'Acceptable Use' },
        { id: 'ip', label: 'Intellectual Property' },
        { id: 'availability', label: 'Availability & Changes' },
        { id: 'disclaimers', label: 'Disclaimers' },
        { id: 'liability', label: 'Limitation of Liability' },
        { id: 'indemnification', label: 'Indemnification' },
        { id: 'termination', label: 'Termination' },
        { id: 'governing', label: 'Governing Law' },
        { id: 'changes', label: 'Changes to Terms' },
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
                    <Link to="/privacy" className="text-xs text-muted-foreground hover:text-primary transition-colors font-mono">
                        Privacy Policy →
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
                                <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">Terms of Service</h1>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">Effective date: March 10, 2026 · Last updated: March 10, 2026</p>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl border border-border bg-surface-2/50 text-sm text-muted-foreground">
                            Please read these Terms of Service carefully before using <strong className="text-foreground">Node</strong>. By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part, you may not use the Service.
                        </div>
                    </div>

                    <Section id="acceptance" title="Acceptance of Terms">
                        <p>
                            These Terms of Service ("Terms") govern your access to and use of the Node application ("Service"), operated by Jatin Patel ("we", "us", or "our"). By creating an account or otherwise using the Service, you confirm that you are at least 13 years old and agree to these Terms and our <Link to="/privacy" className="text-primary underline underline-offset-2">Privacy Policy</Link>.
                        </p>
                    </Section>

                    <Section id="description" title="Service Description">
                        <p>
                            Node is a personal productivity application that enables users to organise tasks, set goals, manage workspaces, and optionally integrate with third-party platforms such as Google Classroom. The Service is provided on a best-effort basis and may evolve over time.
                        </p>
                    </Section>

                    <Section id="accounts" title="Accounts & Access">
                        <p>Access to Node requires signing in with a Google account. By doing so:</p>
                        <ul className="list-disc pl-4 space-y-1.5">
                            <li>You authorise us to obtain your Google profile information (name, email, profile photo) to create and manage your Node account.</li>
                            <li>You are responsible for safeguarding your Google credentials and for all activity that occurs through your Node account.</li>
                            <li>You must notify us immediately if you suspect unauthorised access to your account.</li>
                            <li>One person may hold one Node account. Creating multiple accounts to circumvent restrictions is prohibited.</li>
                        </ul>
                    </Section>

                    <Section id="content" title="User Content">
                        <p>
                            "User Content" means any tasks, goals, notes, feedback, or other information you submit to the Service.
                        </p>
                        <ul className="list-disc pl-4 space-y-1.5">
                            <li><strong className="text-foreground">Ownership:</strong> You retain full ownership of your User Content.</li>
                            <li><strong className="text-foreground">Licence to us:</strong> You grant Node a limited, non-exclusive, worldwide, royalty-free licence to store, process, and display your User Content solely to provide and improve the Service for you.</li>
                            <li><strong className="text-foreground">Responsibility:</strong> You are solely responsible for the content you submit. You must not submit content that is unlawful, harmful, defamatory, or infringes third-party rights.</li>
                            <li><strong className="text-foreground">Deletion:</strong> You may delete your content at any time. You can request full account deletion via the in-app feedback form.</li>
                        </ul>
                    </Section>

                    <Section id="google" title="Google Integration">
                        <p>
                            The optional Google Classroom integration requires additional OAuth permissions. By enabling it:
                        </p>
                        <ul className="list-disc pl-4 space-y-1.5">
                            <li>You authorise Node to access your Classroom courses and coursework on your behalf.</li>
                            <li>Our use of this data is limited to displaying and syncing tasks within Node, in compliance with the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Google API Services User Data Policy</a>.</li>
                            <li>You can revoke this access at any time via Google Account settings or the Node Settings panel.</li>
                        </ul>
                        <p>
                            Node is not affiliated with, endorsed by, or sponsored by Google LLC.
                        </p>
                    </Section>

                    <Section id="acceptable-use" title="Acceptable Use">
                        <p>You agree not to use the Service to:</p>
                        <ul className="list-disc pl-4 space-y-1.5">
                            <li>Violate any applicable law or regulation.</li>
                            <li>Infringe the intellectual property or privacy rights of any person.</li>
                            <li>Transmit viruses, malware, or any other harmful code.</li>
                            <li>Attempt to probe, scan, or test the vulnerability of our systems.</li>
                            <li>Access another user's account or data without authorisation.</li>
                            <li>Use automated scraping, bots, or crawlers on the Service.</li>
                            <li>Engage in any conduct that could damage, disable, overburden, or impair the Service.</li>
                        </ul>
                        <p>
                            We reserve the right to investigate suspected violations and to suspend or terminate accounts that breach these rules.
                        </p>
                    </Section>

                    <Section id="ip" title="Intellectual Property">
                        <p>
                            All intellectual property in the Node application—including its design, source code, logos, and text—is owned by or licensed to us. You may not copy, modify, distribute, sell, or lease any part of the Service without our prior written consent.
                        </p>
                        <p>
                            Nothing in these Terms grants you any rights in the Service other than the limited right to use it as described herein.
                        </p>
                    </Section>

                    <Section id="availability" title="Availability & Changes">
                        <p>
                            We provide the Service on an "as available" basis. We may update, modify, suspend, or discontinue any aspect of the Service at any time without prior notice, though we will endeavour to provide reasonable advance notice of material changes.
                        </p>
                        <p>
                            We are not liable for any unavailability, interruption, or degradation of the Service.
                        </p>
                    </Section>

                    <Section id="disclaimers" title="Disclaimers">
                        <p>
                            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                        </p>
                        <p>
                            We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components. You use the Service at your own risk.
                        </p>
                    </Section>

                    <Section id="liability" title="Limitation of Liability">
                        <p>
                            TO THE FULLEST EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                        </p>
                        <p>
                            OUR TOTAL AGGREGATE LIABILITY FOR ANY CLAIMS UNDER THESE TERMS SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS, OR (B) USD $10.
                        </p>
                        <p>
                            Some jurisdictions do not allow the exclusion of certain warranties or limitation of liability, so some of the above limitations may not apply to you.
                        </p>
                    </Section>

                    <Section id="indemnification" title="Indemnification">
                        <p>
                            You agree to indemnify and hold harmless Node and its developers from any claims, damages, losses, liabilities, costs, and expenses (including legal fees) arising from: (a) your use of the Service; (b) your User Content; (c) your violation of these Terms; or (d) your violation of any third-party right.
                        </p>
                    </Section>

                    <Section id="termination" title="Termination">
                        <p>
                            Either party may terminate these Terms at any time. You may stop using the Service and request account deletion. We may suspend or terminate your access if you breach these Terms, with or without notice.
                        </p>
                        <p>
                            Upon termination, your right to use the Service ceases immediately. Provisions that by their nature should survive termination (including ownership, disclaimers, and liability limitations) will survive.
                        </p>
                    </Section>

                    <Section id="governing" title="Governing Law">
                        <p>
                            These Terms are governed by the laws of India, without regard to conflict of law principles. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts located in India.
                        </p>
                    </Section>

                    <Section id="changes" title="Changes to Terms">
                        <p>
                            We may revise these Terms at any time. If changes are material, we will update the effective date at the top of this page and notify you via the application. Continued use of the Service after revised Terms are posted constitutes your acceptance of those changes.
                        </p>
                    </Section>

                    <Section id="contact" title="Contact">
                        <p>
                            For questions about these Terms, please submit a request via the in-app Feedback button. We aim to respond within 5 business days.
                        </p>
                    </Section>

                    <footer className="pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-muted-foreground font-mono">
                        <p>© 2026 Node. All rights reserved.</p>
                        <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy →</Link>
                    </footer>
                </motion.main>
            </div>
        </div>
    );
};

export default Terms;
