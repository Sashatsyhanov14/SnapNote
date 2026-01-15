import React from 'react';
import { motion } from 'framer-motion';
import { List } from 'lucide-react';

interface Heading {
    level: number;
    text: string;
    id: string;
}

interface TableOfContentsProps {
    content: string;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ content }) => {
    const headings: Heading[] = [];

    // Parse markdown headings
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        const match = line.match(/^(#{1,3})\s+(.+)$/);
        if (match) {
            const level = match[1].length;
            const text = match[2].trim();
            const id = `heading-${index}`;
            headings.push({ level, text, id });
        }
    });

    if (headings.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-white/5 border border-white/10 rounded-2xl"
        >
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-white/60 uppercase tracking-wide">
                <List size={16} />
                Оглавление
            </div>
            <nav className="space-y-2">
                {headings.map((heading, index) => (
                    <div
                        key={index}
                        className={`text-sm transition-colors hover:text-neon cursor-pointer ${heading.level === 1 ? 'text-white/90 font-semibold' :
                                heading.level === 2 ? 'text-white/70 pl-4' :
                                    'text-white/50 pl-8'
                            }`}
                    >
                        {heading.text}
                    </div>
                ))}
            </nav>
        </motion.div>
    );
};
