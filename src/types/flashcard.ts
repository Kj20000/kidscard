export interface Flashcard {
  id: string;
  word: string;
  imageUrl: string;
  categoryId: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: 'coral' | 'mint' | 'sky' | 'lavender' | 'sunshine' | 'peach';
}

export interface AppSettings {
  autoPlayAudio: boolean;
  voiceSpeed: 'slow' | 'normal';
}
