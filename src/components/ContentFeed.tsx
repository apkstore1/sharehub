import React, { useState, useMemo } from 'react';
import { 
  SharedItem, 
  UserProfile, 
  FilterCategory 
} from '../types';
import { 
  Copy, 
  Check, 
  Download, 
  Trash2, 
  FileText, 
  Code, 
  Link as LinkIcon, 
  File as FileIcon, 
  ExternalLink, 
  Eye, 
  Search, 
  LayoutGrid, 
  List, 
  Clock, 
  ShieldCheck, 
  User, 
  FileArchive, 
  FileCode, 
  FileAudio, 
  FileVideo, 
  FileImage,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

interface ContentFeedProps {
  items: SharedItem[];
  userProfile: UserProfile;
  isAdmin: boolean;
  onDeleteItem: (item: SharedItem) => Promise<void>;
  onPreviewFile: (item: SharedItem) => void;
}

export const ContentFeed: React.FC<ContentFeedProps> = ({
  items,
  userProfile,
  isAdmin,
  onDeleteItem,
  onPreviewFile,
}) => {
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Time format helper
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleCopyText = (item: SharedItem) => {
    let textToCopy = '';
    if (item.type === 'file') {
      textToCopy = window.location.origin + (item.fileUrl || '');
    } else {
      textToCopy = item.content || '';
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedItemId(item.id);
    setTimeout(() => {
      setCopiedItemId(null);
    }, 2000);
  };

  const handleDeleteConfirm = async (item: SharedItem) => {
    setDeletingItemId(item.id);
    try {
      await onDeleteItem(item);
    } finally {
      setDeletingItemId(null);
      setConfirmDeleteId(null);
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (filter === 'files' && item.type !== 'file') return false;
      if (filter === 'snippets' && item.type === 'file') return false;
      if (filter === 'mine' && item.creatorId !== userProfile.creatorId) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const contentMatch = item.content?.toLowerCase().includes(query);
        const fileNameMatch = item.fileName?.toLowerCase().includes(query);
        const authorMatch = item.creatorName?.toLowerCase().includes(query);
        const languageMatch = item.language?.toLowerCase().includes(query);
        if (!contentMatch && !fileNameMatch && !authorMatch && !languageMatch) {
          return false;
        }
      }

      return true;
    });
  }, [items, filter, searchQuery, userProfile.creatorId]);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: items.length,
      files: items.filter((i) => i.type === 'file').length,
      snippets: items.filter((i) => i.type !== 'file').length,
      mine: items.filter((i) => i.creatorId === userProfile.creatorId).length,
    };
  }, [items, userProfile.creatorId]);

  // File icon helper
  const getFileIcon = (mime?: string, name?: string) => {
    if (!mime && !name) return <FileIcon className="w-5 h-5 text-blue-400" />;
    const m = mime?.toLowerCase() || '';
    const n = name?.toLowerCase() || '';

    if (m.startsWith('image/') || n.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
      return <FileImage className="w-5 h-5 text-emerald-400" />;
    }
    if (m.startsWith('video/') || n.match(/\.(mp4|webm|mov|mkv)$/)) {
      return <FileVideo className="w-5 h-5 text-purple-400" />;
    }
    if (m.startsWith('audio/') || n.match(/\.(mp3|wav|ogg|m4a)$/)) {
      return <FileAudio className="w-5 h-5 text-amber-400" />;
    }
    if (n.match(/\.(zip|tar|gz|rar|7z)$/)) {
      return <FileArchive className="w-5 h-5 text-rose-400" />;
    }
    if (n.match(/\.(js|ts|tsx|jsx|json|py|rs|go|html|css|sql|sh)$/)) {
      return <FileCode className="w-5 h-5 text-cyan-400" />;
    }
    return <FileText className="w-5 h-5 text-blue-400" />;
  };

  const isImageFile = (item: SharedItem) => {
    return (
      item.fileMime?.startsWith('image/') ||
      Boolean(item.fileName?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg)$/))
    );
  };

  const isAudioFile = (item: SharedItem) => {
    return (
      item.fileMime?.startsWith('audio/') ||
      Boolean(item.fileName?.toLowerCase().match(/\.(mp3|wav|ogg|m4a)$/))
    );
  };

  const isVideoFile = (item: SharedItem) => {
    return (
      item.fileMime?.startsWith('video/') ||
      Boolean(item.fileName?.toLowerCase().match(/\.(mp4|webm|mov)$/))
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Search Bar & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            id="filter-all"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Items ({counts.all})
          </button>
          <button
            id="filter-files"
            onClick={() => setFilter('files')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              filter === 'files'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Files ({counts.files})
          </button>
          <button
            id="filter-snippets"
            onClick={() => setFilter('snippets')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              filter === 'snippets'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Snippets ({counts.snippets})
          </button>
          <button
            id="filter-mine"
            onClick={() => setFilter('mine')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              filter === 'mine'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            My Shared ({counts.mine})
          </button>
        </div>

        {/* Search & Layout toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="feed-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search content or author..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="List view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center mx-auto mb-3 text-slate-400 shadow-sm">
            <Sparkles className="w-6 h-6 text-blue-500" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
            {searchQuery ? 'No matching items found' : 'No items shared on this board yet'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? 'Try changing your search keywords or clear the filter.'
              : 'Drop a file onto the canvas or write a quick code snippet above to share with colleagues.'}
          </p>
        </div>
      )}

      {/* Cards List or Grid */}
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4'
            : 'space-y-3'
        }
      >
        {filteredItems.map((item) => {
          const isAuthor = item.creatorId === userProfile.creatorId;
          const canDelete = isAuthor || isAdmin;
          const isCopied = copiedItemId === item.id;
          const isConfirming = confirmDeleteId === item.id;

          return (
            <div
              key={item.id}
              id={`item-card-${item.id}`}
              className="group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md"
            >
              {/* Card Header: Author Badge & Metadata */}
              <div className="flex items-center justify-between p-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 uppercase shadow-inner"
                    style={{
                      backgroundColor: isAuthor ? userProfile.avatarColor : '#475569',
                    }}
                  >
                    {item.creatorName ? item.creatorName.charAt(0) : 'A'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate">
                        {item.creatorName}
                      </span>
                      {isAuthor && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-1.5 py-0.2 rounded font-medium">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimeAgo(item.createdAt)}</span>
                      </span>
                      {item.senderIp && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                            {item.senderIp.replace('::ffff:', '')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Type Indicator Tag */}
                <div className="flex items-center gap-1.5">
                  {item.type === 'file' && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-medium border border-slate-200 dark:border-slate-700">
                      {formatBytes(item.fileSize)}
                    </span>
                  )}
                  {item.type === 'code' && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 font-mono font-medium border border-blue-500/20">
                      {item.language || 'code'}
                    </span>
                  )}
                  {item.type === 'link' && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 font-medium border border-emerald-500/20 flex items-center gap-1">
                      <LinkIcon className="w-2.5 h-2.5" />
                      Link
                    </span>
                  )}
                  {item.type === 'text' && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700">
                      Note
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body: File, Code, or Text */}
              <div className="p-4 flex-1">
                {item.type === 'file' ? (
                  <div className="space-y-3">
                    {/* Image Preview */}
                    {isImageFile(item) && item.fileUrl && (
                      <div
                        onClick={() => onPreviewFile(item)}
                        className="relative cursor-pointer rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 group/img max-h-64 flex items-center justify-center"
                      >
                        <img
                          src={item.fileUrl}
                          alt={item.fileName || 'Shared image'}
                          className="w-full h-full object-contain hover:scale-[1.02] transition-transform duration-200"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1.5">
                          <Eye className="w-4 h-4" />
                          <span>Click to expand</span>
                        </div>
                      </div>
                    )}

                    {/* Audio Preview */}
                    {isAudioFile(item) && item.fileUrl && (
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <audio controls className="w-full h-8" src={item.fileUrl} preload="none">
                          Your browser does not support audio playback.
                        </audio>
                      </div>
                    )}

                    {/* Video Preview */}
                    {isVideoFile(item) && item.fileUrl && (
                      <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <video controls className="w-full max-h-56 object-cover" src={item.fileUrl} preload="metadata">
                          Your browser does not support video playback.
                        </video>
                      </div>
                    )}

                    {/* File Attachment Card */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-xs">
                        {getFileIcon(item.fileMime, item.fileName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {item.fileName || 'Unnamed File'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {formatBytes(item.fileSize)} • {item.fileMime || 'Unknown type'}
                        </p>
                      </div>
                    </div>

                    {/* File caption if present */}
                    {item.content && item.content !== item.fileName && (
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/50">
                        {item.content}
                      </p>
                    )}
                  </div>
                ) : item.type === 'code' ? (
                  /* Code snippet formatted box */
                  <div className="relative rounded-xl overflow-hidden bg-slate-900 dark:bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 dark:bg-slate-900 border-b border-slate-700/60 dark:border-slate-800 text-[11px] font-mono text-slate-300 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Code className="w-3 h-3 text-blue-400" />
                        <span>{item.language || 'plaintext'}</span>
                      </span>
                      <span>{item.content ? item.content.split('\n').length : 1} lines</span>
                    </div>
                    <pre className="p-3 text-xs font-mono text-slate-100 dark:text-slate-200 overflow-x-auto max-h-72 leading-relaxed selection:bg-blue-600/30">
                      <code>{item.content}</code>
                    </pre>
                  </div>
                ) : item.type === 'link' ? (
                  /* Link / Bookmark display */
                  <div className="space-y-2">
                    <a
                      href={item.content?.startsWith('http') ? item.content : `https://${item.content}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/link flex items-center justify-between p-3 rounded-xl bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <LinkIcon className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-300 group-hover/link:underline truncate">
                          {item.content}
                        </span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0 ml-2" />
                    </a>
                  </div>
                ) : (
                  /* Standard text note */
                  <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed">
                    {item.content}
                  </div>
                )}
              </div>

              {/* Card Footer: Action Bar */}
              <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {/* Copy Button */}
                  <button
                    id={`copy-btn-${item.id}`}
                    onClick={() => handleCopyText(item)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700/60"
                    title={item.type === 'file' ? 'Copy File Link' : 'Copy Text / Code'}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                        <span>{item.type === 'file' ? 'Copy Link' : 'Copy'}</span>
                      </>
                    )}
                  </button>

                  {/* Download button for files */}
                  {item.type === 'file' && item.fileUrl && (
                    <a
                      id={`download-btn-${item.id}`}
                      href={`${item.fileUrl}?download=1`}
                      download={item.fileName || 'file'}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700/60"
                      title="Download file to computer"
                    >
                      <Download className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                      <span>Download</span>
                    </a>
                  )}

                  {/* Preview button for files */}
                  {item.type === 'file' && (
                    <button
                      onClick={() => onPreviewFile(item)}
                      className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="View preview"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Conditional Delete Button: ONLY visible to author or admin! */}
                {canDelete && (
                  <div>
                    {isConfirming ? (
                      <div className="flex items-center gap-1 animate-in fade-in duration-150">
                        <span className="text-[11px] text-rose-500 font-medium hidden sm:inline">
                          Soft-delete?
                        </span>
                        <button
                          id={`confirm-delete-${item.id}`}
                          onClick={() => handleDeleteConfirm(item)}
                          disabled={deletingItemId === item.id}
                          className="px-2 py-0.8 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold transition-colors"
                        >
                          {deletingItemId === item.id ? 'Deleting...' : 'Yes, Delete'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-0.8 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        id={`delete-btn-${item.id}`}
                        onClick={() => setConfirmDeleteId(item.id)}
                        className="flex items-center gap-1 p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title={
                          isAdmin
                            ? 'Admin Delete (Will be moved to Recovery Trash)'
                            : 'Delete your item (Will be moved to Recovery Trash)'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
