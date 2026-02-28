 import { get, set, del, keys, createStore } from 'idb-keyval';
 import { useCallback } from 'react';
 import type { Flashcard, Category, AppSettings } from '@/types/flashcard';

 const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

 const isUuid = (value: string) => UUID_REGEX.test(value);

 const generateClientId = (prefix: 'card' | 'cat') => {
   if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
     return crypto.randomUUID();
   }

   return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
 };

 const createDefaultCategories = (): Category[] => {
   const now = Date.now();
   const templates: Array<Pick<Category, 'name' | 'icon' | 'color'>> = [
     { name: 'Animals', icon: '🐾', color: 'coral' },
     { name: 'Colors', icon: '🎨', color: 'sky' },
     { name: 'Numbers', icon: '🔢', color: 'mint' },
     { name: 'Food', icon: '🍎', color: 'sunshine' },
     { name: 'Shapes', icon: '⭐', color: 'lavender' },
     { name: 'Nature', icon: '🌸', color: 'peach' },
   ];

   return templates.map((item, index) => ({
     id: generateClientId('cat'),
     name: item.name,
     icon: item.icon,
     color: item.color,
     order: index,
     createdAt: now + index,
     updatedAt: now + index,
     syncStatus: 'pending',
   }));
 };
 
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

let hasUnseenMigration = false;
 
 const DEFAULT_CATEGORIES: Category[] = createDefaultCategories();
 
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

       const hasLegacyCategoryIds = categories.some((category) => !isUuid(category.id));
       if (!hasLegacyCategoryIds) {
         return categories;
       }

       const now = Date.now();
       const categoryIdMap = new Map<string, string>();
       const migratedCategories = categories.map((category) => {
         if (isUuid(category.id)) {
           return category;
         }

         const migratedId = generateClientId('cat');
         categoryIdMap.set(category.id, migratedId);

         return {
           ...category,
           id: migratedId,
           updatedAt: now,
           syncStatus: 'pending' as const,
         };
       });

       const cards = await getAllCards();
       const hasLegacyCards = cards.some(
         (card) => !isUuid(card.id) || categoryIdMap.has(card.categoryId)
       );

       const migratedCards = hasLegacyCards
         ? cards.map((card) => {
             let didChange = false;
             let nextId = card.id;

             if (!isUuid(card.id)) {
               nextId = generateClientId('card');
               didChange = true;
             }

             const mappedCategoryId = categoryIdMap.get(card.categoryId);
             const nextCategoryId = mappedCategoryId ?? card.categoryId;
             if (nextCategoryId !== card.categoryId) {
               didChange = true;
             }

             if (!didChange) {
               return card;
             }

             return {
               ...card,
               id: nextId,
               categoryId: nextCategoryId,
               updatedAt: now,
               syncStatus: 'pending' as const,
             };
           })
         : cards;

       await Promise.all([
         saveAllCategories(migratedCategories),
         hasLegacyCards ? saveAllCards(migratedCards) : Promise.resolve(),
       ]);

       hasUnseenMigration = true;

       return migratedCategories;
     } catch (error) {
       console.error('Failed to get categories from IndexedDB:', error);
       return DEFAULT_CATEGORIES;
     }
   }, [getAllCards, saveAllCards, saveAllCategories]);
 
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

   const consumeMigrationNotice = useCallback((): boolean => {
     if (!hasUnseenMigration) {
       return false;
     }

     hasUnseenMigration = false;
     return true;
   }, []);
 
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
     consumeMigrationNotice,
     DEFAULT_CARDS,
     DEFAULT_CATEGORIES,
     DEFAULT_SETTINGS,
   };
 }