import React, { useState } from 'react';
import { Lock, Shield, KeyRound, X, Check, Copy, ArrowRight, Loader2 } from 'lucide-react';
import { UserProfile, BoardOrRoom } from '../types';

interface CreateRoomModalProps {
  isOpen: boolean;
  type: 'public' | 'private';
  onClose: () => void;
  userProfile: UserProfile;
  onCreateSuccess: (board: BoardOrRoom) => void;
  onError: (msg: string) => void;
}

export const CreateBoardOrRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  type,
  onClose,
  userProfile,
  onCreateSuccess,
  onError,
}) => {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (type === 'private' && (!pin || pin.trim().length < 3)) {
      onError('Private rooms require a PIN or password of at least 3 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          pin: type === 'private' ? pin.trim() : null,
          description: description.trim(),
          creatorId: userProfile.creatorId,
          creatorName: userProfile.displayName,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create workspace');
      }

      const res = await response.json();
      onCreateSuccess(res.board);
      onClose();
    } catch (err: any) {
      console.error('Create board error:', err);
      onError(err.message || 'Failed to create board/room');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-800 dark:text-slate-100 transition-colors">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
              type === 'private'
                ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/30'
                : 'bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/30'
            }`}
          >
            {type === 'private' ? <Lock className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {type === 'private' ? 'Create Private Room' : 'Create Public Board'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {type === 'private'
                ? 'Protected with a secret PIN. Only people with the PIN can access.'
                : 'Accessible to anyone on the office network.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {type === 'private' ? 'Room Name / Topic' : 'Board Name'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'private' ? 'e.g. Confidential Project Alpha, 1-on-1 Dave' : 'e.g. QA Testing, Marketing Assets'}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* PIN if private */}
          {type === 'private' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Room PIN / Passcode</span>
                <span className="text-[11px] text-amber-500 dark:text-amber-400 font-normal">Required for entry</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="e.g. 1234 or team-passcode"
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Share this PIN with your collaborators so they can unlock the room.
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this workspace used for?"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all ${
                type === 'private'
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
              } disabled:opacity-50`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>Create {type === 'private' ? 'Room' : 'Board'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface UnlockRoomModalProps {
  isOpen: boolean;
  room: BoardOrRoom | null;
  onClose: () => void;
  onUnlockSuccess: (pin: string) => void;
}

export const UnlockRoomModal: React.FC<UnlockRoomModalProps> = ({
  isOpen,
  room,
  onClose,
  onUnlockSuccess,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !room) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;

    setIsVerifying(true);
    setError(null);
    try {
      const res = await fetch('/api/rooms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, pin: pinInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        throw new Error(data.error || 'Incorrect PIN for this private room');
      }

      onUnlockSuccess(pinInput.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Incorrect PIN');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-800 dark:text-slate-100 text-center transition-colors">
        
        {/* Lock Graphic */}
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-md">
          <Lock className="w-6 h-6" />
        </div>

        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
          {room.name}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          This room is private and password-protected. Enter the PIN to view and share files.
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <input
              type="password"
              autoFocus
              required
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setError(null);
              }}
              placeholder="Enter Room PIN / Passcode"
              className="w-full text-center tracking-widest px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-base font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-500 dark:text-rose-400 font-medium animate-in fade-in">
              {error}
            </p>
          )}

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying || !pinInput.trim()}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-600/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Unlock Room</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
