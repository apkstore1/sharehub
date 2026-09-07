import { io, Socket } from 'socket.io-client';
import { UserProfile } from '../types';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['polling', 'websocket'],
    });

    socket.on('connect_error', (err) => {
      // Quietly fall back without throwing an unhandled rejection
      console.warn('Socket connect note:', err.message);
    });

    socket.on('error', (err) => {
      console.warn('Socket error note:', err);
    });
  }
  return socket;
}

export function joinBoardRoom(boardId: string, profile: UserProfile) {
  const s = getSocket();
  if (s.connected) {
    s.emit('join_board', {
      boardId,
      user: {
        id: profile.creatorId,
        name: profile.displayName,
        color: profile.avatarColor,
      },
    });
  } else {
    s.once('connect', () => {
      s.emit('join_board', {
        boardId,
        user: {
          id: profile.creatorId,
          name: profile.displayName,
          color: profile.avatarColor,
        },
      });
    });
  }
}

export function leaveBoardRoom() {
  const s = getSocket();
  if (s.connected) {
    s.emit('leave_board');
  }
}
