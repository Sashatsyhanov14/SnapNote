import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Star } from 'lucide-react';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
    const [feedbackText, setFeedbackText] = useState('');
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;

    const handleSubmit = async () => {
        if (!feedbackText.trim()) {
            tg?.showAlert('Пожалуйста, напишите отзыв');
            return;
        }

        setIsSubmitting(true);



        // User info context
        const user = tg?.initDataUnsafe?.user;
        const username = user
            ? `@${user.username} (${user.first_name}) [ID: ${user.id}]`
            : 'Аноним';

        const stars = rating > 0 ? '⭐'.repeat(rating) : 'Без оценки';

        const message = `
🔔 **Новый отзыв SnapNote!**
👤 **От:** ${username}
🌟 **Оценка:** ${stars}

📝 **Текст:**
${feedbackText}
`;

        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            if (!response.ok) throw new Error('Failed to send feedback');

            // Show success message
            tg?.showAlert('Спасибо за отзыв! 💙\nЯ уже читаю его.');
        } catch (e) {
            console.error('Feedback send error:', e);
            tg?.showAlert('Произошла ошибка, но мы все равно ценим ваш порыв!');
        } finally {
            // Reset and close
            setTimeout(() => {
                setFeedbackText('');
                setRating(0);
                setIsSubmitting(false);
                onClose();
            }, 500);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ y: 20, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 20, opacity: 0, scale: 0.95 }}
                        className="relative glass-panel w-full max-w-md rounded-3xl p-6 shadow-2xl"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                                Ваш отзыв
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Star Rating */}
                        <div className="mb-6">
                            <p className="text-sm text-white/60 mb-3">Оцените приложение</p>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setRating(star)}
                                        onMouseEnter={() => setHoveredRating(star)}
                                        onMouseLeave={() => setHoveredRating(0)}
                                        className="transition-transform hover:scale-110 active:scale-95"
                                    >
                                        <Star
                                            size={32}
                                            className={`transition-colors ${star <= (hoveredRating || rating)
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-white/20'
                                                }`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Feedback Text */}
                        <div className="mb-6">
                            <textarea
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                placeholder="Чего не хватает? Или нашли баг?"
                                className="w-full h-32 p-4 bg-white/5 border border-white/10 rounded-2xl resize-none outline-none text-white placeholder:text-white/30 focus:border-neon/50 transition-colors"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full py-3 bg-neon text-white rounded-full font-semibold shadow-neon hover:shadow-neon-strong transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={18} />
                            {isSubmitting ? 'Отправка...' : 'Отправить'}
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
