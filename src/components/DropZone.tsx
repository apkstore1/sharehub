import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, File, CheckCircle2, AlertCircle, Loader2, Sparkles, Paperclip } from 'lucide-react';
import { UserProfile } from '../types';

interface DropZoneProps {
  targetId: string;
  roomPin?: string | null;
  userProfile: UserProfile;
  onUploadSuccess: (newItems: any[]) => void;
  onError: (msg: string) => void;
}

interface UploadTask {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'done' | 'error';
  progress: number;
}

export const DropZone: React.FC<DropZoneProps> = ({
  targetId,
  roomPin,
  userProfile,
  onUploadSuccess,
  onError,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global window paste listener for pasting images or files directly
  useEffect(() => {
    const handleWindowPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const filesToUpload: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) filesToUpload.push(file);
        }
      }

      if (filesToUpload.length > 0) {
        uploadFiles(filesToUpload);
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [targetId, roomPin, userProfile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files) as File[];
      uploadFiles(filesArray);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files) as File[];
      uploadFiles(filesArray);
      // Reset input so re-uploading same file triggers change
      e.target.value = '';
    }
  };

  const uploadFiles = async (files: File[]) => {
    const newTasks: UploadTask[] = files.map((f) => ({
      id: Math.random().toString(36).substring(2, 9),
      name: f.name,
      size: f.size,
      status: 'uploading',
      progress: 30,
    }));

    setTasks((prev) => [...newTasks, ...prev].slice(0, 8));

    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    formData.append('targetId', targetId);
    formData.append('creatorId', userProfile.creatorId);
    formData.append('creatorName', userProfile.displayName);
    if (caption.trim()) {
      formData.append('caption', caption.trim());
    }
    if (roomPin) {
      formData.append('pin', roomPin);
    }

    try {
      // Simulate progressive progress
      const timer = setInterval(() => {
        setTasks((prev) =>
          prev.map((t) =>
            newTasks.some((nt) => nt.id === t.id) && t.status === 'uploading'
              ? { ...t, progress: Math.min(t.progress + 25, 90) }
              : t
          )
        );
      }, 200);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(timer);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();
      setTasks((prev) =>
        prev.map((t) =>
          newTasks.some((nt) => nt.id === t.id) ? { ...t, status: 'done', progress: 100 } : t
        )
      );

      setCaption('');
      if (result.items) {
        onUploadSuccess(result.items);
      }

      // Auto-clear successful tasks after 4 seconds
      setTimeout(() => {
        setTasks((prev) => prev.filter((t) => !newTasks.some((nt) => nt.id === t.id)));
      }, 4000);
    } catch (err: any) {
      console.error('File upload error:', err);
      onError(err.message || 'File upload failed');
      setTasks((prev) =>
        prev.map((t) =>
          newTasks.some((nt) => nt.id === t.id) ? { ...t, status: 'error' } : t
        )
      );
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      {/* Dropzone Container */}
      <div
        id="main-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative cursor-pointer border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 scale-[1.008] shadow-lg shadow-blue-500/10 ring-4 ring-blue-500/20'
            : 'border-slate-300 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:border-slate-400 dark:hover:border-slate-600'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          id="file-upload-input"
        />

        <div className="flex flex-col items-center justify-center pointer-events-none">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-200 ${
              isDragOver
                ? 'bg-blue-600 text-white scale-110 shadow-md shadow-blue-500/30'
                : 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 group-hover:scale-105 border border-slate-200 dark:border-slate-700/60 shadow-sm'
            }`}
          >
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
            <span>Drop any file here to instantly share</span>
          </h3>

          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md">
            Click to browse, drag files from your desktop, or press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px]">Ctrl+V</kbd> to paste clipboard images.
          </p>

          <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>⚡ Instant LAN Sync</span>
            <span>•</span>
            <span>📦 Up to 150MB</span>
            <span>•</span>
            <span>🔒 Soft-Delete Protected</span>
          </div>
        </div>
      </div>

      {/* Optional Caption and Quick Upload bar */}
      <div className="mt-2 flex items-center gap-2">
        <div className="relative flex-1">
          <input
            id="file-caption-input"
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add an optional note or caption before dropping/choosing files..."
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors shadow-sm"
          />
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
        >
          <Paperclip className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>Browse Files</span>
        </button>
      </div>

      {/* Live Upload Tasks Progress */}
      {tasks.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 shadow-sm animate-in fade-in duration-200"
            >
              <div className="flex items-center gap-2 min-w-0 max-w-[70%]">
                {t.status === 'uploading' && (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                )}
                {t.status === 'done' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                {t.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span className="truncate font-medium">{t.name}</span>
                <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                  ({formatBytes(t.size)})
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {t.status === 'uploading' && (
                  <div className="w-24 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-200"
                      style={{ width: `${t.progress}%` }}
                    />
                  </div>
                )}
                <span
                  className={`text-[11px] font-medium ${
                    t.status === 'done'
                      ? 'text-emerald-500'
                      : t.status === 'error'
                      ? 'text-rose-500'
                      : 'text-blue-500'
                  }`}
                >
                  {t.status === 'done' ? 'Uploaded' : t.status === 'error' ? 'Failed' : 'Uploading...'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
