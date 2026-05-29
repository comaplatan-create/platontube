import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { getVideosByHandle, getUser, User, Video, deleteVideo, toggleSubscribe } from '../lib/db';
import { ArrowLeft, User as UserIcon, Search, CheckCircle } from 'lucide-react';
import VideoCard from '../components/VideoCard';

export default function Channel() {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const { user: currentUser, refreshUser } = useAuth();
  
  const [channelUser, setChannelUser] = useState<User | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isManaging, setIsManaging] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const loadChannelData = async () => {
    if (!handle) return;
    setIsLoading(true);
    try {
      const queryHandle = handle.startsWith('@') ? handle : `@${handle}`;
      const u = await getUser(queryHandle);
      if (u) {
        setChannelUser(u);
        if (currentUser) {
          setIsSubscribed(currentUser.subscriptions?.includes(u.handle) || false);
        }
        const vids = await getVideosByHandle(queryHandle);
        vids.sort((a, b) => b.createdAt - a.createdAt);
        setVideos(vids);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChannelData();
  }, [handle, currentUser]);

  const handleDelete = async (id: string | number) => {
    if (window.confirm('Вы уверены, что хотите удалить это видео? Это действие нельзя отменить.')) {
      try {
        await deleteVideo(id);
        setVideos(prev => prev.filter(v => v.id !== id));
      } catch (e) {
        console.error('Failed to delete video', e);
        alert('Ошибка при удалении видео.');
      }
    }
  };

  const handleSubscribe = async () => {
    if (!currentUser || !channelUser) return;
    const newSubState = await toggleSubscribe(currentUser.handle, channelUser.handle);
    setIsSubscribed(newSubState);
    setChannelUser(prev => prev ? { ...prev, subscriberCount: Math.max(0, prev.subscriberCount + (newSubState ? 1 : -1)) } : null);
    refreshUser();
  };

  if (isLoading) {
    return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Загрузка...</div>;
  }

  if (!channelUser) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
        <h2 className="text-2xl font-bold mb-4">Канал не найден</h2>
        <button onClick={() => navigate('/home')} className="text-blue-500 hover:underline">Вернуться на главную</button>
      </div>
    );
  }

  const regularVideos = videos.filter(v => v.type === 'video');

  const isOwner = currentUser?.handle === channelUser.handle;

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 h-16 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 flex items-center px-4 sm:px-6 justify-between gap-4">
        <div className="flex items-center">
          <button onClick={() => navigate('/home')} className="p-2 hover:bg-neutral-800 rounded-full transition-colors mr-4">
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

      <div className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto">
        {/* Channel Banner & Info */}
        <div className="w-full">
          <div className="h-32 sm:h-48 md:h-64 bg-neutral-900 overflow-hidden relative">
             <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
             <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 to-transparent" />
          </div>
          
          <div className="px-4 sm:px-8 md:px-12 pb-8 flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-16 sm:-mt-24 relative z-10 text-center sm:text-left">
            <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-neutral-800 border-4 border-neutral-950 flex items-center justify-center text-4xl sm:text-6xl font-bold overflow-hidden shadow-xl shrink-0 relative">
               {channelUser.avatarUrl ? (
                 <img src={channelUser.avatarUrl} alt={channelUser.name} className="w-full h-full object-cover" />
               ) : (
                 channelUser.name.charAt(0).toUpperCase()
               )}
            </div>
            
            <div className="flex-1 pb-4">
              <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight flex items-center justify-center sm:justify-start gap-3">
                {channelUser.name}
                {channelUser.handle.toLowerCase() === '@platontube' && (
                  <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 fill-neutral-400 text-neutral-900" />
                )}
              </h1>
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-4 mt-2 text-neutral-400 font-medium">
                <span>{channelUser.handle}</span>
                <span className="hidden sm:inline">•</span>
                <span>{channelUser.subscriberCount.toLocaleString('ru-RU')} подписчиков</span>
                <span className="hidden sm:inline">•</span>
                <span>{videos.length} видео</span>
              </div>
            </div>
            
            <div className="pb-4">
              {isOwner ? (
                <button 
                  onClick={() => setIsManaging(!isManaging)}
                  className={`${isManaging ? 'bg-red-600 hover:bg-red-500' : 'bg-neutral-800 hover:bg-neutral-700'} text-white font-medium py-2.5 px-6 rounded-full transition-colors`}
                >
                  {isManaging ? 'Готово' : 'Управление видео'}
                </button>
              ) : (
                <button 
                  onClick={handleSubscribe}
                  className={`font-medium py-2.5 px-6 rounded-full transition-colors mb-2 ${isSubscribed ? 'bg-neutral-800 hover:bg-neutral-700 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
                >
                  {isSubscribed ? 'Вы подписаны' : 'Подписаться'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-8 md:p-12">
          {regularVideos.length === 0 ? (
            <div className="text-center text-neutral-500 py-20">
              <p>На этом канале пока нет видео.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {regularVideos.map(video => (
                <VideoCard key={video.id} video={{...video, author: channelUser}} isManaging={isManaging} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
