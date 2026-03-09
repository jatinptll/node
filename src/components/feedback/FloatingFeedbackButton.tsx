import { motion } from 'framer-motion';
import { useUIStore } from '@/store/uiStore';

export const FloatingFeedbackButton = () => {
    const { openFeedbackModal } = useUIStore();

    return (
        <motion.button
            onClick={() => openFeedbackModal()}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.75, y: 0 }}
            whileHover={{ opacity: 1, scale: 1.03, boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)' }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-xs font-semibold shadow-lg cursor-pointer"
            style={{
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                width: '110px',
                height: '36px',
                justifyContent: 'center',
            }}
            title="Send feedback"
        >
            <span className="text-sm">✦</span>
            <span className="font-mono tracking-wide">Feedback</span>
        </motion.button>
    );
};
