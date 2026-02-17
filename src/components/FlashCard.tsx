import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import type { Flashcard } from '@/types/flashcard';

interface FlashCardProps {
  card: Flashcard;
  onSpeak: () => void;
}

export function FlashCard({ card, onSpeak }: FlashCardProps) {
  // Generate a gradient background based on card properties
  const gradients = [
    'from-purple-400 via-pink-400 to-blue-400',
    'from-pink-300 via-yellow-300 to-orange-300',
    'from-blue-400 via-cyan-400 to-teal-400',
    'from-green-400 via-emerald-400 to-teal-400',
    'from-orange-400 via-red-400 to-pink-400',
    'from-indigo-400 via-purple-400 to-pink-400',
  ];
  
  // Use card id to pick a consistent gradient
  const gradientIndex = card.id.charCodeAt(0) % gradients.length;
  const bgGradient = gradients[gradientIndex];

  return (
    <motion.div
      className="relative w-full max-w-md mx-auto aspect-[3/4] cursor-pointer"
      onClick={onSpeak}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="relative h-full w-full bg-card rounded-3xl card-shadow overflow-hidden flex flex-col">
        {/* Image Section */}
        <div className={`flex-1 relative overflow-hidden bg-gradient-to-br ${bgGradient} flex items-center justify-center`}>
          <img
            src={card.imageUrl}
            alt={card.word}
            className="w-full h-full object-contain"
            loading="eager"
          />
          
          {/* Sound indicator */}
          <motion.div
            className="absolute top-4 right-4 w-14 h-14 bg-card/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Volume2 className="w-7 h-7 text-accent" />
          </motion.div>
        </div>

        {/* Word Section */}
        <div className="py-8 px-6 bg-gradient-to-t from-primary/20 to-transparent">
          <h2 className="text-4xl md:text-5xl font-extrabold text-center text-foreground">
            {card.word}
          </h2>
        </div>
      </div>

      {/* Tap hint */}
      <p className="text-center mt-4 text-muted-foreground font-semibold text-lg">
        👆 Tap to hear!
      </p>
    </motion.div>
  );
}
