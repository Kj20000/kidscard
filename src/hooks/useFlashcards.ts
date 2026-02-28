import { useState, useEffect, useCallback, useRef } from 'react';
import type { Flashcard, Category, AppSettings } from '@/types/flashcard';
import { useOfflineStorage } from './useOfflineStorage';
import { useFlashcardSync, ENABLE_CLOUD_SYNC } from './useFlashcardSync';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const generateClientId = (prefix: 'card' | 'cat') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
};

const sortCategories = (items: Category[]) =>
  [...items].sort((a, b) => {
    const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const aCreated = a.createdAt ?? 0;
    const bCreated = b.createdAt ?? 0;
    return aCreated - bCreated;
  });

const isTransientCloudError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('networkerror') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('temporarily unavailable') ||
    normalized.includes('status code: 525') ||
    normalized.includes('http/3 525') ||
    normalized.includes('cors')
  );
};


export function useFlashcards() {
  const storage = useOfflineStorage();
  const sync = useFlashcardSync();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    autoPlayAudio: true,
    voiceSpeed: 'normal',
    repeatAudio: false,
    theme: 'sunshine',
    enableCloudSync: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  const initialized = useRef(false);
  const cloudHydrationInProgress = useRef(false);
  const cloudHydrationBlockedUntil = useRef(0);

  const refreshFromStorage = useCallback(async () => {
    const [loadedCategories, loadedCards, loadedSettings] = await Promise.all([
      storage.getAllCategories(),
      storage.getAllCards(),
      storage.getSettings(),
    ]);

    setCategories(sortCategories(loadedCategories));
    setCards(loadedCards);
    setSettings(loadedSettings);

    if (storage.consumeMigrationNotice()) {
      toast.success('Categories restored', { duration: 250 });
    }
  }, [storage]);

  const hydrateFromCloud = useCallback(async () => {
    if (!ENABLE_CLOUD_SYNC || !sync.syncState.isOnline || cloudHydrationInProgress.current) {
      return;
    }

    if (Date.now() < cloudHydrationBlockedUntil.current) {
      return;
    }

    cloudHydrationInProgress.current = true;

    try {
      const maxAttempts = 2;
      let syncResult = { success: false, error: 'Cloud pull did not start' };

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        syncResult = await sync.pullFromCloud();
        if (syncResult.success) break;

        if (syncResult.error && isTransientCloudError(syncResult.error)) {
          cloudHydrationBlockedUntil.current = Date.now() + 30_000;
          break;
        }

        if (attempt < maxAttempts) {
          await new Promise((resolve) => window.setTimeout(resolve, 250));
        }
      }

      if (syncResult.success) {
        await refreshFromStorage();
        sync.syncToCloud();
      }
    } catch (error) {
      console.error('Cloud hydration failed:', error);
    } finally {
      cloudHydrationInProgress.current = false;
    }
  }, [refreshFromStorage, sync]);

  // Load data from IndexedDB on mount
  useEffect(() => {
    const loadData = async () => {
      if (initialized.current) return;
      initialized.current = true;
      
      try {
        await refreshFromStorage();
      } catch (error) {
        console.error('Failed to load data from IndexedDB:', error);
        // Fall back to defaults
        setCategories(storage.DEFAULT_CATEGORIES);
        setCards(storage.DEFAULT_CARDS);
        setSettings(storage.DEFAULT_SETTINGS);
      } finally {
        setIsLoading(false);
        hydrateFromCloud();
      }
    };

    loadData();
  }, [hydrateFromCloud, refreshFromStorage, storage]);

  // Re-hydrate from cloud immediately after auth is established/refreshed
  useEffect(() => {
    if (!ENABLE_CLOUD_SYNC) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) return;

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        hydrateFromCloud();
      }
    });

    return () => subscription.unsubscribe();
  }, [hydrateFromCloud]);

  const getCardsByCategory = useCallback(
    (categoryId: string) => cards.filter((card) => card.categoryId === categoryId),
    [cards]
  );

  const addCard = useCallback(async (card: Omit<Flashcard, 'id'>) => {
    const now = Date.now();
    const newCard: Flashcard = {
      ...card,
      id: generateClientId('card'),
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
    const maxOrder = categories.reduce((max, cat) => Math.max(max, cat.order ?? -1), -1);
    const newCategory: Category = {
      ...category,
      id: generateClientId('cat'),
      order: maxOrder + 1,
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
    const updatedCategories = sortCategories(categories.map((cat) =>
      cat.id === id
        ? { ...cat, ...updates, updatedAt: Date.now(), syncStatus: 'pending' as const }
        : cat
    ));
    setCategories(updatedCategories);
    
    storage.saveAllCategories(updatedCategories).then(() => {
      sync.updatePendingCount();
      if (ENABLE_CLOUD_SYNC && sync.syncState.isOnline) {
        sync.syncToCloud();
      }
    });
  }, [categories, storage, sync]);

  const deleteCategory = useCallback(async (id: string) => {
    const updatedCategories = sortCategories(categories.filter((cat) => cat.id !== id));
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

  const reorderCategories = useCallback(async (categoryIds: string[]) => {
    const now = Date.now();
    const orderMap = new Map(categoryIds.map((id, index) => [id, index]));
    const updatedCategories = sortCategories(
      categories.map((cat) => {
        const nextOrder = orderMap.get(cat.id);
        if (nextOrder === undefined) return cat;
        return {
          ...cat,
          order: nextOrder,
          updatedAt: now,
          syncStatus: 'pending' as const,
        };
      })
    );

    setCategories(updatedCategories);
    storage.saveAllCategories(updatedCategories).then(() => {
      sync.updatePendingCount();
      if (ENABLE_CLOUD_SYNC && sync.syncState.isOnline) {
        sync.syncToCloud();
      }
    });
  }, [categories, storage, sync]);

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
    reorderCategories,
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
