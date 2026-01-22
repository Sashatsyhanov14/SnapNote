import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, Mic } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string, isVoice: boolean) => void;
  disabled?: boolean;
}

// Web Speech API Types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
//...

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: { new(): SpeechRecognition };
    webkitSpeechRecognition: { new(): SpeechRecognition };
  }
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [wasVoice, setWasVoice] = useState(false); // Трекаем, использовался ли голос

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      setIsSupported(true);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'ru-RU';

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        setWasVoice(true); // Указываем, что текст пришел из голоса
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setText(prev => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${finalTranscript}` : finalTranscript;
          });
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.error('Speech recognition error:', event.error);
        }
        if (event.error === 'not-allowed') {
          setIsSupported(false);
        }
        isListeningRef.current = false;
        setIsListening(false);
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  // HANDLERS
  const startRecording = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent focus loss or other touch behaviors
    if (!recognitionRef.current || isListeningRef.current) return;

    try {
      recognitionRef.current.start();
      // Visual feedback via Haptics if available
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy');
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopAndSend = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!recognitionRef.current || !isListeningRef.current) return;

    // Small delay to ensure the last bit of speech is processed
    setTimeout(() => {
      recognitionRef.current?.stop();
      // The actual sending happens in the 'onend' or we can trigger it manually if 'onresult' updated 'text'
      // But since 'onend' sets isListening=false, we might need a flag to know "we just finished a hold-to-record session"
      // For simplicity, we'll rely on the existing 'onend' -> 'isListening=false' flow.
      // But we want to SEND automatically.
      // Let's do it:

      // We'll trigger the send logic directly here, but we need the LATEST text.
      // State 'text' might be slightly stale in this closure? No, React state should be fine?
      // Actually, 'text' state inside this callback depends on closure.
      // We prefer 'onend' to handle the "finalization" if possible, or use a Ref for text.
    }, 100);
  };

  // Use a ref to access the latest text in event handlers without dependency issues
  const textRef = useRef(text);
  useEffect(() => { textRef.current = text; }, [text]);

  const handleMicRelease = () => {
    if (!isListeningRef.current) return;
    recognitionRef.current?.stop();

    // Haptic
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');

    // Wait briefly for final transcript to settle
    setTimeout(() => {
      if (textRef.current.trim()) {
        onSend(textRef.current, true);
        setText('');
        setWasVoice(false);
      }
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;

    if (isListeningRef.current) {
      recognitionRef.current?.stop();
    }

    // Передаем флаг wasVoice наверх
    onSend(text, wasVoice);

    setText('');
    setWasVoice(false); // Сбрасываем флаг после отправки
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-3 pb-safe bg-charcoal border-t border-white/5">
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex items-end gap-2">
        <AnimatePresence mode="wait">
          {!isListening ? (
            <motion.div
              key="input-container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative flex-1 bg-surface rounded-[24px] overflow-hidden"
            >
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (wasVoice) setWasVoice(false);
                }}
                placeholder="Сообщение"
                disabled={disabled}
                className="w-full bg-transparent text-white pl-5 pr-4 py-3.5 text-[16px] placeholder:text-white/30 outline-none"
                autoComplete="off"
              />
            </motion.div>
          ) : (
            <motion.div
              key="recording-ui"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex items-center gap-3 px-4 py-3.5 bg-red-500/10 rounded-[24px] border border-red-500/20"
            >
              <div className="flex gap-1 items-center">
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [4, 16, 4], opacity: [0.5, 1, 0.5] }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.5,
                      delay: i * 0.1,
                      ease: "easeInOut"
                    }}
                    className="w-1 bg-red-500 rounded-full"
                  />
                ))}
              </div>
              <span className="text-red-500 font-medium animate-pulse">Говорите...</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {text.trim().length === 0 && !isListening ? (
            <motion.button
              key="mic-btn"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              type="button"

              // Desktop Events
              onMouseDown={startRecording}
              onMouseUp={handleMicRelease}
              onMouseLeave={handleMicRelease}

              // Mobile Events
              onTouchStart={startRecording}
              onTouchEnd={handleMicRelease}
              // onTouchCancel={handleMicRelease} // Optional: Handle swipe away to cancel?

              disabled={!isSupported}
              className="w-[52px] h-[52px] rounded-full bg-surface hover:bg-white/10 active:scale-90 active:bg-red-500/20 flex items-center justify-center shrink-0 text-white/60 hover:text-white transition-all duration-200"
            >
              <Mic size={26} />
            </motion.button>
          ) : (
            <motion.button
              key="send-btn"
              initial={{ scale: 0, rotate: 90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: -90 }}
              type="submit"
              disabled={disabled}
              className="w-[52px] h-[52px] rounded-full bg-neon flex items-center justify-center shrink-0 text-white shadow-neon active:scale-95 transition-transform"
            >
              <ArrowUp size={26} />
            </motion.button>
          )}
        </AnimatePresence>

      </form>
    </div>
  );
};