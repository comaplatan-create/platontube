import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { addComment, getCommentsByVideoId, getUser, toggleCommentLike, Comment, User } from '../lib/db';
import { Link } from 'react-router-dom';
import { CheckCircle, ThumbsUp } from 'lucide-react';

interface CommentWithAuthor extends Comment {
  author?: User;
}

export default function CommentsSection({ videoId }: { videoId: string | number }) {
  const { user: currentUser } = useAuth();
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const fetchedComments = await getCommentsByVideoId(videoId);
      
      const commentsWithAuthors = await Promise.all(
        fetchedComments.map(async (comment) => {
          const author = await getUser(comment.userHandle);
          return { ...comment, author };
        })
      );
      
      if (currentUser) {
        const freshUser = await getUser(currentUser.handle);
        if (freshUser?.likedComments) {
          setLikedCommentIds(new Set(freshUser.likedComments));
        }
      }
      
      // Sort newest first
      commentsWithAuthors.sort((a, b) => b.createdAt - a.createdAt);
      setComments(commentsWithAuthors);
    } catch (e) {
      console.error('Failed to fetch comments', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [videoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const commentToSave: Comment = {
        videoId: String(videoId),
        userHandle: currentUser.handle,
        text: newComment.trim(),
        createdAt: Date.now(),
      };
      await addComment(commentToSave);
      setNewComment('');
      await fetchComments();
    } catch (e) {
      console.error('Failed to submit comment', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentUser) return;
    
    const isLiked = likedCommentIds.has(commentId);
    
    // Optimistic update
    setLikedCommentIds(prev => {
      const next = new Set(prev);
      if (isLiked) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
    
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          likes: isLiked ? Math.max(0, (c.likes || 1) - 1) : (c.likes || 0) + 1,
        };
      }
      return c;
    }));

    try {
      await toggleCommentLike(commentId, currentUser.handle);
    } catch (e) {
      console.error('Failed to like comment', e);
      // Revert optimistic
      setLikedCommentIds(prev => {
        const next = new Set(prev);
        if (isLiked) next.add(commentId);
        else next.delete(commentId);
        return next;
      });
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            likes: isLiked ? (c.likes || 0) + 1 : Math.max(0, (c.likes || 1) - 1),
          };
        }
        return c;
      }));
    }
  };

  return (
    <div className="mt-8 border-t border-neutral-800 pt-6">
      <h3 className="text-xl font-bold mb-6">{comments.length} Комментариев</h3>
      
      {currentUser ? (
        <form onSubmit={handleSubmit} className="flex gap-4 mb-8">
          <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden relative">
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
            ) : (
              currentUser.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Введите комментарий..."
              className="w-full bg-transparent border-b border-neutral-700 focus:border-white outline-none px-0 py-2 transition-colors"
              disabled={isSubmitting}
            />
            {newComment.trim() && (
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setNewComment('')}
                  className="px-4 py-2 rounded-full hover:bg-neutral-800 transition-colors font-medium text-sm text-neutral-300"
                  disabled={isSubmitting}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors font-medium text-sm disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  Оставить комментарий
                </button>
              </div>
            )}
          </div>
        </form>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-8 text-center">
          <p className="text-neutral-400 mb-3">Войдите, чтобы оставлять комментарии</p>
          <Link to="/auth" className="inline-block bg-white text-neutral-900 font-medium px-4 py-2 rounded-full hover:bg-neutral-200 transition-colors">
            Войти
          </Link>
        </div>
      )}

      {isLoading ? (
        <div className="text-neutral-500">Загрузка комментариев...</div>
      ) : comments.length > 0 ? (
        <div className="flex flex-col gap-6">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-4">
              <Link to={`/channel/${comment.userHandle.replace('@', '')}`} className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-lg shrink-0 hover:ring-2 hover:ring-neutral-600 transition-all text-white overflow-hidden relative">
                {comment.author?.avatarUrl ? (
                  <img src={comment.author.avatarUrl} alt={comment.author.name} className="w-full h-full object-cover" />
                ) : (
                   comment.author?.name ? comment.author.name.charAt(0).toUpperCase() : '?'
                )}
              </Link>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Link to={`/channel/${comment.userHandle.replace('@', '')}`} className="font-semibold text-sm hover:underline flex items-center gap-1">
                    {comment.author?.name || comment.userHandle}
                    {comment.userHandle.toLowerCase() === '@platontube' && (
                      <CheckCircle className="w-3.5 h-3.5 fill-neutral-400 text-neutral-900" />
                    )}
                  </Link>
                  <span className="text-xs text-neutral-500">{formatDate(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                
                <div className="flex items-center gap-4 mt-2">
                  <button 
                    onClick={() => comment.id && handleLikeComment(comment.id)}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${comment.id && likedCommentIds.has(comment.id) ? 'text-white' : 'text-neutral-400 hover:text-white'}`}
                  >
                     <ThumbsUp className={`w-3.5 h-3.5 ${comment.id && likedCommentIds.has(comment.id) ? 'fill-white' : ''}`} />
                     {comment.likes ? comment.likes : ''}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-neutral-500 text-center py-8">Пусто. Оставьте комментарий первым!</div>
      )}
    </div>
  );
}
