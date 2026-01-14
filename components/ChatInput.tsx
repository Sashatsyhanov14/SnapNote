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
    SpeechRecognition: { new (): SpeechRecognition };
    webkitSpeechRecognition: { new (): SpeechRecognition };
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

  const handleMicClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!recognitionRef.current) return;

    if (isListeningRef.current) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        isListeningRef.current = false;
      }
    }
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
        <motion.div 
          layout
          className={`relative flex-1 bg-surface rounded-[20px] transition-all duration-300 ${isListening ? 'bg-red-500/10 ring-1 ring-red-500/30' : ''}`}
        >
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (wasVoice) setWasVoice(false); // Если пользователь начал печатать вручную, это уже не только "голос"
              }}
              placeholder={isListening ? "Говорите..." : "Сообщение"}
              disabled={disabled}
              className="w-full bg-transparent text-white pl-4 pr-4 py-3 text-[16px] placeholder:text-white/30 outline-none max-h-32"
              autoComplete="off"
            />
        </motion.div>
        
        <AnimatePresence mode="wait">
            {isListening ? (
                 <motion.button
                 key="recording-btn"
                 initial={{ scale: 0, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 exit={{ scale: 0, opacity: 0 }}
                 type="button"
                 onClick={handleMicClick}
                 className="w-[48px] h-[48px] rounded-full bg-red-500 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.4)] active:scale-95 transition-transform"
               >
                 <div className="flex gap-[3px] items-center h-4">
                    {[1, 2, 3].map((i) => (
                        <motion.div
                            key={i}
                            animate={{ height: [8, 16, 8] }}
                            transition={{ 
                                repeat: Infinity, 
                                duration: 0.8, 
                                delay: i * 0.1,
                                ease: "easeInOut"
                            }}
                            className="w-1 bg-white rounded-full"
                        />
                    ))}
                 </div>
               </motion.button>
            ) : text.trim().length === 0 ? (
                <motion.button
                    key="mic-idle"
                    initial={{ scale: 0, opacity: 0, rotate: -45 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0, rotate: 45 }}
                    type="button"
                    onClick={handleMicClick}
                    disabled={!isSupported}
                    className="w-[48px] h-[48px] rounded-full bg-surface hover:bg-white/10 flex items-center justify-center shrink-0 text-white/50 hover:text-white transition-colors active:scale-95"
                >
                    <Mic size={24} />
                </motion.button>
            ) : (
                <motion.button
                    key="send-btn"
                    initial={{ scale: 0, opacity: 0, rotate: 45 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0, rotate: -45 }}
                    type="submit"
                    disabled={disabled}
                    className="w-[48px] h-[48px] rounded-full bg-neon flex items-center justify-center shrink-0 text-white shadow-neon active:scale-95 transition-transform"
                >
                    <ArrowUp size={24} />
                </motion.button>
            )}
        </AnimatePresence>

      </form>
    </div>
  );
};