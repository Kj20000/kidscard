 import { useState, useEffect, useCallback, useRef } from 'react';
 import type { Flashcard, Category, SyncState } from '@/types/flashcard';
 import { useOfflineStorage } from './useOfflineStorage';
 
 // Feature flag for cloud sync - set to false by default
 export const ENABLE_CLOUD_SYNC = false;
 
 interface SyncResult {
   success: boolean;
   error?: string;
   syncedCards?: number;
   syncedCategories?: number;
 }
 
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
 
       const pendingCards = await storage.getPendingCards();
       const pendingCategories = await storage.getPendingCategories();
 
       // TODO: When Supabase is enabled, implement actual sync logic here
       // For now, this is a placeholder that marks items as synced
       
       // Simulate sync by marking pending items as synced
       if (pendingCards.length > 0) {
         const allCards = await storage.getAllCards();
         const updatedCards = allCards.map(card => ({
           ...card,
           syncStatus: 'synced' as const,
         }));
         await storage.saveAllCards(updatedCards);
       }
 
       if (pendingCategories.length > 0) {
         const allCategories = await storage.getAllCategories();
         const updatedCategories = allCategories.map(cat => ({
           ...cat,
           syncStatus: 'synced' as const,
         }));
         await storage.saveAllCategories(updatedCategories);
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
         error: error instanceof Error ? error.message : 'Unknown sync error',
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
 
       // TODO: When Supabase is enabled, implement pull logic here
       // This would:
       // 1. Fetch remote cards/categories updated after lastSyncedAt
       // 2. Merge with local data using timestamp-based conflict resolution
       // 3. Update local storage
 
       setSyncState(prev => ({
         ...prev,
         isSyncing: false,
         lastSyncedAt: Date.now(),
       }));
 
       return { success: true };
     } catch (error) {
       console.error('Pull failed:', error);
       setSyncState(prev => ({ ...prev, isSyncing: false }));
       return {
         success: false,
         error: error instanceof Error ? error.message : 'Unknown pull error',
       };
     }
   }, [syncState.isOnline]);
 
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