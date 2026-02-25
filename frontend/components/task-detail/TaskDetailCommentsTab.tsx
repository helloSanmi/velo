import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { Task, User } from '../../types';
import { getUserFullName } from '../../utils/userDisplay';

interface TaskDetailCommentsTabProps {
  task: Task;
  currentUser?: User;
  allUsers: User[];
  typingUsers: Record<string, { name: string; lastSeen: number }>;
  commentText: string;
  setCommentText: (value: string) => void;
  onTypingStart: () => void;
  onAddComment: (e: React.FormEvent) => void;
  commentsEndRef: React.RefObject<HTMLDivElement | null>;
}

const TaskDetailCommentsTab: React.FC<TaskDetailCommentsTabProps> = ({
  task,
  currentUser,
  allUsers,
  typingUsers,
  commentText,
  setCommentText,
  onTypingStart,
  onAddComment,
  commentsEndRef
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [caretIndex, setCaretIndex] = useState(commentText.length);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);

  useEffect(() => {
    setCaretIndex(commentText.length);
  }, [commentText]);

  const mentionState = useMemo(() => {
    const safeCaret = Math.max(0, Math.min(caretIndex, commentText.length));
    const beforeCaret = commentText.slice(0, safeCaret);
    const mentionStart = beforeCaret.lastIndexOf('@');
    if (mentionStart < 0) return null;
    if (mentionStart > 0 && /\S/.test(beforeCaret[mentionStart - 1])) return null;
    const query = beforeCaret.slice(mentionStart + 1);
    if (/[\s\[\]]/.test(query)) return null;
    return { start: mentionStart, end: safeCaret, query: query.toLowerCase() };
  }, [commentText, caretIndex]);

  const mentionSuggestions = useMemo(() => {
    if (!mentionState) return [];
    const q = mentionState.query.trim();
    const pool = allUsers.filter((user) => user.id !== currentUser?.id);
    if (!q) return pool.slice(0, 6);
    return pool
      .filter((user) => user.displayName.toLowerCase().includes(q))
      .slice(0, 6);
  }, [allUsers, currentUser?.id, mentionState]);

  useEffect(() => {
    setActiveMentionIndex(0);
  }, [mentionState?.start, mentionState?.query, mentionSuggestions.length]);

  const insertMention = (user: User) => {
    if (!mentionState) return;
    const label = `@[${user.displayName}] `;
    const nextText = `${commentText.slice(0, mentionState.start)}${label}${commentText.slice(mentionState.end)}`;
    setCommentText(nextText);
    onTypingStart();
    window.requestAnimationFrame(() => {
      const cursor = mentionState.start + label.length;
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(cursor, cursor);
      }
      setCaretIndex(cursor);
    });
  };

  const renderCommentText = (text: string) => {
    const safeText = typeof text === 'string' ? text : '';
    const parts = safeText.split(/(@\[[^\]]+\])/g);
    return parts.map((part, index) => {
      const match = part.match(/^@\[(.+)\]$/);
      if (!match) {
        return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
      }
      return (
        <span
          key={`${part}-${index}`}
          className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[12px] font-semibold text-sky-700 align-middle mx-0.5"
        >
          @{match[1]}
        </span>
      );
    });
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar pb-4">
        {task.comments?.length === 0 && (
          <div className="h-full min-h-24 rounded-lg border border-dashed border-slate-200 text-xs text-slate-500 flex items-center justify-center px-4 text-center">
            No comments yet.
          </div>
        )}
        {task.comments?.map((comment) => {
          const commentUser = allUsers.find((user) => user.id === comment.userId);
          return (
            <div key={comment.id} className={`flex gap-3 ${comment.userId === currentUser?.id ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="w-8 h-8 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                <img
                  src={commentUser?.avatar}
                  alt={comment.displayName}
                  title={getUserFullName(commentUser || { displayName: comment.displayName })}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className={`max-w-[78%] px-3 py-2 rounded-xl text-sm leading-6 ${comment.userId === currentUser?.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {renderCommentText(comment.text)}
              </div>
            </div>
          );
        })}
        {Object.values(typingUsers).length > 0 ? (
          <p className="text-xs text-slate-400 px-1">
            {Object.values(typingUsers).map((entry) => entry.name).join(', ')} {Object.values(typingUsers).length > 1 ? 'are' : 'is'} typing...
          </p>
        ) : null}
        <div ref={commentsEndRef} />
      </div>
      <form onSubmit={onAddComment} className="mt-3 relative group">
        <input
          ref={inputRef}
          value={commentText}
          onChange={(e) => {
            setCommentText(e.target.value);
            setCaretIndex(e.target.selectionStart ?? e.target.value.length);
            onTypingStart();
          }}
          onClick={(e) => setCaretIndex((e.target as HTMLInputElement).selectionStart ?? commentText.length)}
          onKeyUp={(e) => setCaretIndex((e.target as HTMLInputElement).selectionStart ?? commentText.length)}
          onKeyDown={(e) => {
            if (mentionState && mentionSuggestions.length > 0) {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveMentionIndex((prev) => (prev + 1) % mentionSuggestions.length);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveMentionIndex((prev) => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                insertMention(mentionSuggestions[activeMentionIndex] || mentionSuggestions[0]);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setCaretIndex(commentText.length);
              }
              return;
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Write a comment..."
          className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-slate-300 transition-all"
        />
        <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center">
          <Send className="w-4 h-4" />
        </button>
        {mentionState && mentionSuggestions.length > 0 ? (
          <div className="absolute left-0 right-12 bottom-[calc(100%+6px)] rounded-lg border border-slate-200 bg-white shadow-lg p-1 z-20 max-h-44 overflow-y-auto custom-scrollbar">
            {mentionSuggestions.map((user, index) => (
              <button
                key={user.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(user);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-md ${index === activeMentionIndex ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{user.displayName}</span>
                  <span className={`text-[11px] truncate ${index === activeMentionIndex ? 'text-slate-200' : 'text-slate-500'}`}>
                    {user.username}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </form>
    </div>
  );
};

export default TaskDetailCommentsTab;
