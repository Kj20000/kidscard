import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { FlashCard } from '@/components/FlashCard';
import { useSpeech } from '@/hooks/useSpeech';
import type { Flashcard, Category, AppSettings } from '@/types/flashcard';

interface CardViewerProps {
  category: Category;
  cards: Flashcard[];
  settings: AppSettings;
  onBack: () => void;
}

export function CardViewer({ category, cards, settings, onBack }: CardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { speak } = useSpeech({ speed: settings.voiceSpeed });

  const currentCard = cards[currentIndex];

  const speakWord = useCallback(() => {
    if (currentCard) {
      speak(currentCard.word);
    }
  }, [currentCard, speak]);

  // Auto-play on card change
  useEffect(() => {
    if (settings.autoPlayAudio && currentCard) {
      const timer = setTimeout(() => {
        speak(currentCard.word);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, currentCard, settings.autoPlayAudio, speak]);

  const goNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <span className="text-6xl mb-4 block">{category.icon}</span>
          <h2 className="text-2xl font-bold mb-2">No Cards Yet!</h2>
          <p className="text-muted-foreground mb-6">Add some cards in the settings.</p>
          <motion.button
            onClick={onBack}
            className="bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-bold text-lg"
            whileTap={{ scale: 0.95 }}
          >
            Go Back
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <motion.button
          onClick={onBack}
          className="w-14 h-14 bg-card rounded-2xl card-shadow flex items-center justify-center"
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-7 h-7" />
        </motion.button>

        <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-2xl card-shadow">
          <span className="text-2xl">{category.icon}</span>
          <span className="font-bold text-lg">{category.name}</span>
        </div>

        <div className="w-14 h-14" /> {/* Spacer for centering */}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-4">
        {cards.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentIndex ? 'bg-primary w-6' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <FlashCard key={currentCard.id} card={currentCard} onSpeak={speakWord} />
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex justify-center gap-4 mt-6 pb-4">
        <motion.button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className={`w-16 h-16 rounded-full flex items-center justify-center card-shadow transition-all ${
            currentIndex === 0
              ? 'bg-muted text-muted-foreground'
              : 'bg-card text-foreground'
          }`}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronLeft className="w-8 h-8" />
        </motion.button>

        <motion.button
          onClick={goNext}
          disabled={currentIndex === cards.length - 1}
          className={`w-16 h-16 rounded-full flex items-center justify-center card-shadow transition-all ${
            currentIndex === cards.length - 1
              ? 'bg-muted text-muted-foreground'
              : 'bg-card text-foreground'
          }`}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronRight className="w-8 h-8" />
        </motion.button>
      </div>
    </div>
  );
}
