import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Trash2, Loader2, Pencil, ChevronLeft, Square, CheckSquare, Share2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { TableOfContents } from './TableOfContents';

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
  const [mode, setMode] = useState<'view' | 'edit'>('edit');

  useEffect(() => {
    if (isOpen) {
      setContent(initialContent);
      setMode('edit');
    }
  }, [isOpen, initialContent]);

  const handleSave = () => {
    onSave(content);
  };

  const toggleCheckbox = (lineText: string, isChecked: boolean) => {
    const safeText = lineText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const targetState = isChecked ? '[ ]' : '[x]';
    const currentState = isChecked ? '\\[x\\]' : '\\[ \\]';
    const regex = new RegExp(`(^|\\n)(\\s*)(-|\\*|\\d+\\.)\\s+${currentState}\\s+${safeText}\\s*($|\\n)`);

    const newContent = content.replace(regex, (match) => {
      return match.replace(isChecked ? '[x]' : '[ ]', targetState);
    });

    if (newContent !== content) {
      setContent(newContent);
      onSave(newContent);
    }
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
                {mode === 'edit' ? (
                  <button
                    onClick={() => setMode('view')}
                    disabled={isSaving}
                    className="p-2 rounded-full hover:bg-white/5 text-white/60 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <ChevronLeft size={24} />
                    <span className="text-sm font-medium">Отмена</span>
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {mode === 'view' ? (
                  <>
                    {onShare && (
                      <button
                        onClick={onShare}
                        className="p-2.5 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors"
                      >
                        <Share2 size={20} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={onDelete}
                        className="p-2.5 rounded-full hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                    <button
                      onClick={() => setMode('edit')}
                      className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium text-sm transition-all flex items-center gap-2"
                    >
                      <Pencil size={16} />
                      Правка
                    </button>
                  </>
                ) : (
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
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar relative">
              {mode === 'view' ? (
                <div className="p-6 pb-32 animate-in fade-in duration-300">
                  <TableOfContents content={content} />
                  <div className="prose prose-invert prose-lg max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 mb-6 mt-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-xl font-semibold text-neon mb-4 mt-8 flex items-center gap-2">
                          <span className="w-1.5 h-6 rounded-full bg-neon inline-block"></span>
                          {children}
                        </h2>,
                        h3: ({ children }) => <h3 className="text-lg font-medium text-neon/80 mb-3 mt-6">{children}</h3>,
                        ul: ({ children }) => <ul className="space-y-2 my-4 pl-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 space-y-3 my-4 marker:text-neon marker:font-medium">{children}</ol>,
                        li: ({ children }) => {
                          const childArray = React.Children.toArray(children);
                          let text = "";
                          if (childArray.length > 0 && typeof childArray[0] === 'string') {
                            text = childArray[0] as string;
                          }
                          const isUnchecked = text.startsWith('[ ] ');
                          const isChecked = text.startsWith('[x] ');
                          if (isUnchecked || isChecked) {
                            const cleanText = text.slice(4);
                            return (
                              <li className="flex items-start gap-3 group cursor-pointer select-none" onClick={() => toggleCheckbox(cleanText, isChecked)}>
                                <div className={`shrink-0 mt-1 transition-all duration-300 ${isChecked ? 'text-neon' : 'text-white/20 group-hover:text-white/40'}`}>
                                  {isChecked ? <CheckSquare size={20} className="fill-neon/10" /> : <Square size={20} />}
                                </div>
                                <span className={`leading-relaxed text-lg transition-all duration-300 ${isChecked ? 'text-white/40 line-through decoration-white/20' : 'text-white/90'}`}>
                                  {cleanText}
                                  {childArray.slice(1)}
                                </span>
                              </li>
                            );
                          }
                          return (
                            <li className="text-white/80 leading-relaxed pl-2 relative">
                              <span className="absolute left-[-1rem] top-[0.6rem] w-1.5 h-1.5 rounded-full bg-white/20"></span>
                              {children}
                            </li>
                          );
                        },
                        blockquote: ({ children }) => <blockquote className="border-l-4 border-neon/50 pl-4 italic text-white/60 my-6 py-2 bg-white/5 rounded-r-xl">{children}</blockquote>,
                        p: ({ children }) => <p className="mb-4 leading-relaxed text-white/90 text-lg">{children}</p>,
                        strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
                        a: ({ href, children }) => <a href={href} className="text-neon underline underline-offset-4 decoration-neon/50 hover:decoration-neon transition-all">{children}</a>,
                        hr: () => <hr className="border-white/10 my-8" />
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <textarea
                  className="w-full h-full p-6 pb-32 resize-none outline-none text-lg leading-relaxed bg-transparent text-white/90 font-sans placeholder:text-white/20 animate-in fade-in duration-300"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Начните печатать..."
                  autoFocus
                  disabled={isSaving}
                />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};