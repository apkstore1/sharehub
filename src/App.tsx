import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BoardOrRoom, SharedItem, UserProfile, PresenceState } from './types';
import { 
  getUserProfile, 
  saveUserProfile, 
  getUnlockedRoomPin, 
  saveUnlockedRoomPin, 
  getAdminKey, 
  saveAdminKey, 
  getLastActiveBoard, 
  saveLastActiveBoard 
} from './lib/storage';
import { getSocket, joinBoardRoom, leaveBoardRoom } from './lib/socket';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DropZone } from './components/DropZone';
import { QuickTextInput } from './components/QuickTextInput';
import { ContentFeed } from './components/ContentFeed';
import { CreateBoardOrRoomModal, UnlockRoomModal } from './components/PrivateRoomModal';
import { TrashRecoveryDrawer } from './components/TrashRecoveryDrawer';
import { IdentityModal } from './components/IdentityModal';
import { FilePreviewModal } from './components/FilePreviewModal';
import { 
  Hash, 
  Lock, 
  Info, 
  Sparkles, 
  AlertCircle, 
  RefreshCw, 
  Shield, 
  Bell, 
  FileUp, 
  Layers,
  FileText,
  UploadCloud
} from 'lucide-react';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile>(getUserProfile);
  const [boards, setBoards] = useState<BoardOrRoom[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('board') || getLastActiveBoard();
  });
  const [items, setItems] = useState<SharedItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [presence, setPresence] = useState<PresenceState>({ count: 1, users: [] });

  // Admin and permissions state
  const [adminSecret, setAdminSecret] = useState<string>(getAdminKey);
  const isAdmin = adminSecret.trim().length > 0;

  // Modals state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [createModalType, setCreateModalType] = useState<'public' | 'private' | null>(null);
  const [unlockRoomTarget, setUnlockRoomTarget] = useState<BoardOrRoom | null>(null);
  const [isTrashDrawerOpen, setIsTrashDrawerOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<SharedItem | null>(null);

  // Active sharing tab: 'text' (default) or 'file'
  const [shareTab, setShareTab] = useState<'text' | 'file'>('text');

  // Automatically switch to file tab when dragging files into the window
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      if (e.dataTransfer && e.dataTransfer.types) {
        const types = Array.from(e.dataTransfer.types);
        if (types.includes('Files')) {
          setShareTab('file');
        }
      }
    };
    window.addEventListener('dragover', handleWindowDragOver);
    return () => window.removeEventListener('dragover', handleWindowDragOver);
  }, []);

  // Toast / Status notification
  const [toast, setToast] = useState<{ id: string; msg: string; type: 'info' | 'success' | 'error' } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = useCallback((msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ id: Math.random().toString(), msg, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // Fetch boards list
  const fetchBoards = useCallback(async () => {
    try {
      const res = await fetch('/api/boards');
      if (res.ok) {
        const data = await res.json();
        setBoards(data.boards || []);
      }
    } catch (err) {
      console.error('Fetch boards error:', err);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  // Fetch items for current board
  const fetchItems = useCallback(async (boardId: string) => {
    setIsLoadingItems(true);
    const pin = getUnlockedRoomPin(boardId);
    try {
      const headers: Record<string, string> = {};
      if (pin) headers['x-room-pin'] = pin;

      const res = await fetch(`/api/boards/${encodeURIComponent(boardId)}/items`, { headers });
      if (res.status === 401) {
        // Room is locked, prompt for PIN
        const currentB = boards.find((b) => b.id === boardId);
        if (currentB) {
          setUnlockRoomTarget(currentB);
        }
        setItems([]);
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to fetch board items');
      }

      const data = await res.json();
      setItems(data.items || []);
    } catch (err: any) {
      console.error('Fetch items error:', err);
      showToast(err.message || 'Error loading items', 'error');
    } finally {
      setIsLoadingItems(false);
    }
  }, [boards, showToast]);

  // Handle board switch
  const handleSelectBoard = useCallback((boardId: string) => {
    setActiveBoardId(boardId);
    saveLastActiveBoard(boardId);

    // Update URL query string
    const url = new URL(window.location.href);
    url.searchParams.set('board', boardId);
    window.history.replaceState({}, '', url.toString());

    // Check if target is locked private room
    const targetBoard = boards.find((b) => b.id === boardId);
    if (targetBoard?.type === 'private' && targetBoard.pin && !getUnlockedRoomPin(boardId)) {
      setUnlockRoomTarget(targetBoard);
    }
  }, [boards]);

  // Socket.io setup & room subscription
  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      setIsConnected(true);
      joinBoardRoom(activeBoardId, userProfile);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onItemCreated = (newItem: SharedItem) => {
      if (newItem.targetId === activeBoardId) {
        setItems((prev) => {
          // Guard against duplicate event arrivals
          if (prev.some((item) => item.id === newItem.id)) return prev;
          return [newItem, ...prev];
        });

        if (newItem.creatorId !== userProfile.creatorId) {
          showToast(
            `${newItem.creatorName} shared ${newItem.type === 'file' ? newItem.fileName : 'a snippet'}`,
            'info'
          );
        }
      }

      // Update board count badge
      setBoards((prev) =>
        prev.map((b) =>
          b.id === newItem.targetId ? { ...b, itemCount: (b.itemCount || 0) + 1 } : b
        )
      );
    };

    const onItemDeleted = (data: { id: string; targetId: string; deletedBy?: string }) => {
      if (data.targetId === activeBoardId) {
        setItems((prev) => prev.filter((i) => i.id !== data.id));
      }
      setBoards((prev) =>
        prev.map((b) =>
          b.id === data.targetId ? { ...b, itemCount: Math.max(0, (b.itemCount || 0) - 1) } : b
        )
      );
    };

    const onItemRestored = (restoredItem: SharedItem) => {
      if (restoredItem.targetId === activeBoardId) {
        setItems((prev) => {
          if (prev.some((item) => item.id === restoredItem.id)) return prev;
          return [restoredItem, ...prev];
        });
      }
      setBoards((prev) =>
        prev.map((b) =>
          b.id === restoredItem.targetId ? { ...b, itemCount: (b.itemCount || 0) + 1 } : b
        )
      );
    };

    const onBoardCreated = (newBoard: BoardOrRoom) => {
      setBoards((prev) => {
        if (prev.some((b) => b.id === newBoard.id)) return prev;
        return [...prev, newBoard];
      });
    };

    const onPresenceUpdate = (data: { targetId: string; count: number; users: any[] }) => {
      if (data.targetId === activeBoardId) {
        setPresence({ count: data.count, users: data.users || [] });
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('item:created', onItemCreated);
    socket.on('item:deleted', onItemDeleted);
    socket.on('item:restored', onItemRestored);
    socket.on('board:created', onBoardCreated);
    socket.on('presence_update', onPresenceUpdate);

    if (socket.connected) {
      setIsConnected(true);
      joinBoardRoom(activeBoardId, userProfile);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('item:created', onItemCreated);
      socket.off('item:deleted', onItemDeleted);
      socket.off('item:restored', onItemRestored);
      socket.off('board:created', onBoardCreated);
      socket.off('presence_update', onPresenceUpdate);
      leaveBoardRoom();
    };
  }, [activeBoardId, userProfile, showToast]);

  // Trigger item fetch whenever activeBoardId changes
  useEffect(() => {
    fetchItems(activeBoardId);
  }, [activeBoardId, fetchItems]);

  // Handle identity update
  const handleUpdateIdentity = (updated: Partial<UserProfile>) => {
    const fresh = saveUserProfile(updated);
    setUserProfile(fresh);
    showToast(`Identity updated to "${fresh.displayName}"`, 'success');
  };

  // Handle successful room creation
  const handleCreateBoardSuccess = (newBoard: BoardOrRoom) => {
    setBoards((prev) => [...prev, newBoard]);
    if (newBoard.pin) {
      saveUnlockedRoomPin(newBoard.id, newBoard.pin);
    }
    handleSelectBoard(newBoard.id);
    showToast(`Created ${newBoard.type === 'private' ? 'private room' : 'board'} "${newBoard.name}"`, 'success');
  };

  // Handle PIN unlock
  const handleRoomUnlockSuccess = (pin: string) => {
    if (unlockRoomTarget) {
      saveUnlockedRoomPin(unlockRoomTarget.id, pin);
      fetchItems(unlockRoomTarget.id);
      showToast(`Unlocked ${unlockRoomTarget.name}`, 'success');
    }
  };

  // Handle item deletion with author / admin verification
  const handleDeleteItem = async (item: SharedItem) => {
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorId: userProfile.creatorId,
          adminSecret,
          deletedByName: userProfile.displayName,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to delete item');
      }

      setItems((prev) => prev.filter((i) => i.id !== item.id));
      showToast('Item soft-deleted. Moved to Recovery Trash.', 'info');
    } catch (err: any) {
      console.error('Delete item error:', err);
      showToast(err.message || 'Could not delete item', 'error');
    }
  };

  // Toggle Admin mode
  const handleToggleAdmin = () => {
    if (isAdmin) {
      saveAdminKey('');
      setAdminSecret('');
      showToast('Admin mode deactivated', 'info');
    } else {
      const code = prompt('Enter Admin Passcode (Default: admin123):', 'admin123');
      if (code && code.trim()) {
        saveAdminKey(code.trim());
        setAdminSecret(code.trim());
        showToast('Admin mode activated', 'success');
      }
    }
  };

  const activeBoard = boards.find((b) => b.id === activeBoardId);
  const currentRoomPin = getUnlockedRoomPin(activeBoardId);

  return (
    <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans selection:bg-blue-600/30 transition-colors">
      
      {/* Left Sidebar (Desktop fixed panel + Mobile drawer) */}
      <Sidebar
        boards={boards}
        activeBoardId={activeBoardId}
        onSelectBoard={(id) => {
          handleSelectBoard(id);
          setIsSidebarOpen(false);
        }}
        onOpenNewBoardModal={(type) => {
          setCreateModalType(type);
          setIsSidebarOpen(false);
        }}
        onOpenTrashDrawer={() => {
          setIsTrashDrawerOpen(true);
          setIsSidebarOpen(false);
        }}
        isOpenMobile={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        userProfile={userProfile}
        presence={presence}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header */}
        <Header
          boards={boards}
          activeBoardId={activeBoardId}
          onSelectBoard={handleSelectBoard}
          userProfile={userProfile}
          onOpenIdentityModal={() => setIsIdentityModalOpen(true)}
          onOpenNewBoardModal={(type) => setCreateModalType(type)}
          onOpenTrashDrawer={() => setIsTrashDrawerOpen(true)}
          deletedItemsCount={0}
          presence={presence}
          isConnected={isConnected}
          isAdmin={isAdmin}
          onToggleAdmin={handleToggleAdmin}
          isMobileSidebarOpen={isSidebarOpen}
          onToggleMobileSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          
          {/* Board Title & Context Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${
                  activeBoard?.type === 'private'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                }`}
              >
                {activeBoard?.type === 'private' ? (
                  <Lock className="w-5 h-5" />
                ) : (
                  <Hash className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                    {activeBoard?.name || activeBoardId}
                  </h1>
                  {activeBoard?.type === 'private' && (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 font-semibold border border-amber-500/20">
                      PIN Protected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeBoard?.description || 'Share code snippets, notes, and drag-and-drop files instantly.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 self-start sm:self-auto">
              <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 shadow-2xs">
                {items.length} items live
              </span>
              {isAdmin && (
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-300 font-medium flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Admin Active
                </span>
              )}
            </div>
          </div>

        {/* Two-Tab Share Container: Text Share (Default) & File Share */}
        <div id="share-tabs-container" className="space-y-3">
          {/* Tabs Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/90 rounded-xl border border-slate-200/80 dark:border-slate-800 w-fit">
              <button
                id="share-tab-text-btn"
                type="button"
                onClick={() => setShareTab('text')}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  shareTab === 'text'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-slate-900/5 dark:ring-white/10'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Text / Snippet Share</span>
                {shareTab === 'text' && (
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">
                    Default
                  </span>
                )}
              </button>

              <button
                id="share-tab-file-btn"
                type="button"
                onClick={() => setShareTab('file')}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  shareTab === 'file'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-slate-900/5 dark:ring-white/10'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>File Share</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-medium">
                  Dropzone
                </span>
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              {shareTab === 'text' 
                ? 'Type notes, paste links, or share highlighted code snippets' 
                : 'Drag and drop any documents, archives, images, or files directly'}
            </p>
          </div>

          {/* Active Tab View */}
          {shareTab === 'text' ? (
            <QuickTextInput
              targetId={activeBoardId}
              roomPin={currentRoomPin}
              userProfile={userProfile}
              onPostSuccess={(newItem) => {
                setItems((prev) => {
                  if (prev.some((i) => i.id === newItem.id)) return prev;
                  return [newItem, ...prev];
                });
                showToast('Snippet shared to board!', 'success');
              }}
              onError={(msg) => showToast(msg, 'error')}
            />
          ) : (
            <DropZone
              targetId={activeBoardId}
              roomPin={currentRoomPin}
              userProfile={userProfile}
              onUploadSuccess={(newFiles) => {
                setItems((prev) => {
                  const combined = [...newFiles, ...prev];
                  // De-duplicate by id
                  const seen = new Set();
                  return combined.filter((i) => {
                    if (seen.has(i.id)) return false;
                    seen.add(i.id);
                    return true;
                  });
                });
                showToast(`Uploaded ${newFiles.length} file(s) successfully!`, 'success');
              }}
              onError={(msg) => showToast(msg, 'error')}
            />
          )}
        </div>

        {/* 3. Live Feed of Files and Snippets */}
        <div className="pt-2">
          <ContentFeed
            items={items}
            userProfile={userProfile}
            isAdmin={isAdmin}
            onDeleteItem={handleDeleteItem}
            onPreviewFile={(item) => setPreviewItem(item)}
          />
        </div>

      </main>
      </div>

      {/* Modals & Drawers */}
      <CreateBoardOrRoomModal
        isOpen={createModalType !== null}
        type={createModalType || 'public'}
        onClose={() => setCreateModalType(null)}
        userProfile={userProfile}
        onCreateSuccess={handleCreateBoardSuccess}
        onError={(msg) => showToast(msg, 'error')}
      />

      <UnlockRoomModal
        isOpen={unlockRoomTarget !== null}
        room={unlockRoomTarget}
        onClose={() => setUnlockRoomTarget(null)}
        onUnlockSuccess={handleRoomUnlockSuccess}
      />

      <IdentityModal
        isOpen={isIdentityModalOpen}
        onClose={() => setIsIdentityModalOpen(false)}
        currentProfile={userProfile}
        onSave={handleUpdateIdentity}
      />

      <TrashRecoveryDrawer
        isOpen={isTrashDrawerOpen}
        onClose={() => setIsTrashDrawerOpen(false)}
        targetId={activeBoardId}
        isAdmin={isAdmin}
        adminSecret={adminSecret}
        onUpdateAdminSecret={(sec) => {
          setAdminSecret(sec);
          saveAdminKey(sec);
        }}
        onItemRestored={(restored) => {
          if (restored.targetId === activeBoardId) {
            setItems((prev) => [restored, ...prev]);
          }
          showToast(`Restored "${restored.fileName || 'item'}"`, 'success');
        }}
        onItemPurged={(itemId) => {
          showToast('Item purged permanently', 'info');
        }}
      />

      <FilePreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-200 pointer-events-none">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl border text-xs font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : 'bg-slate-900/90 border-slate-700 text-slate-100'
            } backdrop-blur-md`}
          >
            {toast.type === 'success' ? (
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Bell className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

    </div>
  );
}
