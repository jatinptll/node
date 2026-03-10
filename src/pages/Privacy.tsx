import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Privacy = () => {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-3xl space-y-8"
            >
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        to="/"
                        className="p-2 -ml-2 rounded-full hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors"
                        title="Back to home"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold">N</span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
                    </div>
                </div>

                <div className="prose prose-invert max-w-none text-muted-foreground space-y-6">
                    <p className="text-sm">Last updated: March 10, 2026</p>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
                        <p>
                            Welcome to Node. We respect your privacy and are committed to protecting your personal data. This Privacy Policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">2. The Data We Collect About You</h2>
                        <p>Personal data, or personal information, means any information about an individual from which that person can be identified. We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier, provided via Google OAuth.</li>
                            <li><strong>Contact Data</strong> includes email address.</li>
                            <li><strong>Content Data</strong> includes tasks, goals, workspaces, and feedback you create within the application.</li>
                            <li><strong>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access this website.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Personal Data</h2>
                        <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Where we need to perform the contract we are about to enter into or have entered into with you (e.g., providing the productivity tools, syncing with Google Classroom).</li>
                            <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                            <li>Where we need to comply with a legal obligation.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">4. Google Classroom Integration</h2>
                        <p>
                            Node utilizes Google Classroom APIs to sync your academic tasks. We only request the minimum required permissions (scopes) necessary to provide this functionality. We do not use the data obtained from Google Classroom for any purpose other than displaying and managing your tasks within the Node application. We do not sell or share this data with third parties.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">5. Data Security</h2>
                        <p>
                            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know. They will only process your personal data on our instructions and they are subject to a duty of confidentiality.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">6. Data Retention</h2>
                        <p>
                            We will only retain your personal data for as long as reasonably necessary to fulfill the purposes we collected it for, including for the purposes of satisfying any legal, regulatory, tax, accounting or reporting requirements.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">7. Your Legal Rights</h2>
                        <p>
                            Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to request access, correction, erasure, restriction, transfer, to object to processing, to portability of data and (where the lawful ground of processing is consent) to withdraw consent.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">8. Contact Us</h2>
                        <p>
                            If you have any questions about this Privacy Policy or our privacy practices, please submit a feedback ticket through the application.
                        </p>
                    </section>
                </div>

                <div className="pt-8 border-t border-border flex justify-between items-center text-sm text-muted-foreground font-mono">
                    <p>© 2026 Node App.</p>
                    <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
                </div>
            </motion.div>
        </div>
    );
};

export default Privacy;
