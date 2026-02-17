import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Loader2 } from 'lucide-react';
import { CategoryCard } from '@/components/CategoryCard';
import { CardViewer } from '@/components/CardViewer';
import { SettingsPage } from '@/components/SettingsPage';
import { ParentGate } from '@/components/ParentGate';
import { SyncButton } from '@/components/SyncButton';
import { useFlashcards } from '@/hooks/useFlashcards';
import type { Category } from '@/types/flashcard';

type View = 'home' | 'viewer' | 'settings';

const Index = () => {
  const {
    categories,
    cards,
    settings,
    isLoading,
    getCardsByCategory,
    addCard,
    updateCard,
    deleteCard,
    addCategory,
    updateCategory,
    deleteCategory,
    updateSettings,
    syncState,
    fullSync,
    isCloudSyncEnabled,
  } = useFlashcards();

  const [view, setView] = useState<View>('home');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showParentGate, setShowParentGate] = useState(false);

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setView('viewer');
  };

  const handleCategoryChange = (category: Category) => {
    setSelectedCategory(category);
  };

  const handleSettingsClick = () => {
    setShowParentGate(true);
  };

  const handleParentGateSuccess = () => {
    setShowParentGate(false);
    setView('settings');
  };

  const handleBack = () => {
    setView('home');
    setSelectedCategory(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-lg font-semibold text-muted-foreground">Loading flashcards...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-nunito">
      <AnimatePresence mode="wait">
        {showParentGate && (
          <ParentGate
            onSuccess={handleParentGateSuccess}
            onCancel={() => setShowParentGate(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen p-3 pb-24"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">
                  🎴 Flash Cards
                </h1>
                <p className="text-muted-foreground font-semibold mt-1">
                  Tap a category to start learning!
                </p>
              </div>
              <div className="flex items-center gap-3">
                <SyncButton
                  syncState={syncState}
                  onSync={fullSync}
                  isEnabled={isCloudSyncEnabled}
                />
                <motion.button
                  onClick={handleSettingsClick}
                  className="w-14 h-14 bg-card rounded-2xl card-shadow flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Settings className="w-7 h-7 text-muted-foreground" />
                </motion.button>
              </div>
            </div>

            {/* Category Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
              {categories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <CategoryCard
                    category={category}
                    cardCount={getCardsByCategory(category.id).length}
                    onClick={() => handleCategorySelect(category)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {view === 'viewer' && selectedCategory && (
          <motion.div
            key="viewer"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <CardViewer
              category={selectedCategory}
              cards={getCardsByCategory(selectedCategory.id)}
              settings={settings}
              onBack={handleBack}
              onAddCard={addCard}
              allCategories={categories}
              onCategoryChange={handleCategoryChange}
            />
          </motion.div>
        )}

        {view === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <SettingsPage
              categories={categories}
              cards={cards}
              settings={settings}
              onUpdateSettings={updateSettings}
              onAddCard={addCard}
              onUpdateCard={updateCard}
              onDeleteCard={deleteCard}
              onAddCategory={addCategory}
              onUpdateCategory={updateCategory}
              onDeleteCategory={deleteCategory}
              onBack={handleBack}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
