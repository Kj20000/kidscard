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
 
 const DEFAULT_CARDS: Flashcard[] = [
   // Animals
   { id: 'a1', word: 'Cat', imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop', categoryId: 'animals', createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
   { id: 'a2', word: 'Dog', imageUrl: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop', categoryId: 'animals', createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
   { id: 'a3', word: 'Bird', imageUrl: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=400&h=400&fit=crop', categoryId: 'animals', createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
   { id: 'a4', word: 'Fish', imageUrl: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=400&h=400&fit=crop', categoryId: 'animals', createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
   { id: 'a5', word: 'Elephant', imageUrl: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=400&h=400&fit=crop', categoryId: 'animals', createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
   // Colors
   { id: 'c1', word: 'Red', imageUrl: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&h=400&fit=crop&color=ff0000', categoryId: 'colors', createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
   { id: 'c2', word: 'Blue', imageUrl: 'https://images.unsplash.com/photo-1558470598-a5dda9640f68?w=400&h=400&fit=crop', categoryId: 'colors', createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
   { id: 'c3', word: 'Yellow', imageUrl: 'https://images.unsplash.com/photo-1495542779398-9fec7dc7986c?w=400&h=400&fit=crop', categoryId: 'colors', createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
   { id: 'c4', word: 'Green', imageUrl: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?w=400&h=400&fit=crop', categoryId: 'colors', createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
   // Numbers
   { id: 'n1', word: 'One', imageUrl: 'https://images.unsplash.com/photo-1586282391129-76a6df230234?w=400&h=400&fit=crop', categoryId: 'numbers', createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
   { id: 'n2', word: 'Two', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop', categoryId: 'numbers', createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
   { id: 'n3', word: 'Three', imageUrl: 'https://images.unsplash.com/photo-1546552768-9e3a94b38a59?w=400&h=400&fit=crop', categoryId: 'numbers', createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
   // Food
   { id: 'f1', word: 'Apple', imageUrl: 'https://images.unsplash.com/photo-1568702846914-96b305d2uj69?w=400&h=400&fit=crop', categoryId: 'food', createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
   { id: 'f2', word: 'Banana', imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop', categoryId: 'food', createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
   { id: 'f3', word: 'Orange', imageUrl: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=400&h=400&fit=crop', categoryId: 'food', createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
   // Shapes
   { id: 's1', word: 'Circle', imageUrl: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=400&h=400&fit=crop', categoryId: 'shapes', createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
   { id: 's2', word: 'Star', imageUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=400&fit=crop', categoryId: 'shapes', createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
   // Nature
   { id: 'na1', word: 'Flower', imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400&h=400&fit=crop', categoryId: 'nature', createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
   { id: 'na2', word: 'Tree', imageUrl: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400&h=400&fit=crop', categoryId: 'nature', createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
   { id: 'na3', word: 'Sun', imageUrl: 'https://images.unsplash.com/photo-1495107334309-fcf20504a5ab?w=400&h=400&fit=crop', categoryId: 'nature', createdAt: Date.now(), updatedAt: Date.now(), syncStatus: 'synced' },
 ];
 
 const DEFAULT_SETTINGS: AppSettings = {
   autoPlayAudio: true,
   voiceSpeed: 'normal',
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