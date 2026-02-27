 import { get, set, del, keys, createStore } from 'idb-keyval';
 import { useCallback } from 'react';
 import type { Flashcard, Category, AppSettings } from '@/types/flashcard';
 
 // Create separate stores for different data types
 const flashcardsStore = createStore('flashcards-db', 'flashcards');
 const categoriesStore = createStore('flashcards-db', 'categories');
 const imagesStore = createStore('flashcards-db', 'images');
 const settingsStore = createStore('flashcards-db', 'settings');
 
 const STORAGE_KEYS = {
   ALL_CARDS: 'all_cards',
   ALL_CATEGORIES: 'all_categories',
   SETTINGS: 'app_settings',
 };
 
 const DEFAULT_CATEGORIES: Category[] = [
  { id: 'animals', name: 'Animals', icon: '🐾', color: 'coral', order: 0, createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
  { id: 'colors', name: 'Colors', icon: '🎨', color: 'sky', order: 1, createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
  { id: 'numbers', name: 'Numbers', icon: '🔢', color: 'mint', order: 2, createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
  { id: 'food', name: 'Food', icon: '🍎', color: 'sunshine', order: 3, createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
  { id: 'shapes', name: 'Shapes', icon: '⭐', color: 'lavender', order: 4, createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
  { id: 'nature', name: 'Nature', icon: '🌸', color: 'peach', order: 5, createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
 ];
 
const DEFAULT_CARDS: Flashcard[] = [];
 
 const DEFAULT_SETTINGS: AppSettings = {
   autoPlayAudio: true,
   voiceSpeed: 'normal',
   repeatAudio: false,
  theme: 'sunshine',
   enableCloudSync: false,
 };
 
 export function useOfflineStorage() {
   // Cards operations
   const getAllCards = useCallback(async (): Promise<Flashcard[]> => {
     try {
       const cards = await get<Flashcard[]>(STORAGE_KEYS.ALL_CARDS, flashcardsStore);
       if (!cards) {
         // Initialize with defaults
         await set(STORAGE_KEYS.ALL_CARDS, DEFAULT_CARDS, flashcardsStore);
         return DEFAULT_CARDS;
       }
       return cards;
     } catch (error) {
       console.error('Failed to get cards from IndexedDB:', error);
       return DEFAULT_CARDS;
     }
   }, []);
 
   const saveAllCards = useCallback(async (cards: Flashcard[]): Promise<void> => {
     try {
       await set(STORAGE_KEYS.ALL_CARDS, cards, flashcardsStore);
     } catch (error) {
       console.error('Failed to save cards to IndexedDB:', error);
     }
   }, []);
 
   const saveCard = useCallback(async (card: Flashcard): Promise<void> => {
     const cards = await getAllCards();
     const index = cards.findIndex(c => c.id === card.id);
     if (index >= 0) {
       cards[index] = card;
     } else {
       cards.push(card);
     }
     await saveAllCards(cards);
   }, [getAllCards, saveAllCards]);
 
   const deleteCard = useCallback(async (cardId: string): Promise<void> => {
     const cards = await getAllCards();
     const filtered = cards.filter(c => c.id !== cardId);
     await saveAllCards(filtered);
     // Also delete associated image if stored locally
     try {
       await del(cardId, imagesStore);
     } catch (error) {
       // Image may not exist locally
     }
   }, [getAllCards, saveAllCards]);
 
   // Categories operations
   const getAllCategories = useCallback(async (): Promise<Category[]> => {
     try {
       const categories = await get<Category[]>(STORAGE_KEYS.ALL_CATEGORIES, categoriesStore);
       if (!categories) {
         await set(STORAGE_KEYS.ALL_CATEGORIES, DEFAULT_CATEGORIES, categoriesStore);
         return DEFAULT_CATEGORIES;
       }
       return categories;
     } catch (error) {
       console.error('Failed to get categories from IndexedDB:', error);
       return DEFAULT_CATEGORIES;
     }
   }, []);
 
   const saveAllCategories = useCallback(async (categories: Category[]): Promise<void> => {
     try {
       await set(STORAGE_KEYS.ALL_CATEGORIES, categories, categoriesStore);
     } catch (error) {
       console.error('Failed to save categories to IndexedDB:', error);
     }
   }, []);
 
   const saveCategory = useCallback(async (category: Category): Promise<void> => {
     const categories = await getAllCategories();
     const index = categories.findIndex(c => c.id === category.id);
     if (index >= 0) {
       categories[index] = category;
     } else {
       categories.push(category);
     }
     await saveAllCategories(categories);
   }, [getAllCategories, saveAllCategories]);
 
   const deleteCategory = useCallback(async (categoryId: string): Promise<void> => {
     const categories = await getAllCategories();
     const filtered = categories.filter(c => c.id !== categoryId);
     await saveAllCategories(filtered);
   }, [getAllCategories, saveAllCategories]);
 
   // Settings operations
   const getSettings = useCallback(async (): Promise<AppSettings> => {
     try {
       const settings = await get<AppSettings>(STORAGE_KEYS.SETTINGS, settingsStore);
       if (!settings) {
         await set(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS, settingsStore);
         return DEFAULT_SETTINGS;
       }
      return { ...DEFAULT_SETTINGS, ...settings };
     } catch (error) {
       console.error('Failed to get settings from IndexedDB:', error);
       return DEFAULT_SETTINGS;
     }
   }, []);
 
   const saveSettings = useCallback(async (settings: AppSettings): Promise<void> => {
     try {
       await set(STORAGE_KEYS.SETTINGS, settings, settingsStore);
     } catch (error) {
       console.error('Failed to save settings to IndexedDB:', error);
     }
   }, []);
 
   // Image operations (store base64 locally)
   const saveImage = useCallback(async (cardId: string, imageData: string): Promise<void> => {
     try {
       await set(cardId, imageData, imagesStore);
     } catch (error) {
       console.error('Failed to save image to IndexedDB:', error);
     }
   }, []);
 
   const getImage = useCallback(async (cardId: string): Promise<string | undefined> => {
     try {
       return await get<string>(cardId, imagesStore);
     } catch (error) {
       console.error('Failed to get image from IndexedDB:', error);
       return undefined;
     }
   }, []);
 
   const deleteImage = useCallback(async (cardId: string): Promise<void> => {
     try {
       await del(cardId, imagesStore);
     } catch (error) {
       console.error('Failed to delete image from IndexedDB:', error);
     }
   }, []);
 
   // Get all pending items for sync
   const getPendingCards = useCallback(async (): Promise<Flashcard[]> => {
     const cards = await getAllCards();
     return cards.filter(c => c.syncStatus === 'pending');
   }, [getAllCards]);
 
   const getPendingCategories = useCallback(async (): Promise<Category[]> => {
     const categories = await getAllCategories();
     return categories.filter(c => c.syncStatus === 'pending');
   }, [getAllCategories]);
 
   // Reset to defaults
   const resetToDefaults = useCallback(async (): Promise<void> => {
     await saveAllCards(DEFAULT_CARDS);
     await saveAllCategories(DEFAULT_CATEGORIES);
     await saveSettings(DEFAULT_SETTINGS);
   }, [saveAllCards, saveAllCategories, saveSettings]);
 
   return {
     // Cards
     getAllCards,
     saveAllCards,
     saveCard,
     deleteCard,
     getPendingCards,
     // Categories
     getAllCategories,
     saveAllCategories,
     saveCategory,
     deleteCategory,
     getPendingCategories,
     // Settings
     getSettings,
     saveSettings,
     // Images
     saveImage,
     getImage,
     deleteImage,
     // Utils
     resetToDefaults,
     DEFAULT_CARDS,
     DEFAULT_CATEGORIES,
     DEFAULT_SETTINGS,
   };
 }