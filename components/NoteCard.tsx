import React, { useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Trash2, Square, CheckSquare, Share2, Sparkles } from 'lucide-react';

interface NoteCardProps {
  id: string;
  content: string;
  timestamp: number;
  isAI?: boolean;
  onClick: () => void;
  onDelete: () => void;
  onShare: () => void;
  index: number;
}

export const NoteCard: React.FC<NoteCardProps> = ({ content, timestamp, isAI, onClick, onDelete, onShare }) => {
  const dateStr = new Date(timestamp).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  const x = useMotionValue(0);
  const bgOpacityDelete = useTransform(x, [0, -60], [0, 1]);
  const bgOpacityShare = useTransform(x, [0, 60], [0, 1]);
  const isDragging = useRef(false);

  return (
    <div className="relative mb-4 break-inside-avoid w-full">
      <motion.div
        style={{ opacity: bgOpacityDelete }}
        className="absolute inset-0 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-end pr-6 z-0"
      >
        <Trash2 className="text-red-400" size={24} />
      </motion.div>

      <motion.div
        style={{ opacity: bgOpacityShare }}
        className="absolute inset-0 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-start pl-6 z-0"
      >
        <Share2 className="text-blue-400" size={24} />
      </motion.div>

      <motion.div
        layout
        style={{ x }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.5, right: 0.5 }}
        onDragStart={() => { isDragging.current = true; }}
        onDragEnd={(e, { offset }) => {
          setTimeout(() => { isDragging.current = false; }, 100);
          if (offset.x < -80) onDelete();
          if (offset.x > 80) onShare();
        }}
        onClick={() => !isDragging.current && onClick()}
        className="relative z-10 glass-panel rounded-2xl p-5 hover:border-white/20 transition-all cursor-pointer group"
      >
        {isAI && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon/10 border border-neon/20 text-[10px] font-bold text-neon-glow uppercase tracking-wider animate-pulse">
            <Sparkles size={10} />
            AI
          </div>
        )}

        <div className="text-[15px] leading-relaxed text-white/80 font-sans mb-4 overflow-hidden max-h-[180px]">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="text-lg font-bold text-neon mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-bold text-neon/90 mb-2">{children}</h2>,
              ul: ({ children }) => <ul className="space-y-1 my-2">{children}</ul>,
              li: ({ children }) => {
                const text = React.Children.toArray(children).join("");
                const isChecked = text.includes('[x]');
                const isUnchecked = text.includes('[ ]');
                if (isChecked || isUnchecked) {
                  return (
                    <li className="flex items-start gap-2 my-1">
                      <div className="mt-1">{isChecked ? <CheckSquare size={14} className="text-neon" /> : <Square size={14} className="text-white/20" />}</div>
                      <span className={isChecked ? 'text-white/40 line-through' : ''}>{text.replace(/\[x\]|\[ \]/g, '')}</span>
                    </li>
                  );
                }
                return <li className="pl-4 relative before:absolute before:left-0 before:top-[0.6em] before:w-1 before:h-1 before:bg-neon before:rounded-full">{children}</li>;
              },
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <span className="text-[10px] font-medium text-white/20 uppercase">
            {dateStr}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onShare(); }}
            className="p-1 text-white/20 hover:text-white/60 transition-colors"
          >
            <Share2 size={14} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const NoteSkeleton = () => (
  <div className="glass-panel rounded-2xl p-5 mb-4 animate-pulse h-40">
    <div className="w-1/3 h-4 bg-white/5 rounded mb-4" />
    <div className="w-full h-3 bg-white/5 rounded mb-2" />
    <div className="w-5/6 h-3 bg-white/5 rounded mb-2" />
    <div className="w-4/6 h-3 bg-white/5 rounded" />
  </div>
);
