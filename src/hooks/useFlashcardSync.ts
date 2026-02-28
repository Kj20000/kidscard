import { useState, useEffect, useCallback, useRef } from 'react';
import type { Flashcard, Category, SyncState } from '@/types/flashcard';
import { useOfflineStorage } from './useOfflineStorage';
import { supabase } from '@/integrations/supabase/client';

// Feature flag for cloud sync - now enabled!
export const ENABLE_CLOUD_SYNC = true;
 
 interface SyncResult {
   success: boolean;
   error?: string;
   syncedCards?: number;
   syncedCategories?: number;
 }

const isTransientNetworkError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('networkerror') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('cors') ||
    normalized.includes('http/3 525') ||
    normalized.includes('status code: 525') ||
    normalized.includes('fetch resource')
  );
};

const normalizeSyncErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    if (isTransientNetworkError(error.message)) {
      return 'Cloud sync temporarily unavailable. Changes are saved locally.';
    }
    return error.message;
  }

  return fallback;
};

const normalizeCategoryName = (name: string) => name.trim().toLowerCase();

const pickPreferredCategory = (current: Category, incoming: Category): Category => {
  const currentSyncedScore = current.syncStatus === 'synced' ? 1 : 0;
  const incomingSyncedScore = incoming.syncStatus === 'synced' ? 1 : 0;
  if (incomingSyncedScore !== currentSyncedScore) {
    return incomingSyncedScore > currentSyncedScore ? incoming : current;
  }

  const currentUpdated = current.updatedAt ?? 0;
  const incomingUpdated = incoming.updatedAt ?? 0;
  if (incomingUpdated !== currentUpdated) {
    return incomingUpdated > currentUpdated ? incoming : current;
  }

  return current;
};

const dedupeCategoriesByName = (
  categories: Category[]
): { categories: Category[]; idRemap: Map<string, string> } => {
  const canonicalByKey = new Map<string, Category>();
  const idRemap = new Map<string, string>();

  for (const category of categories) {
    const key = normalizeCategoryName(category.name);
    const existing = canonicalByKey.get(key);

    if (!existing) {
      canonicalByKey.set(key, category);
      continue;
    }

    const preferred = pickPreferredCategory(existing, category);
    const replaced = preferred.id !== existing.id;

    canonicalByKey.set(key, preferred);

    if (replaced) {
      idRemap.set(existing.id, preferred.id);
    }
    idRemap.set(category.id, preferred.id);
  }

  const dedupedCategories = Array.from(canonicalByKey.values());
  return { categories: dedupedCategories, idRemap };
};

