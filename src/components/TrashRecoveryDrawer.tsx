import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  ShieldAlert, 
  X, 
  Check, 
  AlertTriangle, 
  FileText, 
  File as FileIcon, 
  Loader2, 
  Clock, 
  User, 
  Lock
} from 'lucide-react';
import { SharedItem } from '../types';

interface TrashRecoveryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  isAdmin: boolean;
  adminSecret: string;
  onUpdateAdminSecret: (secret: string) => void;
  onItemRestored: (item: SharedItem) => void;
  onItemPurged: (itemId: string) => void;
}

export const TrashRecoveryDrawer: React.FC<TrashRecoveryDrawerProps> = ({
  isOpen,
  onClose,
  targetId,
  isAdmin,
  adminSecret,
  onUpdateAdminSecret,
  onItemRestored,
  onItemPurged,
}) => {
  const [deletedItems, setDeletedItems] = useState<SharedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [purgingId, setPurgingId] = useState<string | null>(null);
  const [adminInput, setAdminInput] = useState(adminSecret);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTrash();
    }
  }, [isOpen, targetId]);

  const fetchTrash = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/trash?targetId=${encodeURIComponent(targetId)}`);
      if (res.ok) {
        const data = await res.json();
        setDeletedItems(data.items || []);
      }
    } catch (err) {
      console.error('Fetch trash error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (item: SharedItem) => {
    setRestoringId(item.id);
    try {
      const res = await fetch(`/api/items/${item.id}/restore`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setDeletedItems((prev) => prev.filter((i) => i.id !== item.id));
        onItemRestored(data.item);
        setFeedbackMsg(`Restored "${item.fileName || 'Item'}" back to live feed!`);
        setTimeout(() => setFeedbackMsg(null), 3000);
      }
    } catch (err) {
      console.error('Restore error:', err);
    } finally {
      setRestoringId(null);
    }
  };

  const handlePurge = async (item: SharedItem) => {
    if (!adminSecret) {
      setFeedbackMsg('Admin Passcode required to purge files permanently.');
      setTimeout(() => setFeedbackMsg(null), 3000);
      return;
    }

    setPurgingId(item.id);
    try {
      const res = await fetch(`/api/items/${item.id}/purge`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminSecret }),
      });

      if (res.ok) {
        setDeletedItems((prev) => prev.filter((i) => i.id !== item.id));
        onItemPurged(item.id);
        setFeedbackMsg(`Permanently purged "${item.fileName || 'Item'}" from storage.`);
        setTimeout(() => setFeedbackMsg(null), 3000);
      } else {
        const d = await res.json().catch(() => ({}));
        setFeedbackMsg(d.error || 'Purge failed. Invalid Admin Passcode.');
        setTimeout(() => setFeedbackMsg(null), 3000);
      }
    } catch (err) {
      console.error('Purge error:', err);
    } finally {
      setPurgingId(null);
    }
  };

  const formatTime = (ts?: number) => {
    if (!ts) return 'Unknown time';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ' on ' +
      new Date(ts).toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col text-slate-800 dark:text-slate-100 transition-colors">
          
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Trash & Recovery</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Data loss protection: items are soft-deleted and recoverable.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback banner */}
          {feedbackMsg && (
            <div className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/30 text-blue-600 dark:text-blue-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-blue-500 shrink-0" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* Admin Passcode Bar */}
          <div className="px-4 sm:px-6 py-3 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="password"
                value={adminInput}
                onChange={(e) => {
                  setAdminInput(e.target.value);
                  onUpdateAdminSecret(e.target.value);
                }}
                placeholder="Admin Passcode (default: admin123)"
                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Deleted Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
            {isLoading ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                <span className="text-xs">Loading trash items...</span>
              </div>
            ) : deletedItems.length === 0 ? (
              <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <Trash2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Trash is empty</p>
                <p className="text-[11px] text-slate-500 mt-1">No soft-deleted items found for this board.</p>
              </div>
            ) : (
              deletedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/90 space-y-2.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.type === 'file' ? (
                        <FileIcon className="w-4 h-4 text-blue-500 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                      <span className="text-xs font-medium text-slate-900 dark:text-slate-200 truncate">
                        {item.fileName || item.content?.slice(0, 30) || 'Text snippet'}
                      </span>
                    </div>

                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-medium shrink-0">
                      Soft-Deleted
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>Author: {item.creatorName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Deleted: {formatTime(item.deletedAt)}</span>
                    </div>
                    {item.deletedBy && (
                      <div className="text-[10px] text-slate-400">
                        Deleted by: {item.deletedBy}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleRestore(item)}
                      disabled={restoringId === item.id}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 dark:bg-emerald-600/20 hover:bg-emerald-500/20 dark:hover:bg-emerald-600/30 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
                    >
                      {restoringId === item.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3 h-3" />
                      )}
                      <span>Restore Item</span>
                    </button>

                    <button
                      onClick={() => handlePurge(item)}
                      disabled={purgingId === item.id}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors"
                      title="Permanently remove from disk and database (requires Admin passcode)"
                    >
                      {purgingId === item.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <ShieldAlert className="w-3 h-3" />
                      )}
                      <span>Purge</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Restoring an item immediately pushes it live to all connected LAN users via WebSockets.
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
