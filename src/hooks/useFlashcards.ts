import { useState, useEffect, useCallback, useRef } from 'react';
import type { Flashcard, Category, AppSettings } from '@/types/flashcard';
import { useOfflineStorage } from './useOfflineStorage';
import { useFlashcardSync, ENABLE_CLOUD_SYNC } from './useFlashcardSync';
import { toast } from 'sonner';


export function useFlashcards() {
  const storage = useOfflineStorage();
  const sync = useFlashcardSync();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    autoPlayAudio: true,
    voiceSpeed: 'normal',
    enableCloudSync: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const initialized = useRef(false);

  // Helper function to reload data from storage
  const reloadDataFromStorage = useCallback(async () => {
    try {
      const [updatedCategories, updatedCards] = await Promise.all([
        storage.getAllCategories(),
        storage.getAllCards(),
      ]);
      setCategories(updatedCategories);
      setCards(updatedCards);
      console.log('✅ Data reloaded from storage');
    } catch (error) {
      console.error('Failed to reload data:', error);
    }
  }, [storage]);

  // Load data from IndexedDB and sync with cloud on mount
  useEffect(() => {
    const loadData = async () => {
      if (initialized.current) return;
      initialized.current = true;
      
      try {
        // First load local data for instant display
        const [loadedCategories, loadedCards, loadedSettings] = await Promise.all([
          storage.getAllCategories(),
          storage.getAllCards(),
          storage.getSettings(),
        ]);
        
        setCategories(loadedCategories);
        setCards(loadedCards);
        setSettings(loadedSettings);
        setIsLoading(false);
        
        // Then pull latest from cloud in background (if online and sync enabled)
        if (ENABLE_CLOUD_SYNC && sync.syncState.isOnline) {
          console.log('🔄 Pulling latest data from cloud...');
          const result = await sync.pullFromCloud(reloadDataFromStorage);
          if (result.success) {
            console.log('✅ Cloud data synced successfully');
          }
        }
      } catch (error) {
        console.error('Failed to load data from IndexedDB:', error);
        // Fall back to defaults
        setCategories(storage.DEFAULT_CATEGORIES);
        setCards(storage.DEFAULT_CARDS);
        setSettings(storage.DEFAULT_SETTINGS);
        setIsLoading(false);
      }
    };

    loadData();
  }, [storage, sync, reloadDataFromStorage]);

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
    
    // Save to IndexedDB and automatically sync to cloud
    storage.saveAllCards(updatedCards).then(async () => {
      sync.updatePendingCount();
      // Automatically sync to cloud if enabled and online
      if (ENABLE_CLOUD_SYNC && sync.syncState.isOnline) {
        console.log('🔄 Auto-syncing new card to cloud...');
        const result = await sync.syncToCloud();
        if (result.success) {
          console.log('✅ Card synced to cloud');
          toast.success('Card saved!', { duration: 500 });
        }
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
    
    // Save to IndexedDB and automatically sync to cloud
    storage.saveAllCards(updatedCards).then(async () => {
      sync.updatePendingCount();
      // Automatically sync to cloud if enabled and online
      if (ENABLE_CLOUD_SYNC && sync.syncState.isOnline) {
        console.log('🔄 Auto-syncing card update to cloud...');
        const result = await sync.syncToCloud();
        if (result.success) {
          console.log('✅ Card update synced to cloud');
          toast.success('Card updated!', { duration: 500 });
        }
      }
    });
  }, [cards, storage, sync]);

  const deleteCard = useCallback(async (id: string) => {
    const updatedCards = cards.filter((card) => card.id !== id);
    setCards(updatedCards);
    
    // Delete from IndexedDB and sync deletion to cloud
    storage.deleteCard(id).then(async () => {
      sync.updatePendingCount();
      // Automatically sync deletion to cloud if enabled and online
      if (ENABLE_CLOUD_SYNC && sync.syncState.isOnline) {
        console.log('🔄 Auto-syncing card deletion to cloud...');
        // Delete from Supabase
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('flashcards').delete().eq('id', id).eq('user_id', user.id);
          console.log('✅ Card deletion synced to cloud');
          toast.success('Card deleted!', { duration: 500 });
        }
      }
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
    
    // Save to IndexedDB and automatically sync to cloud
    storage.saveAllCategories(updatedCategories).then(async () => {
      sync.updatePendingCount();
      // Automatically sync to cloud if enabled and online
      if (ENABLE_CLOUD_SYNC && sync.syncState.isOnline) {
        console.log('🔄 Auto-syncing new category to cloud...');
        const result = await sync.syncToCloud();
        if (result.success) {
          console.log('✅ Category synced to cloud');
          toast.success('Category saved!', { duration: 500 });
        }
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
    
    // Save to IndexedDB and automatically sync to cloud
    storage.saveAllCategories(updatedCategories).then(async () => {
      sync.updatePendingCount();
      // Automatically sync to cloud if enabled and online
      if (ENABLE_CLOUD_SYNC && sync.syncState.isOnline) {
        console.log('🔄 Auto-syncing category update to cloud...');
        const result = await sync.syncToCloud();
        if (result.success) {
          console.log('✅ Category update synced to cloud');
          toast.success('Category updated!', { duration: 500 });
        }
      }
    });
  }, [categories, storage, sync]);

  const deleteCategory = useCallback(async (id: string) => {
    const updatedCategories = categories.filter((cat) => cat.id !== id);
    setCategories(updatedCategories);
    
    // Also delete all cards in this category
    const updatedCards = cards.filter((card) => card.categoryId !== id);
    setCards(updatedCards);
    
    // Save to IndexedDB and sync deletion to cloud
    Promise.all([
      storage.saveAllCategories(updatedCategories),
      storage.saveAllCards(updatedCards),
    ]).then(async () => {
      sync.updatePendingCount();
      // Automatically sync deletion to cloud if enabled and online
      if (ENABLE_CLOUD_SYNC && sync.syncState.isOnline) {
        console.log('🔄 Auto-syncing category deletion to cloud...');
        // Delete from Supabase (cascade will delete associated cards)
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('categories').delete().eq('id', id).eq('user_id', user.id);
          console.log('✅ Category deletion synced to cloud');
          toast.success('Category deleted!', { duration: 500 });
        }
      }
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
