import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

export const FloatingFeedbackButton = () => {
    const { openFeedbackModal } = useUIStore();

    return (
        <motion.button
            onClick={() => openFeedbackModal()}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.75, y: 0 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            whileHover={{ opacity: 1, scale: 1.03, boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)' }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="z-30 w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-lg cursor-pointer"
            style={{
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            }}
            title="Send feedback"
        >
            <MessageSquare className="w-4 h-4" />
        </motion.button>
    );
};
