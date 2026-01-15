import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Database, ShieldCheck, X, ChevronRight, Sparkles, Share2, MessageCircle } from 'lucide-react';
import posthog from 'posthog-js';
import { ChatInput } from './components/ChatInput';
import { NoteCard, NoteSkeleton } from './components/NoteCard';
import { EditModal } from './components/EditModal';
import { processNoteWithAI, improveEditedNote, processVoiceTranscript } from './lib/gemini';

if (typeof window !== 'undefined' && process.env.POSTHOG_KEY) {
  posthog.init(process.env.POSTHOG_KEY, {
    api_host: 'https://eu.i.posthog.com',
    person_profiles: 'identified_only',
  });
}

declare global {
  interface Window {
    Telegram: any;
  }
}

interface Note {
  id: string;
  content: string;
  timestamp: number;
  isAI?: boolean;
}

const App = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const processedParam = useRef(false);
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const tg = window.Telegram?.WebApp;

  const track = (event: string, properties?: Record<string, any>) => {
    posthog.capture(event, properties);
  };

  useEffect(() => {
    if (!tg) return;
    const showBack = isSettingsOpen || !!editingNote;
    if (showBack) {
      tg.BackButton.show();
      tg.onEvent('backButtonClicked', handleBack);
    } else {
      tg.BackButton.hide();
      tg.offEvent('backButtonClicked', handleBack);
    }
    return () => tg.offEvent('backButtonClicked', handleBack);
  }, [isSettingsOpen, editingNote]);

  const handleBack = () => {
    setIsSettingsOpen(false);
    setEditingNote(null);
  };

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#1C1C1E');
      tg.setBackgroundColor('#1C1C1E');
    }

    const initApp = async () => {
      let currentNotes: Note[] = [];
      const saved = localStorage.getItem('ai-notes-v3');
      if (saved) {
        try { currentNotes = JSON.parse(saved); } catch (e) { }
      }
      setNotes(currentNotes);
    };
    initApp();
  }, []);

  const saveNotes = (newNotes: Note[]) => {
    setNotes(newNotes);
    localStorage.setItem('ai-notes-v3', JSON.stringify(newNotes));
  };

  const handleSend = async (text: string, isFromVoice: boolean = false) => {
    setIsLoading(true);
    track('note_creation_started', { source: isFromVoice ? 'voice' : 'text' });

    try {
      let workingText = text;
      let aiUsed = false;

      if (isFromVoice) {
        const cleaned = await processVoiceTranscript(text);
        if (cleaned) workingText = cleaned;
      }

      const aiResponse = await processNoteWithAI(workingText);
      let finalContent = workingText;

      if (aiResponse) {
        finalContent = aiResponse;
        aiUsed = true;
      }

      const newNote: Note = {
        id: crypto.randomUUID(),
        content: finalContent,
        timestamp: Date.now(),
        isAI: aiUsed
      };

      saveNotes([newNote, ...notes]);
      tg?.HapticFeedback?.notificationOccurred('success');
    } catch (error) {
      const fallbackNote: Note = { id: crypto.randomUUID(), content: text, timestamp: Date.now(), isAI: false };
      saveNotes([fallbackNote, ...notes]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSave = async (newContent: string) => {
    if (!editingNote) return;
    setIsSavingEdit(true);
    try {
      const polished = await improveEditedNote(newContent);
      const updatedNotes = notes.map(n =>
        n.id === editingNote.id
          ? { ...n, content: polished || newContent, isAI: !!polished }
          : n
      );
      saveNotes(updatedNotes);
      setEditingNote(null);
    } catch (e) {
      setEditingNote(null);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleShareNote = (noteContent: string) => {
    tg?.HapticFeedback?.selectionChanged();
    const botLink = "https://t.me/SnapNoteAI_Bot";
    const text = `${noteContent}\n\nСоздано в SnapNote 🚀`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(botLink)}&text=${encodeURIComponent(text)}`;
    tg?.openTelegramLink(shareUrl);
  };

  return (
    <div className="min-h-full bg-charcoal text-white pb-32 safe-top px-4">
      <header className="sticky top-0 z-30 pt-6 pb-4 bg-charcoal/80 backdrop-blur-md flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">Заметки</h1>
        <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 rounded-full bg-surface/50 border border-white/5 shadow-lg active:scale-95 transition-transform">
          <Settings size={20} className="text-white/80" />
        </button>
      </header>

      <main className="max-w-4xl mx-auto mt-2">
        <div className="bento-grid">
          <AnimatePresence mode="popLayout">
            {isLoading && <NoteSkeleton />}
            {notes.map((note, index) => (
              <NoteCard
                key={note.id}
                index={index}
                {...note}
                onClick={() => setEditingNote(note)}
                onDelete={() => setConfirmation({
                  isOpen: true,
                  message: 'Удалить эту заметку?',
                  onConfirm: () => saveNotes(notes.filter(n => n.id !== note.id))
                })}
                onShare={() => handleShareNote(note.content)}
              />
            ))}
          </AnimatePresence>
        </div>
        {notes.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-white/20">
            <Sparkles size={48} className="mb-4 opacity-50" />
            <p className="text-center">Напишите или надиктуйте что-нибудь,<br />а ИИ превратит это в заметку.</p>
          </div>
        )}
      </main>

      <ChatInput onSend={(text, isVoice) => handleSend(text, isVoice)} disabled={isLoading} />

      <EditModal
        isOpen={!!editingNote}
        isSaving={isSavingEdit}
        initialContent={editingNote?.content || ''}
        onClose={() => setEditingNote(null)}
        onSave={handleEditSave}
      />

      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSettingsOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="relative glass-panel w-full max-w-sm rounded-3xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Настройки</h3>
                <button onClick={() => setIsSettingsOpen(false)}><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Безопасность</div>
                    <div className="text-xs text-white/40">Все данные хранятся локально</div>
                  </div>
                  <ShieldCheck size={20} className="text-emerald-500" />
                </div>
                <button onClick={() => tg?.showAlert("SnapNote v4.0.0\nМодели: Gemma 3 & Gemini 2.5")} className="w-full p-4 bg-white/5 rounded-2xl border border-white/5 text-left flex items-center justify-between">
                  <span className="text-sm font-medium">О приложении</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmation?.isOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmation(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="relative glass-panel rounded-2xl p-6 text-center max-w-xs w-full">
              <p className="mb-6">{confirmation.message}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmation(null)} className="flex-1 py-2 bg-white/5 rounded-xl">Нет</button>
                <button onClick={() => { confirmation.onConfirm(); setConfirmation(null); }} className="flex-1 py-2 bg-red-500 text-white rounded-xl">Да</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
