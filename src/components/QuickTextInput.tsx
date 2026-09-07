import React, { useState } from 'react';
import { 
  FileText, 
  Code, 
  Link2, 
  Send, 
  Loader2, 
  Terminal, 
  Maximize2, 
  Minimize2,
  Sparkles
} from 'lucide-react';
import { UserProfile, ItemType } from '../types';

interface QuickTextInputProps {
  targetId: string;
  roomPin?: string | null;
  userProfile: UserProfile;
  onPostSuccess: (item: any) => void;
  onError: (msg: string) => void;
}

const PROGRAMMING_LANGUAGES = [
  { value: 'plaintext', label: 'Plain Text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'json', label: 'JSON' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash / Shell' },
  { value: 'html', label: 'HTML / XML' },
  { value: 'css', label: 'CSS' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'markdown', label: 'Markdown' },
];

export const QuickTextInput: React.FC<QuickTextInputProps> = ({
  targetId,
  roomPin,
  userProfile,
  onPostSuccess,
  onError,
}) => {
  const [activeTab, setActiveTab] = useState<ItemType>('text');
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/items/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId,
          type: activeTab,
          content: content.trim(),
          language: activeTab === 'code' ? language : null,
          creatorId: userProfile.creatorId,
          creatorName: userProfile.displayName,
          pin: roomPin,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to share snippet');
      }

      const res = await response.json();
      setContent('');
      setIsExpanded(false);
      onPostSuccess(res.item);
    } catch (err: any) {
      console.error('Post text error:', err);
      onError(err.message || 'Failed to post text');
    } finally {
      setIsSubmitting(false);
    }
  };

  const charCount = content.length;
  const lineCount = content ? content.split('\n').length : 0;

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm transition-colors">
      {/* Header controls: Tabs & Language selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            id="tab-text"
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'text'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Note / Text</span>
          </button>

          <button
            type="button"
            id="tab-code"
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'code'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Code Snippet</span>
          </button>

          <button
            type="button"
            id="tab-link"
            onClick={() => setActiveTab('link')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'link'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Link / URL</span>
          </button>
        </div>

        {/* Code language selection & Expand button */}
        <div className="flex items-center gap-2">
          {activeTab === 'code' && (
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <select
                id="code-language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              >
                {PROGRAMMING_LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Collapse editor' : 'Expand editor'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Editor Textarea */}
      <div className="relative">
        <textarea
          id="snippet-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            activeTab === 'code'
              ? '// Paste function, terminal log, stack trace, or config snippet here...'
              : activeTab === 'link'
              ? 'Paste URL (e.g. https://github.com/... or staging link) with optional description...'
              : 'Write quick instructions, meeting notes, clipboard text, or office memo...'
          }
          rows={isExpanded ? 10 : activeTab === 'code' ? 5 : 3}
          className={`w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500/60 transition-all text-xs sm:text-sm resize-y ${
            activeTab === 'code' ? 'font-mono leading-relaxed' : 'font-sans'
          }`}
        />
      </div>

      {/* Footer bar: Stats & Share Action */}
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
          <span>{charCount} chars</span>
          {activeTab === 'code' && (
            <>
              <span>•</span>
              <span>{lineCount} lines</span>
            </>
          )}
          <span className="hidden sm:inline text-slate-400 dark:text-slate-500 font-sans">
            (Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-mono text-[10px]">Ctrl+Enter</kbd> to share)
          </span>
        </div>

        <button
          type="button"
          id="post-snippet-btn"
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all ${
            content.trim() && !isSubmitting
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20 cursor-pointer active:scale-95'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700/50'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Sharing...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Share {activeTab === 'code' ? 'Snippet' : activeTab === 'link' ? 'Link' : 'Text'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
