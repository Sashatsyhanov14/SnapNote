import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2 } from 'lucide-react';

interface EditModalProps {
  isOpen: boolean;
  initialContent: string;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (newContent: string) => void;
  onDelete?: () => void;
  onShare?: () => void;
}

export const EditModal: React.FC<EditModalProps> = ({ isOpen, initialContent, isSaving, onClose, onSave, onDelete, onShare }) => {
  const [content, setContent] = useState(initialContent);

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
    }
  }, [isOpen, initialContent]);

  const handleSave = () => {
    onSave(content);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isSaving ? undefined : onClose}
            className="absolute inset-0 bg-charcoal/95 backdrop-blur-md"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full h-full sm:h-auto sm:max-h-[85vh] sm:rounded-3xl bg-surface border-t sm:border border-white/10 shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-surface/50 backdrop-blur-md z-10 shrink-0 h-[72px]">
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-neon text-white rounded-full font-medium text-sm shadow-neon hover:shadow-neon-strong transition-all flex items-center gap-2 disabled:opacity-80 disabled:cursor-wait"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Магия AI...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Сохранить
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar relative p-0">
              <textarea
                className="w-full h-full p-6 pb-32 resize-none outline-none text-lg leading-relaxed bg-transparent text-white/90 font-sans placeholder:text-white/20 animate-in fade-in duration-300"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Начните печатать..."
                autoFocus
                disabled={isSaving}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};