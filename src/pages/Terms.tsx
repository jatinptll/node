import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Terms = () => {
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
                        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
                    </div>
                </div>

                <div className="prose prose-invert max-w-none text-muted-foreground space-y-6">
                    <p className="text-sm">Last updated: March 10, 2026</p>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
                        <p>
                            By automatically signing in via Google and accessing or using the Node application ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
                        <p>
                            Node is a productivity management tool designed to help users organize tasks, goals, and integrate with platforms like Google Classroom. The Service may be updated or modified from time to time at our sole discretion.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">3. User Accounts & Google Integration</h2>
                        <p>
                            To use the Service, you must sign in using a Google account. You are responsible for maintaining the confidentiality of your Google account credentials and for all activities that occur under your account. Node integrates with Google Classroom; by enabling this integration, you grant Node permission to access and synchronize data from your Google Classroom account as described in our Privacy Policy.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">4. User Content</h2>
                        <p>
                            You retain all rights to any content, tasks, or information you submit, post, or display on or through the Service ("User Content"). By submitting User Content, you grant Node a worldwide, non-exclusive, royalty-free license to use, reproduce, and process the User Content solely for the purpose of providing the Service to you.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">5. Acceptable Use</h2>
                        <p>You agree not to use the Service to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Violate any applicable national, regional, or international laws or regulations.</li>
                            <li>Infringe upon the rights of others, including intellectual property rights.</li>
                            <li>Attempt to gain unauthorized access to any part of the Service or related systems.</li>
                            <li>Transmit any viruses, malware, or other malicious code.</li>
                            <li>Interfere with or disrupt the integrity or performance of the Service.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">6. Termination</h2>
                        <p>
                            We reserve the right to suspend or terminate your access to the Service at any time, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">7. Disclaimer of Warranties</h2>
                        <p>
                            The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We disclaim all warranties of any kind, whether express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">8. Limitation of Liability</h2>
                        <p>
                            In no event shall Node, its developers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-foreground">9. Changes to Terms</h2>
                        <p>
                            We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect.
                        </p>
                    </section>
                </div>

                <div className="pt-8 border-t border-border flex justify-between items-center text-sm text-muted-foreground font-mono">
                    <p>© 2026 Node App.</p>
                    <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                </div>
            </motion.div>
        </div>
    );
};

export default Terms;
