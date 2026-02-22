import { useAuthStore } from '@/store/authStore';
import { Diamond, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';

const LoginPage = () => {
    const { signInWithGoogle, isLoading, user } = useAuthStore();

    if (user) return <Navigate to="/" replace />;

    const handleGoogleSignIn = async () => {
        try {
            await signInWithGoogle();
        } catch (err) {
            console.error('Sign in failed:', err);
        }
    };

    return (
        <div className="min-h-screen bg-background relative flex items-center justify-center p-4 overflow-hidden">
            {/* Theme Toggle */}
            <div className="absolute top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            {/* Background effects (Live Glassmorphism Gradients) */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
                <motion.div
                    animate={{
                        x: [0, 150, -100, 0],
                        y: [0, -150, 100, 0],
                        scale: [1, 1.2, 0.9, 1],
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-[10%] left-[20%] w-[35rem] h-[35rem] bg-purple-600/20 dark:bg-purple-600/10 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{
                        x: [0, -180, 120, 0],
                        y: [0, 120, -180, 0],
                        scale: [1, 0.8, 1.3, 1],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute bottom-[10%] right-[10%] w-[30rem] h-[30rem] bg-blue-600/20 dark:bg-blue-600/10 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{
                        x: [0, 200, -200, 0],
                        y: [0, 100, -100, 0],
                        scale: [1, 1.4, 0.8, 1],
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-[40%] left-[40%] w-[40rem] h-[40rem] bg-indigo-500/15 dark:bg-indigo-500/10 rounded-full blur-[150px]"
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="relative z-10 w-full max-w-md"
            >
                {/* Card with Glassmorphism */}
                <div className="bg-background/40 dark:bg-background/60 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden">
                    {/* Inner highlight for glass effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 dark:from-white/5 dark:to-white/0 pointer-events-none" />

                    <div className="relative z-10">
                        {/* Logo & Title */}
                        <div className="text-center mb-8">
                            <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 mb-4 glow-purple"
                            >
                                <Diamond className="w-8 h-8 text-white" />
                            </motion.div>
                            <h1 className="text-2xl font-bold text-foreground font-mono">Node</h1>
                            <p className="text-muted-foreground text-sm mt-2">
                                Task management that flows with you
                            </p>
                        </div>

                        {/* Features */}
                        <div className="space-y-3 mb-8">
                            {[
                                { emoji: '📋', text: 'Organize tasks with lists, kanban & calendar views' },
                                { emoji: '🎓', text: 'Auto-sync assignments from Google Classroom' },
                                { emoji: '⚡', text: 'Priority matrix & timeline for productivity' },
                            ].map((feature, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.1 }}
                                    className="flex items-center gap-3 text-sm text-muted-foreground"
                                >
                                    <span className="text-lg">{feature.emoji}</span>
                                    <span>{feature.text}</span>
                                </motion.div>
                            ))}
                        </div>

                        {/* Sign in button */}
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            onClick={handleGoogleSignIn}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl
              bg-white text-gray-800 font-medium text-sm
              hover:bg-gray-50 active:bg-gray-100
              transition-all duration-200
              shadow-lg hover:shadow-xl
              disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                            )}
                            <span>{isLoading ? 'Signing in...' : 'Continue with Google'}</span>
                        </motion.button>

                        <p className="text-center text-[11px] text-muted-foreground mt-4">
                            Sign in to sync your data across devices &amp; connect Google Classroom
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-[11px] text-muted-foreground mt-6">
                    By signing in, you agree to our terms of service
                </p>
            </motion.div>
        </div>
    );
};

export default LoginPage;
