import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getVideo, incrementViews, getUser, toggleLike, toggleSubscribe, Video, User } from '../lib/db';
import { ArrowLeft, ThumbsUp, Share2, Search, CheckCircle } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import CommentsSection from '../components/CommentsSection';

export default function Watch() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser, refreshUser } = useAuth();
  
  const [video, setVideo] = useState<Video | null>(null);
  const [author, setAuthor] = useState<User | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  const viewIncrementedRef = useRef<string | number | null>(null);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) return;
      let dbId: string | number = id;
      
      let v = await getVideo(dbId);
      if (!v && !isNaN(parseInt(id, 10))) {
        dbId = parseInt(id, 10);
        v = await getVideo(dbId);
      }
      
      if (v) {
        if (viewIncrementedRef.current !== dbId) {
          viewIncrementedRef.current = dbId;
          await incrementViews(dbId);
          v = await getVideo(dbId); // Получаем обновленные данные
        }

        setVideo(v || null);

        if (v) {
          const a = await getUser(v.handle);
          setAuthor(a || null);
          
          if (currentUser) {
            setIsLiked(currentUser.likedVideos?.includes(dbId.toString()) || false);
            if (a) {
              setIsSubscribed(currentUser.subscriptions?.includes(a.handle) || false);
            }
          }
        }
      }
    };
    fetchVideo();
  }, [id, currentUser]);

  const handleLike = async () => {
    if (!currentUser || !video?.id) return;
    const newLikedState = await toggleLike(video.id, currentUser.handle);
    setIsLiked(newLikedState);
    setVideo(prev => prev ? { ...prev, likes: Math.max(0, (prev.likes || 0) + (newLikedState ? 1 : -1)) } : null);
    refreshUser();
  };

  const handleSubscribe = async () => {
    if (!currentUser || !author) return;
    const newSubState = await toggleSubscribe(currentUser.handle, author.handle);
    setIsSubscribed(newSubState);
    setAuthor(prev => prev ? { ...prev, subscriberCount: Math.max(0, prev.subscriberCount + (newSubState ? 1 : -1)) } : null);
    refreshUser();
  };

  const videoSrc = useMemo(() => {
    if (video?.videoUrl) return video.videoUrl;
    if (video?.videoBlob) return URL.createObjectURL(video.videoBlob);
    return null;
  }, [video?.videoBlob, video?.videoUrl]);

  if (!video) return <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">Загрузка...</div>;

  const isOwner = currentUser?.handle === author?.handle;

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <header className="sticky top-0 z-50 h-16 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 flex items-center px-4 sm:px-6 justify-between gap-4">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-neutral-800 rounded-full transition-colors mr-4">
            <ArrowLeft className="w-5 h-5 text-neutral-300" />
          </button>
          <Link to="/home" className="font-semibold text-lg hidden sm:block hover:text-red-500 transition-colors">PlatonTube</Link>
        </div>
        
        <div className="flex-1 max-w-xl hidden md:block">
          <form 
            onSubmit={(e) => { 
              e.preventDefault(); 
              const q = new FormData(e.currentTarget).get('q'); 
              if (q) navigate(`/search?q=${encodeURIComponent(q.toString())}`); 
            }} 
            className="flex items-center bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2 focus-within:border-neutral-600 focus-within:bg-neutral-950 transition-colors"
          >
            <input name="q" type="text" placeholder="Введите запрос..." className="bg-transparent border-none outline-none flex-1 text-sm text-neutral-200 placeholder-neutral-500" />
            <button type="submit"><Search className="w-4 h-4 text-neutral-500 hover:text-white transition-colors cursor-pointer" /></button>
          </form>
        </div>
        
        <div className="w-submit hidden md:block opacity-0 pointer-events-none">
          <div className="w-24"></div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden border border-neutral-800 flex items-center justify-center relative shadow-2xl">
            {videoSrc ? (
              <video src={videoSrc} controls autoPlay playsInline className="w-full h-full object-contain focus:outline-none" />
            ) : (
              <div className="text-neutral-500">Медиафайл недоступен</div>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mt-2">{video.title}</h1>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4 mt-2">
             <div className="flex items-center gap-3">
               <Link to={`/channel/${video.handle.replace('@', '')}`} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-lg hover:ring-2 hover:ring-neutral-600 transition-all shrink-0 relative">
                  {author?.avatarUrl ? (
                    <img src={author.avatarUrl} alt={author.name} className="w-full h-full object-cover" />
                  ) : (
                    author ? author.name.charAt(0).toUpperCase() : '?'
                  )}
               </Link>
               <div>
                  <Link to={`/channel/${video.handle.replace('@', '')}`} className="font-semibold text-base sm:text-lg hover:underline flex items-center gap-1.5 leading-tight">
                    {author ? author.name : video.handle}
                    {author?.handle.toLowerCase() === '@platontube' && (
                      <CheckCircle className="w-3.5 h-3.5 fill-neutral-400 text-neutral-900" />
                    )}
                  </Link>
                  <p className="text-xs sm:text-sm text-neutral-400">{author?.subscriberCount.toLocaleString('ru-RU')} подписчиков</p>
               </div>
               {!isOwner && (
                 <button 
                   onClick={handleSubscribe} 
                   className={`ml-2 sm:ml-4 font-semibold px-4 py-2 rounded-full transition-colors text-sm sm:text-base ${isSubscribed ? 'bg-neutral-800 text-white hover:bg-neutral-700' : 'bg-white text-black hover:bg-neutral-200'}`}
                 >
                   {isSubscribed ? 'Вы подписаны' : 'Подписаться'}
                 </button>
               )}
             </div>
             
             <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <div className="flex items-center bg-neutral-800 rounded-full overflow-hidden shrink-0">
                  <button 
                    onClick={handleLike} 
                    className={`flex items-center gap-2 px-4 py-2 hover:bg-neutral-700 transition-colors border-r border-neutral-700 ${isLiked ? 'text-blue-400' : 'text-white'}`}
                  >
                     <ThumbsUp className={`w-5 h-5 ${isLiked ? 'fill-blue-400' : ''}`} />
                     {video.likes ? <span className="font-medium">{video.likes.toLocaleString('ru-RU')}</span> : null}
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 hover:bg-neutral-700 transition-colors">
                     <ThumbsUp className="w-5 h-5 rotate-180" />
                  </button>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors font-medium shrink-0">
                   <Share2 className="w-5 h-5" />
                   Поделиться
                </button>
             </div>
          </div>
          
          <div className="bg-neutral-800/50 hover:bg-neutral-800 transition-colors p-4 rounded-xl mt-2 cursor-pointer">
             <div className="font-medium mb-1 text-sm sm:text-base">
                {video.views.toLocaleString('ru-RU')} просмотров • {new Date(video.createdAt).toLocaleDateString('ru-RU')}
             </div>
             <p className="text-neutral-300 whitespace-pre-wrap text-sm sm:text-base">{video.description || 'Нет описания'}</p>
          </div>
          
          {video.id && <CommentsSection videoId={video.id} />}
        </div>
        
        <div className="lg:col-span-1 hidden lg:block">
           <div className="border border-neutral-800 rounded-xl p-4 text-center text-neutral-500 h-full max-h-[600px] flex items-center justify-center">
             Тут будут рекомендации...
           </div>
        </div>
      </div>
    </div>
  );
}
