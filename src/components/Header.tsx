import React, { useState } from 'react';
import { BoardOrRoom, UserProfile, PresenceState } from '../types';
import { 
  Hash, 
  Lock, 
  Plus, 
  Users, 
  Trash2, 
  Shield, 
  Share2, 
  Check, 
  Wifi, 
  WifiOff,
  Sun,
  Moon,
  Menu,
  PanelLeft,
  Database
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  boards: BoardOrRoom[];
  activeBoardId: string;
  onSelectBoard: (boardId: string) => void;
  userProfile: UserProfile;
  onOpenIdentityModal: () => void;
  onOpenNewBoardModal: (type: 'public' | 'private') => void;
  onOpenTrashDrawer: () => void;
  deletedItemsCount: number;
  presence: PresenceState;
  isConnected: boolean;
  isAdmin: boolean;
  onToggleAdmin: () => void;
  onToggleSidebarMobile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  boards,
  activeBoardId,
  userProfile,
  onOpenIdentityModal,
  onOpenTrashDrawer,
  deletedItemsCount,
  presence,
  isConnected,
  isAdmin,
  onToggleAdmin,
  onToggleSidebarMobile,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [copiedLink, setCopiedLink] = useState(false);

  const activeBoard = boards.find((b) => b.id === activeBoardId);

  const handleCopyBoardLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('board', activeBoardId);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Left: Mobile Sidebar Trigger + Logo / Current Board Indicator */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Menu Button to open Board Sidebar */}
            <button
              onClick={onToggleSidebarMobile}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
              aria-label="Open boards sidebar"
              title="Open Boards Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-bold text-sm tracking-tight shrink-0">
                ⚡
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white truncate">
                    LAN ShareHub
                  </span>
                  <span className="hidden sm:inline-block text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 font-semibold border border-blue-500/20">
                    LAN Fast
                  </span>
                </div>
              </div>
            </div>

            {/* Connection Pill */}
            <div
              className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                isConnected
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
              }`}
              title={isConnected ? 'Live WebSockets Synced' : 'Disconnected, reconnecting...'}
            >
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{isConnected ? 'Live' : 'Offline'}</span>
            </div>

            {/* Cloud Database Pill */}
            <div
              className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30"
              title="Cloud Database: Connected to gen-lang-client-0777541108 (asia-south1)"
            >
              <Database className="w-3 h-3 text-sky-500" />
              <span>Cloud DB</span>
            </div>
          </div>

          {/* Center: Current Board Quick Badge (Shows which board is active) */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
            <span className="text-slate-400 dark:text-slate-500">Current:</span>
            <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white">
              {activeBoard?.type === 'private' ? (
                <Lock className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Hash className="w-3.5 h-3.5 text-blue-500" />
              )}
              <span className="truncate max-w-[200px]">{activeBoard?.name || activeBoardId}</span>
            </div>
          </div>

          {/* Right Controls: Actions, Theme Toggle & User Profile */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Quick Board Link Copy */}
            <button
              id="copy-board-link-btn"
              onClick={handleCopyBoardLink}
              title="Copy shareable link to this board/room"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition-colors"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* LIGHT / DARK THEME TOGGLE BUTTON */}
            <button
              id="theme-toggle-header-btn"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 transition-all flex items-center gap-1.5 text-xs font-medium"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
                  <span className="hidden sm:inline text-[11px]">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-500 hover:-rotate-12 transition-transform" />
                  <span className="hidden sm:inline text-[11px]">Dark</span>
                </>
              )}
            </button>

            {/* Trash & Recovery Drawer Trigger */}
            <button
              id="open-trash-drawer-btn"
              onClick={onOpenTrashDrawer}
              className={`relative p-2 rounded-xl border transition-colors ${
                deletedItemsCount > 0
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300 hover:bg-rose-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-slate-200 dark:border-slate-700/60'
              }`}
              title="Trash & Data Loss Recovery: restore accidentally deleted items"
            >
              <Trash2 className="w-4 h-4" />
              {deletedItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {deletedItemsCount}
                </span>
              )}
            </button>

            {/* Admin Shield Toggle */}
            <button
              id="toggle-admin-btn"
              onClick={onToggleAdmin}
              className={`p-2 rounded-xl border transition-colors ${
                isAdmin
                  ? 'bg-purple-600/10 dark:bg-purple-600/20 border-purple-500/40 text-purple-600 dark:text-purple-300 shadow-sm shadow-purple-500/10'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title={isAdmin ? 'Admin Mode: Active (Can purge & delete any item)' : 'Admin Mode: Inactive'}
            >
              <Shield className={`w-4 h-4 ${isAdmin ? 'text-purple-600 dark:text-purple-400' : ''}`} />
            </button>

            {/* Online Presence Counter */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300"
              title={`${presence.count} user(s) currently active on this board`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono">{presence.count}</span>
            </div>

            {/* User Profile Avatar Pill (Zero friction identity) */}
            <button
              id="user-profile-btn"
              onClick={onOpenIdentityModal}
              className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 transition-all"
              title="Click to edit your display name and avatar"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold uppercase shadow-inner"
                style={{ backgroundColor: userProfile.avatarColor }}
              >
                {userProfile.displayName.charAt(0)}
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200 max-w-[80px] sm:max-w-[100px] truncate">
                {userProfile.displayName}
              </span>
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
