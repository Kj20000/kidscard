import { useState, useEffect, useCallback, useRef } from 'react';
import type { Flashcard, Category, AppSettings } from '@/types/flashcard';
import { useOfflineStorage } from './useOfflineStorage';
import { useFlashcardSync, ENABLE_CLOUD_SYNC } from './useFlashcardSync';


export function useFlashcards() {
  const storage = useOfflineStorage();
  const sync = useFlashcardSync();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    autoPlayAudio: true,
    voiceSpeed: 'normal',
    enableCloudSync: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const initialized = useRef(false);

  // Load data from IndexedDB on mount
  useEffect(() => {
    const loadData = async () => {
      if (initialized.current) return;
      initialized.current = true;
      
      try {
        const [loadedCategories, loadedCards, loadedSettings] = await Promise.all([
          storage.getAllCategories(),
          storage.getAllCards(),
          storage.getSettings(),
        ]);
        
        setCategories(loadedCategories);
        setCards(loadedCards);
        setSettings(loadedSettings);
      } catch (error) {
        console.error('Failed to load data from IndexedDB:', error);
        // Fall back to defaults
        setCategories(storage.DEFAULT_CATEGORIES);
        setCards(storage.DEFAULT_CARDS);
        setSettings(storage.DEFAULT_SETTINGS);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [storage]);

  const getCardsByCategory = useCallback(
    (categoryId: string) => cards.filter((card) => card.categoryId === categoryId),
    [cards]
  );

  const addCard = useCallback(async (card: Omit<Flashcard, 'id'>) => {
    const now = Date.now();
    const newCard: Flashcard = {
      ...card,
      id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    };
    
    const updatedCards = [...cards, newCard];
    setCards(updatedCards);
    
    // Save to IndexedDB (non-blocking for UI)
    storage.saveAllCards(updatedCards).then(() => {
      sync.updatePendingCount();
      // Trigger background sync if enabled
      if (ENABLE_CLOUD_SYNC && sync.syncState.isOnline) {
        sync.syncToCloud();
      }
    });
    
    return newCard;
  }, [cards, storage, sync]);

  const updateCard = useCallback(async (id: string, updates: Partial<Omit<Flashcard, 'id'>>) => {
    const updatedCards = cards.map((card) =>
      card.id === id
        ? { ...card, ...updates, updatedAt: Date.now(), syncStatus: 'pending' as const }
        : card
    );
    setCards(updatedCards);
    
    // Save to IndexedDB
    storage.saveAllCards(updatedCards).then(() => {
      sync.updatePendingCount();
      if (ENABLE_CLOUD_SYNC && sync.syncState.isOnline) {
        sync.syncToCloud();
      }
    });
  }, [cards, storage, sync]);

  const deleteCard = useCallback(async (id: string) => {
    const updatedCards = cards.filter((card) => card.id !== id);
    setCards(updatedCards);
    
    // Delete from IndexedDB
    storage.deleteCard(id).then(() => {
      sync.updatePendingCount();
    });
  }, [cards, storage, sync]);

  const addCategory = useCallback(async (category: Omit<Category, 'id'>) => {
    const now = Date.now();
    const newCategory: Category = {
      ...category,
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    };
    
    const updatedCategories = [...categories, newCategory];
    setCategories(updatedCategories);
    
    storage.saveAllCategories(updatedCategories).then(() => {
      sync.updatePendingCount();
      if (ENABLE_CLOUD_SYNC && sync.syncState.isOnline) {
        sync.syncToCloud();
      }
    });
    
    return newCategory;
  }, [categories, storage, sync]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Omit<Category, 'id'>>) => {
    const updatedCategories = categories.map((cat) =>
      cat.id === id
        ? { ...cat, ...updates, updatedAt: Date.now(), syncStatus: 'pending' as const }
        : cat
    );
    setCategories(updatedCategories);
    
    storage.saveAllCategories(updatedCategories).then(() => {
      sync.updatePendingCount();
      if (ENABLE_CLOUD_SYNC && sync.syncState.isOnline) {
        sync.syncToCloud();
      }
    });
  }, [categories, storage, sync]);

  const deleteCategory = useCallback(async (id: string) => {
    const updatedCategories = categories.filter((cat) => cat.id !== id);
    setCategories(updatedCategories);
    
    // Also delete all cards in this category
    const updatedCards = cards.filter((card) => card.categoryId !== id);
    setCards(updatedCards);
    
    Promise.all([
      storage.saveAllCategories(updatedCategories),
      storage.saveAllCards(updatedCards),
    ]).then(() => {
      sync.updatePendingCount();
    });
  }, [categories, cards, storage, sync]);

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    storage.saveSettings(newSettings);
  }, [settings, storage]);

  const resetToDefaults = useCallback(async () => {
    setCategories(storage.DEFAULT_CATEGORIES);
    setCards(storage.DEFAULT_CARDS);
    setSettings(storage.DEFAULT_SETTINGS);
    await storage.resetToDefaults();
  }, [storage]);

  // Save local image and optionally sync to cloud
  const saveCardImage = useCallback(async (cardId: string, imageData: string): Promise<string> => {
    // Always save locally first
    await storage.saveImage(cardId, imageData);
    
    // Return local data URL for immediate use
    // If cloud sync is enabled, it will upload in background
    if (ENABLE_CLOUD_SYNC && sync.syncState.isOnline) {
      sync.uploadImage(cardId, imageData);
    }
    
    return imageData;
  }, [storage, sync]);

  // Get image, preferring local cache
  const getCardImage = useCallback(async (cardId: string): Promise<string | undefined> => {
    return storage.getImage(cardId);
  }, [storage]);

  return {
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
    resetToDefaults,
    // Image operations
    saveCardImage,
    getCardImage,
    // Sync state and operations
    syncState: sync.syncState,
    syncToCloud: sync.syncToCloud,
    pullFromCloud: sync.pullFromCloud,
    fullSync: sync.fullSync,
    isCloudSyncEnabled: ENABLE_CLOUD_SYNC,
  };
}
