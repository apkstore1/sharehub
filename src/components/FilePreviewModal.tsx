import React, { useEffect } from 'react';
import { X, Download, Copy, ExternalLink, Check } from 'lucide-react';
import { SharedItem } from '../types';

interface FilePreviewModalProps {
  item: SharedItem | null;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ item, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item || !item.fileUrl) return null;

  const isImage =
    item.fileMime?.startsWith('image/') ||
    Boolean(item.fileName?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg)$/));

  const isVideo =
    item.fileMime?.startsWith('video/') ||
    Boolean(item.fileName?.toLowerCase().match(/\.(mp4|webm|mov)$/));

  const isAudio =
    item.fileMime?.startsWith('audio/') ||
    Boolean(item.fileName?.toLowerCase().match(/\.(mp3|wav|ogg|m4a)$/));

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + item.fileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="min-w-0 flex-1 pr-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
              {item.fileName || 'File Preview'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Shared by <span className="text-slate-800 dark:text-slate-200 font-medium">{item.creatorName}</span> • {item.fileMime}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 font-medium transition-colors border border-slate-200 dark:border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Link' : 'Copy Link'}</span>
            </button>

            <a
              href={`${item.fileUrl}?download=1`}
              download={item.fileName}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs text-white font-medium shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100 dark:bg-slate-950/90 min-h-[300px]">
          {isImage ? (
            <img
              src={item.fileUrl}
              alt={item.fileName || 'Preview'}
              className="max-h-[70vh] max-w-full object-contain rounded-lg"
              referrerPolicy="no-referrer"
            />
          ) : isVideo ? (
            <video controls autoPlay className="max-h-[70vh] max-w-full rounded-lg" src={item.fileUrl}>
              Your browser does not support video preview.
            </video>
          ) : isAudio ? (
            <div className="p-8 w-full max-w-md text-center">
              <audio controls className="w-full" src={item.fileUrl}>
                Your browser does not support audio preview.
              </audio>
            </div>
          ) : (
            <div className="text-center p-8">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                No direct inline preview available for this file type ({item.fileMime}).
              </p>
              <a
                href={item.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs text-slate-800 dark:text-white font-medium transition-colors"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
