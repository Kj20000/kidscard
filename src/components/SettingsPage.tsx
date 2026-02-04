import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Edit3, Check, X, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import type { Category, Flashcard, AppSettings } from '@/types/flashcard';

interface SettingsPageProps {
  categories: Category[];
  cards: Flashcard[];
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  onAddCard: (card: Omit<Flashcard, 'id'>) => void;
  onUpdateCard: (id: string, updates: Partial<Omit<Flashcard, 'id'>>) => void;
  onDeleteCard: (id: string) => void;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (id: string, updates: Partial<Omit<Category, 'id'>>) => void;
  onDeleteCategory: (id: string) => void;
  onBack: () => void;
}

type Tab = 'cards' | 'categories' | 'settings';

const colorOptions: Category['color'][] = ['coral', 'mint', 'sky', 'lavender', 'sunshine', 'peach'];
const emojiOptions = ['🐾', '🎨', '🔢', '🍎', '⭐', '🌸', '🎵', '🚗', '🏠', '📚', '🎮', '⚽'];

export function SettingsPage({
  categories,
  cards,
  settings,
  onUpdateSettings,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onBack,
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('cards');
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // New card form state
  const [newCardWord, setNewCardWord] = useState('');
  const [newCardImage, setNewCardImage] = useState('');
  const [newCardCategory, setNewCardCategory] = useState(categories[0]?.id || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New category form state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState(emojiOptions[0]);
  const [newCategoryColor, setNewCategoryColor] = useState<Category['color']>('coral');

  const handleAddCard = () => {
    if (newCardWord.trim() && newCardImage.trim() && newCardCategory) {
      onAddCard({
        word: newCardWord.trim(),
        imageUrl: newCardImage.trim(),
        categoryId: newCardCategory,
      });
      setNewCardWord('');
      setNewCardImage('');
      setIsAddingCard(false);
    }
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory({
        name: newCategoryName.trim(),
        icon: newCategoryIcon,
        color: newCategoryColor,
      });
      setNewCategoryName('');
      setNewCategoryIcon(emojiOptions[0]);
      setNewCategoryColor('coral');
      setIsAddingCategory(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCardImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCardCountForCategory = (categoryId: string) =>
    cards.filter((c) => c.categoryId === categoryId).length;

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <motion.button
          onClick={onBack}
          className="w-12 h-12 bg-card rounded-2xl card-shadow flex items-center justify-center"
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-6 h-6" />
        </motion.button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-muted p-1 rounded-2xl">
        {(['cards', 'categories', 'settings'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
              activeTab === tab
                ? 'bg-card card-shadow text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Cards Tab */}
      {activeTab === 'cards' && (
        <div className="space-y-4">
          <Button
            onClick={() => setIsAddingCard(true)}
            className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-semibold text-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Card
          </Button>

          {isAddingCard && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl p-4 card-shadow space-y-4"
            >
              <Input
                placeholder="Word (e.g., Cat)"
                value={newCardWord}
                onChange={(e) => setNewCardWord(e.target.value)}
                className="h-12 rounded-xl text-lg"
              />

              <div className="flex gap-2">
                <Input
                  placeholder="Image URL"
                  value={newCardImage}
                  onChange={(e) => setNewCardImage(e.target.value)}
                  className="h-12 rounded-xl flex-1"
                />
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-12 px-4 rounded-xl"
                >
                  <Upload className="w-5 h-5" />
                </Button>
              </div>

              {newCardImage && (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-muted">
                  <img src={newCardImage} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}

              <select
                value={newCardCategory}
                onChange={(e) => setNewCardCategory(e.target.value)}
                className="w-full h-12 rounded-xl border border-input bg-background px-4 text-lg"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <Button
                  onClick={handleAddCard}
                  className="flex-1 h-12 bg-secondary text-secondary-foreground rounded-xl font-semibold"
                >
                  <Check className="w-5 h-5 mr-2" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsAddingCard(false)}
                  className="h-12 px-6 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Card List */}
          <div className="space-y-2">
            {cards.map((card) => {
              const category = categories.find((c) => c.id === card.categoryId);
              return (
                <Card key={card.id} className="p-3 rounded-2xl flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                    <img src={card.imageUrl} alt={card.word} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-lg truncate">{card.word}</p>
                    <p className="text-sm text-muted-foreground">
                      {category?.icon} {category?.name}
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteCard(card.id)}
                    className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center"
                  >
                    <Trash2 className="w-5 h-5 text-destructive" />
                  </button>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <Button
            onClick={() => setIsAddingCategory(true)}
            className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-semibold text-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Category
          </Button>

          {isAddingCategory && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl p-4 card-shadow space-y-4"
            >
              <Input
                placeholder="Category Name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="h-12 rounded-xl text-lg"
              />

              <div>
                <Label className="text-sm font-semibold mb-2 block">Icon</Label>
                <div className="flex flex-wrap gap-2">
                  {emojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setNewCategoryIcon(emoji)}
                      className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                        newCategoryIcon === emoji
                          ? 'bg-primary ring-2 ring-primary ring-offset-2'
                          : 'bg-muted'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold mb-2 block">Color</Label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewCategoryColor(color)}
                      className={`w-12 h-12 rounded-xl bg-${color} transition-all ${
                        newCategoryColor === color
                          ? 'ring-2 ring-foreground ring-offset-2'
                          : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleAddCategory}
                  className="flex-1 h-12 bg-secondary text-secondary-foreground rounded-xl font-semibold"
                >
                  <Check className="w-5 h-5 mr-2" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsAddingCategory(false)}
                  className="h-12 px-6 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Category List */}
          <div className="space-y-2">
            {categories.map((category) => (
              <Card key={category.id} className="p-3 rounded-2xl flex items-center gap-3">
                <div
                  className={`w-14 h-14 rounded-xl bg-${category.color} flex items-center justify-center text-2xl`}
                >
                  {category.icon}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg">{category.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {getCardCountForCategory(category.id)} cards
                  </p>
                </div>
                <button
                  onClick={() => onDeleteCategory(category.id)}
                  className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center"
                >
                  <Trash2 className="w-5 h-5 text-destructive" />
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <Card className="p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">Auto-Play Audio</p>
                <p className="text-sm text-muted-foreground">
                  Speak word when card appears
                </p>
              </div>
              <Switch
                checked={settings.autoPlayAudio}
                onCheckedChange={(checked) => onUpdateSettings({ autoPlayAudio: checked })}
              />
            </div>
          </Card>

          <Card className="p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">Voice Speed</p>
                <p className="text-sm text-muted-foreground">
                  {settings.voiceSpeed === 'slow' ? 'Slower for learning' : 'Normal pace'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdateSettings({ voiceSpeed: 'slow' })}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                    settings.voiceSpeed === 'slow'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  Slow
                </button>
                <button
                  onClick={() => onUpdateSettings({ voiceSpeed: 'normal' })}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                    settings.voiceSpeed === 'normal'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  Normal
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
