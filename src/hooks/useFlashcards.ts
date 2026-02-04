import { useState, useEffect, useCallback } from 'react';
import type { Flashcard, Category, AppSettings } from '@/types/flashcard';

const STORAGE_KEYS = {
  CATEGORIES: 'flashcard_categories',
  CARDS: 'flashcard_cards',
  SETTINGS: 'flashcard_settings',
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'animals', name: 'Animals', icon: '🐾', color: 'coral' },
  { id: 'colors', name: 'Colors', icon: '🎨', color: 'sky' },
  { id: 'numbers', name: 'Numbers', icon: '🔢', color: 'mint' },
  { id: 'food', name: 'Food', icon: '🍎', color: 'sunshine' },
  { id: 'shapes', name: 'Shapes', icon: '⭐', color: 'lavender' },
  { id: 'nature', name: 'Nature', icon: '🌸', color: 'peach' },
];

const DEFAULT_CARDS: Flashcard[] = [
  // Animals
  { id: 'a1', word: 'Cat', imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop', categoryId: 'animals' },
  { id: 'a2', word: 'Dog', imageUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop', categoryId: 'animals' },
  { id: 'a3', word: 'Bird', imageUrl: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=400&h=400&fit=crop', categoryId: 'animals' },
  { id: 'a4', word: 'Fish', imageUrl: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=400&h=400&fit=crop', categoryId: 'animals' },
  { id: 'a5', word: 'Elephant', imageUrl: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=400&h=400&fit=crop', categoryId: 'animals' },
  // Colors
  { id: 'c1', word: 'Red', imageUrl: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&h=400&fit=crop&color=ff0000', categoryId: 'colors' },
  { id: 'c2', word: 'Blue', imageUrl: 'https://images.unsplash.com/photo-1558470598-a5dda9640f68?w=400&h=400&fit=crop', categoryId: 'colors' },
  { id: 'c3', word: 'Yellow', imageUrl: 'https://images.unsplash.com/photo-1495542779398-9fec7dc7986c?w=400&h=400&fit=crop', categoryId: 'colors' },
  { id: 'c4', word: 'Green', imageUrl: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?w=400&h=400&fit=crop', categoryId: 'colors' },
  // Numbers
  { id: 'n1', word: 'One', imageUrl: 'https://images.unsplash.com/photo-1586282391129-76a6df230234?w=400&h=400&fit=crop', categoryId: 'numbers' },
  { id: 'n2', word: 'Two', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop', categoryId: 'numbers' },
  { id: 'n3', word: 'Three', imageUrl: 'https://images.unsplash.com/photo-1546552768-9e3a94b38a59?w=400&h=400&fit=crop', categoryId: 'numbers' },
  // Food
  { id: 'f1', word: 'Apple', imageUrl: 'https://images.unsplash.com/photo-1568702846914-96b305d2uj69?w=400&h=400&fit=crop', categoryId: 'food' },
  { id: 'f2', word: 'Banana', imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop', categoryId: 'food' },
  { id: 'f3', word: 'Orange', imageUrl: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=400&h=400&fit=crop', categoryId: 'food' },
  // Shapes
  { id: 's1', word: 'Circle', imageUrl: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=400&h=400&fit=crop', categoryId: 'shapes' },
  { id: 's2', word: 'Star', imageUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=400&fit=crop', categoryId: 'shapes' },
  // Nature
  { id: 'na1', word: 'Flower', imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&h=400&fit=crop', categoryId: 'nature' },
  { id: 'na2', word: 'Tree', imageUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400&h=400&fit=crop', categoryId: 'nature' },
  { id: 'na3', word: 'Sun', imageUrl: 'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?w=400&h=400&fit=crop', categoryId: 'nature' },
];

const DEFAULT_SETTINGS: AppSettings = {
  autoPlayAudio: true,
  voiceSpeed: 'normal',
};

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function useFlashcards() {
  const [categories, setCategories] = useState<Category[]>(() =>
    loadFromStorage(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES)
  );
  const [cards, setCards] = useState<Flashcard[]>(() =>
    loadFromStorage(STORAGE_KEYS.CARDS, DEFAULT_CARDS)
  );
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadFromStorage(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
  );

  // Persist to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CATEGORIES, categories);
  }, [categories]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CARDS, cards);
  }, [cards]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SETTINGS, settings);
  }, [settings]);

  const getCardsByCategory = useCallback(
    (categoryId: string) => cards.filter((card) => card.categoryId === categoryId),
    [cards]
  );

  const addCard = useCallback((card: Omit<Flashcard, 'id'>) => {
    const newCard: Flashcard = {
      ...card,
      id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    setCards((prev) => [...prev, newCard]);
    return newCard;
  }, []);

  const updateCard = useCallback((id: string, updates: Partial<Omit<Flashcard, 'id'>>) => {
    setCards((prev) =>
      prev.map((card) => (card.id === id ? { ...card, ...updates } : card))
    );
  }, []);

  const deleteCard = useCallback((id: string) => {
    setCards((prev) => prev.filter((card) => card.id !== id));
  }, []);

  const addCategory = useCallback((category: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...category,
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    setCategories((prev) => [...prev, newCategory]);
    return newCategory;
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<Omit<Category, 'id'>>) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat))
    );
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
    // Also delete all cards in this category
    setCards((prev) => prev.filter((card) => card.categoryId !== id));
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setCategories(DEFAULT_CATEGORIES);
    setCards(DEFAULT_CARDS);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    categories,
    cards,
    settings,
    getCardsByCategory,
    addCard,
    updateCard,
    deleteCard,
    addCategory,
    updateCategory,
    deleteCategory,
    updateSettings,
    resetToDefaults,
  };
}