const remapCardsCategoryIds = (cards: Flashcard[], idRemap: Map<string, string>): Flashcard[] => {
  if (idRemap.size === 0) {
    return cards;
  }

  return cards.map((card) => {
    const mappedCategoryId = idRemap.get(card.categoryId);
    if (!mappedCategoryId || mappedCategoryId === card.categoryId) {
      return card;
    }

    return {
      ...card,
      categoryId: mappedCategoryId,
      updatedAt: Date.now(),
      syncStatus: card.syncStatus === 'synced' ? 'pending' : (card.syncStatus ?? 'pending'),
    };
  });
};
 
 export function useFlashcardSync() {
   const storage = useOfflineStorage();
   const [syncState, setSyncState] = useState<SyncState>({
     lastSyncedAt: null,
     isSyncing: false,
     isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
     pendingChanges: 0,
   });
   
   const syncInProgress = useRef(false);
 
   // Track online/offline status
   useEffect(() => {
     const handleOnline = () => {
       setSyncState(prev => ({ ...prev, isOnline: true }));
       // Trigger sync when coming back online
       if (ENABLE_CLOUD_SYNC) {
         syncToCloud();
       }
     };
     
     const handleOffline = () => {
       setSyncState(prev => ({ ...prev, isOnline: false }));
     };
 
     window.addEventListener('online', handleOnline);
     window.addEventListener('offline', handleOffline);
 
     return () => {
       window.removeEventListener('online', handleOnline);
       window.removeEventListener('offline', handleOffline);
     };
   }, []);
 
   // Update pending changes count
   const updatePendingCount = useCallback(async () => {
     const pendingCards = await storage.getPendingCards();
     const pendingCategories = await storage.getPendingCategories();
     setSyncState(prev => ({
       ...prev,
       pendingChanges: pendingCards.length + pendingCategories.length,
     }));
   }, [storage]);
 
   // Initial pending count
   useEffect(() => {
     updatePendingCount();
   }, [updatePendingCount]);

  // Merge remote data with local, using last-updated timestamp for conflicts
  const mergeData = useCallback(<T extends { id: string; updatedAt?: number }>(
    localItems: T[],
    remoteItems: T[]
  ): T[] => {
    const merged = new Map<string, T>();

    // Add all local items first
    localItems.forEach(item => merged.set(item.id, item));

    // Merge remote items, preferring newer timestamps
    remoteItems.forEach(remoteItem => {
      const localItem = merged.get(remoteItem.id);
      if (!localItem) {
        // New remote item
        merged.set(remoteItem.id, remoteItem);
      } else {
        // Conflict resolution: prefer the one with later updatedAt
        const localTime = localItem.updatedAt || 0;
        const remoteTime = remoteItem.updatedAt || 0;
        if (remoteTime > localTime) {
          merged.set(remoteItem.id, remoteItem);
        }
      }
    });

    return Array.from(merged.values());
  }, []);

  // Sync local data to cloud (Supabase)
  const syncToCloud = useCallback(async (): Promise<SyncResult> => {
    if (!ENABLE_CLOUD_SYNC) {
      return { success: true, error: 'Cloud sync is disabled' };
    }

    if (!syncState.isOnline) {
      return { success: false, error: 'Device is offline' };
    }

    if (syncInProgress.current) {
      return { success: false, error: 'Sync already in progress' };
    }

    try {
      syncInProgress.current = true;
      setSyncState(prev => ({ ...prev, isSyncing: true }));

      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        setSyncState(prev => ({ ...prev, isSyncing: false }));
        return { success: false, error: 'Please sign in to sync' };
      }

      const pendingCards = await storage.getPendingCards();
      const pendingCategories = await storage.getPendingCategories();

      // Sync categories first (flashcards depend on them)
      if (pendingCategories.length > 0) {
        const categoriesToSync = pendingCategories.map(cat => ({
          id: cat.id,
          user_id: user.id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          updated_at: new Date(cat.updatedAt || Date.now()).toISOString(),
        }));

        const { error: catError } = await supabase
          .from('categories')
          .upsert(categoriesToSync, { onConflict: 'id' });

        if (catError) {
          console.error('Category sync error:', catError);
          throw new Error(`Category sync failed: ${catError.message}`);
        }

        // Mark categories as synced locally
        const allCategories = await storage.getAllCategories();
        const updatedCategories = allCategories.map(cat => ({
          ...cat,
          syncStatus: 'synced' as const,
        }));
        await storage.saveAllCategories(updatedCategories);
      }

      // Sync flashcards
      if (pendingCards.length > 0) {
        const cardsToSync = pendingCards.map(card => ({
          id: card.id,
          user_id: user.id,
          word: card.word,
          image_url: card.imageUrl,
          category_id: card.categoryId,
          updated_at: new Date(card.updatedAt || Date.now()).toISOString(),
        }));

        const { error: cardError } = await supabase
          .from('flashcards')
          .upsert(cardsToSync, { onConflict: 'id' });

        if (cardError) {
          console.error('Flashcard sync error:', cardError);
          throw new Error(`Flashcard sync failed: ${cardError.message}`);
        }

        // Mark cards as synced locally
        const allCards = await storage.getAllCards();
        const updatedCards = allCards.map(card => ({
          ...card,
          syncStatus: 'synced' as const,
        }));
        await storage.saveAllCards(updatedCards);
      }

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncedAt: Date.now(),
        pendingChanges: 0,
      }));

      return {
        success: true,
        syncedCards: pendingCards.length,
        syncedCategories: pendingCategories.length,
      };
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncState(prev => ({ ...prev, isSyncing: false }));
      return {
        success: false,
        error: normalizeSyncErrorMessage(error, 'Unknown sync error'),
      };
    } finally {
      syncInProgress.current = false;
    }
  }, [syncState.isOnline, storage]);
 
  // Pull remote changes from cloud
  const pullFromCloud = useCallback(async (): Promise<SyncResult> => {
    if (!ENABLE_CLOUD_SYNC) {
      return { success: true, error: 'Cloud sync is disabled' };
    }

    if (!syncState.isOnline) {
      return { success: false, error: 'Device is offline' };
    }

    try {
      setSyncState(prev => ({ ...prev, isSyncing: true }));

      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        setSyncState(prev => ({ ...prev, isSyncing: false }));
        return { success: false, error: 'Please sign in to sync' };
      }

      // Fetch categories from cloud
      const { data: remoteCategories, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id);

      if (catError) {
        throw new Error(`Failed to fetch categories: ${catError.message}`);
      }

      // Fetch flashcards from cloud
      const { data: remoteCards, error: cardError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', user.id);

      if (cardError) {
        throw new Error(`Failed to fetch flashcards: ${cardError.message}`);
      }

      // Convert remote data to local format and merge
      const localCategories = await storage.getAllCategories();
      const localCards = await storage.getAllCards();

      const convertedCategories: Category[] = (remoteCategories || []).map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color as Category['color'],
        createdAt: new Date(cat.created_at).getTime(),
        updatedAt: new Date(cat.updated_at).getTime(),
        syncStatus: 'synced' as const,
      }));

      const convertedCards: Flashcard[] = (remoteCards || []).map(card => ({
        id: card.id,
        word: card.word,
        imageUrl: card.image_url,
        categoryId: card.category_id,
        createdAt: new Date(card.created_at).getTime(),
        updatedAt: new Date(card.updated_at).getTime(),
        syncStatus: 'synced' as const,
      }));

      // Merge with local data (remote wins for conflicts)
      const mergedCategories = mergeData(localCategories, convertedCategories);
      const mergedCards = mergeData(localCards, convertedCards);

      const dedupedCategoriesResult = dedupeCategoriesByName(mergedCategories);
      const dedupedCategories = dedupedCategoriesResult.categories;
      const remappedCards = remapCardsCategoryIds(mergedCards, dedupedCategoriesResult.idRemap);

      await storage.saveAllCategories(dedupedCategories);
      await storage.saveAllCards(remappedCards);

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncedAt: Date.now(),
      }));

      return { 
        success: true,
        syncedCategories: dedupedCategories.length,
        syncedCards: remappedCards.length,
      };
    } catch (error) {
      console.error('Pull failed:', error);
      setSyncState(prev => ({ ...prev, isSyncing: false }));
      return {
        success: false,
        error: normalizeSyncErrorMessage(error, 'Unknown pull error'),
      };
    }
  }, [syncState.isOnline, storage, mergeData]);
 
   // Upload image to cloud storage
   const uploadImage = useCallback(async (cardId: string, imageData: string): Promise<string | null> => {
     if (!ENABLE_CLOUD_SYNC || !syncState.isOnline) {
       // Store locally only
       await storage.saveImage(cardId, imageData);
       return null;
     }
 
     try {
       // TODO: When Supabase Storage is enabled, upload to bucket here
       // For now, just save locally
       await storage.saveImage(cardId, imageData);
       return null; // Would return the public URL after upload
     } catch (error) {
       console.error('Image upload failed:', error);
       // Fallback to local storage
       await storage.saveImage(cardId, imageData);
       return null;
     }
   }, [syncState.isOnline, storage]);
 
   // Full sync (push + pull)
   const fullSync = useCallback(async (): Promise<SyncResult> => {
     const pushResult = await syncToCloud();
     if (!pushResult.success) {
       return pushResult;
     }
 
     const pullResult = await pullFromCloud();
     return pullResult;
   }, [syncToCloud, pullFromCloud]);
 
   return {
     syncState,
     syncToCloud,
     pullFromCloud,
     fullSync,
     uploadImage,
     mergeData,
     updatePendingCount,
     isEnabled: ENABLE_CLOUD_SYNC,
   };
 }