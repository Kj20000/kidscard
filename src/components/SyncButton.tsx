import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import type { SyncState } from '@/types/flashcard';

interface SyncButtonProps {
  syncState: SyncState;
  onSync: () => Promise<{ success: boolean; error?: string }>;
  isEnabled: boolean;
}

export function SyncButton({ syncState, onSync, isEnabled }: SyncButtonProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);

  const handleSync = async () => {
    if (syncState.isSyncing || !syncState.isOnline) return;
    
    const result = await onSync();
    
    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } else {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
    }
  };

  const getStatusIcon = () => {
    if (!syncState.isOnline) {
      return <CloudOff className="w-5 h-5 text-muted-foreground" />;
    }
    if (syncState.isSyncing) {
      return <RefreshCw className="w-5 h-5 text-primary animate-spin" />;
    }
    if (showSuccess) {
      return <Check className="w-5 h-5 text-secondary-foreground" />;
    }
    if (showError) {
      return <AlertCircle className="w-5 h-5 text-destructive" />;
    }
    return <Cloud className="w-5 h-5 text-primary" />;
  };

  const getStatusText = () => {
    if (!syncState.isOnline) return 'Offline';
    if (syncState.isSyncing) return 'Syncing...';
    if (showSuccess) return 'Synced!';
    if (showError) return 'Sync failed';
    if (syncState.pendingChanges > 0) {
      return `${syncState.pendingChanges} pending`;
    }
    if (syncState.lastSyncedAt) {
      const ago = Math.round((Date.now() - syncState.lastSyncedAt) / 60000);
      if (ago < 1) return 'Just synced';
      if (ago < 60) return `${ago}m ago`;
      return `${Math.round(ago / 60)}h ago`;
    }
    return '';
  };

  const buttonBg = () => {
    if (!syncState.isOnline) return 'bg-muted';
    if (showSuccess) return 'bg-secondary';
    if (showError) return 'bg-destructive/10';
    if (syncState.pendingChanges > 0) return 'bg-primary/20';
    return 'bg-card';
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <motion.button
      onClick={handleSync}
      disabled={syncState.isSyncing || !syncState.isOnline}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl card-shadow transition-colors ${buttonBg()} disabled:opacity-70`}
      whileHover={{ scale: syncState.isOnline && !syncState.isSyncing ? 1.02 : 1 }}
      whileTap={{ scale: syncState.isOnline && !syncState.isSyncing ? 0.98 : 1 }}
    >
      {(() => {
        const statusText = getStatusText();

        return (
          <>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${syncState.isSyncing}-${showSuccess}-${showError}-${syncState.isOnline}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.15 }}
        >
          {getStatusIcon()}
        </motion.div>
      </AnimatePresence>
      {statusText && (
        <span className="text-sm font-semibold text-foreground">
          {statusText}
        </span>
      )}
      
      {syncState.pendingChanges > 0 && !syncState.isSyncing && syncState.isOnline && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-2 h-2 rounded-full bg-primary"
        />
      )}
          </>
        );
      })()}
    </motion.button>
  );
}
