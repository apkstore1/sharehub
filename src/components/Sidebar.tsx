import React, { useState } from 'react';
import { BoardOrRoom, UserProfile } from '../types';
import { 
  Hash, 
  Lock, 
  Plus, 
  Search, 
  Share2, 
  Check, 
  X, 
  Sun, 
  Moon, 
  Users, 
  Layers,
  Sparkles,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  boards: BoardOrRoom[];
  activeBoardId: string;
  onSelectBoard: (boardId: string) => void;
  onOpenNewBoardModal: (type: 'public' | 'private') => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  presenceCount: number;
  isConnected: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  boards,
  activeBoardId,
  onSelectBoard,
  onOpenNewBoardModal,
  isOpenMobile,
  onCloseMobile,
  presenceCount,
  isConnected,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const publicBoards = boards.filter((b) => b.type === 'public');
  const privateRooms = boards.filter((b) => b.type === 'private');

  const filteredPublic = publicBoards.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredPrivate = privateRooms.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCopyCurrentBoard = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('board', activeBoardId);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const content = (
    <div className="h-full flex flex-col justify-between bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 select-none transition-colors duration-200">
      
      {/* Top Header / Brand for Sidebar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-bold text-sm">
              ⚡
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>LAN ShareHub</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Local Workspace Boards
              </p>
            </div>
          </div>

          {/* Close button on mobile drawer */}
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Boards */}
        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search boards or rooms..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Main Boards List (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5 scrollbar-thin">
        
        {/* 1. Public Boards Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Public Boards ({publicBoards.length})
            </span>
            <button
              onClick={() => {
                onOpenNewBoardModal('public');
                onCloseMobile();
              }}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Add a new public board"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {filteredPublic.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-slate-400 italic">
                No matching boards
              </div>
            ) : (
              filteredPublic.map((b) => {
                const isActive = b.id === activeBoardId;
                return (
                  <button
                    key={b.id}
                    id={`sidebar-board-${b.id}`}
                    onClick={() => {
                      onSelectBoard(b.id);
                      onCloseMobile();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-all group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 ${
                        isActive
                          ? 'bg-blue-700 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                      }`}>
                        <Hash className="w-3 h-3" />
                      </span>
                      <span className="truncate">{b.name}</span>
                    </div>

                    {typeof b.itemCount === 'number' && b.itemCount > 0 && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full shrink-0 ${
                          isActive
                            ? 'bg-blue-800 text-blue-100'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {b.itemCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 2. Private Rooms Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400/90 flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              <span>Private Rooms ({privateRooms.length})</span>
            </span>
            <button
              onClick={() => {
                onOpenNewBoardModal('private');
                onCloseMobile();
              }}
              className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors"
              title="Create a password-protected private room"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {filteredPrivate.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-slate-400 italic">
                {privateRooms.length === 0 ? 'No private rooms yet' : 'No matching rooms'}
              </div>
            ) : (
              filteredPrivate.map((b) => {
                const isActive = b.id === activeBoardId;
                return (
                  <button
                    key={b.id}
                    id={`sidebar-room-${b.id}`}
                    onClick={() => {
                      onSelectBoard(b.id);
                      onCloseMobile();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-all group ${
                      isActive
                        ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 ${
                        isActive
                          ? 'bg-amber-700 text-white'
                          : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}>
                        <Lock className="w-3 h-3" />
                      </span>
                      <span className="truncate">{b.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {typeof b.itemCount === 'number' && b.itemCount > 0 && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-amber-800 text-amber-100'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {b.itemCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Footer Area: Actions & Theme Toggle */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2.5">
        
        {/* Copy Active Board Link */}
        <button
          onClick={handleCopyCurrentBoard}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 dark:hover:border-blue-500 transition-colors shadow-sm"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400">Link Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Share Active Board Link</span>
            </>
          )}
        </button>

        {/* Theme Switcher Toggle Button */}
        <div className="flex items-center justify-between px-2 py-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800/80">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
            <span>Theme: <strong className="capitalize text-slate-900 dark:text-slate-100">{theme}</strong></span>
          </span>

          <button
            onClick={toggleTheme}
            id="sidebar-theme-toggle-btn"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm hover:text-blue-600 dark:hover:text-blue-400 transition-all"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>

        {/* LAN Status info pill */}
        <div className="flex items-center justify-between px-2 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isConnected ? 'bg-emerald-400' : 'bg-rose-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isConnected ? 'bg-emerald-500' : 'bg-rose-500'
              }`}></span>
            </span>
            <span>{isConnected ? 'LAN Connected' : 'Offline'}</span>
          </div>

          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-400" />
            <span>{presenceCount} online</span>
          </div>
        </div>

      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar: Permanent column on md+ screens */}
      <aside className="hidden md:block w-64 lg:w-72 shrink-0 sticky top-16 h-[calc(100vh-4rem)] z-20">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          />
          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
