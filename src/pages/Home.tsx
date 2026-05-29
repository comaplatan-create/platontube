import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { getAllVideos, Video, getUser, User } from '../lib/db';
import { Home as HomeIcon, PlusCircle, Search, User as UserIcon, LogOut, Clapperboard, Settings } from 'lucide-react';
import VideoCard from '../components/VideoCard';
import UploadModal from '../components/UploadModal';

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState<(Video & { author?: User })[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const loadVideos = async () => {
    try {
      const vids = await getAllVideos();
      // Sort by newest first
      vids.sort((a, b) => b.createdAt - a.createdAt);
      
      // Fetch user objects for each video
      const videosWithAuthors = await Promise.all(
        vids.map(async (v) => {
          const author = await getUser(v.handle);
          return { ...v, author };
        })
      );
      
      setVideos(videosWithAuthors);
    } catch (e) {
      console.error('Error loading videos', e);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return null; // Will be redirected by protected route wrapper, but just in case
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 h-16 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold text-lg leading-none perspective-1000">
               <span className="transform rotate-y-12">P</span>
            </div>
            <span className="text-xl font-bold tracking-tight hidden sm:block">PlatonTube</span>
          </div>
        </div>

        <div className="flex-1 max-w-xl px-4 hidden md:block">
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

        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-full text-sm font-medium transition-colors"
          >
            <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
            <span className="hidden sm:block">Создать</span>
          </button>
          
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-neutral-800 rounded-full flex items-center justify-center border border-neutral-700 cursor-pointer group relative">
            <UserIcon className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" />
            <div className="absolute top-full right-0 mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <div className="flex items-center gap-3 mb-4 border-b border-neutral-800 pb-4">
                <Link to={`/channel/${user.handle.replace('@', '')}`} className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-xl font-bold hover:ring-2 hover:ring-white transition-all overflow-hidden relative">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </Link>
                <div>
                  <Link to={`/channel/${user.handle.replace('@', '')}`} className="font-semibold text-white hover:underline">{user.name}</Link>
                  <p className="text-sm text-neutral-400">{user.handle}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-neutral-300 px-2 py-1">Подписчики: <span className="font-semibold text-white">{user.subscriberCount.toLocaleString('ru-RU')}</span></p>
                
                <Link to="/settings" className="w-full flex items-center gap-2 px-2 py-2 text-sm text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors">
                  <Settings className="w-4 h-4" />
                  Настройки
                </Link>

                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-2 py-2 text-sm text-red-400 hover:bg-neutral-800 rounded-lg transition-colors">
                  <LogOut className="w-4 h-4" />
                  Выйти
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-20 lg:w-64 flex-shrink-0 border-r border-neutral-800 bg-neutral-950 py-6 px-3 flex flex-col gap-2">
          <SidebarItem 
            icon={<HomeIcon className="w-6 h-6" />} 
            label="Главная" 
            active={true} 
            onClick={() => {}}
          />
        </aside>

        {/* Main Feed */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-neutral-950">
          {videos.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-500 space-y-4">
              <Clapperboard className="w-16 h-16 opacity-50" />
              <h3 className="text-xl font-medium text-white">Здесь пока ничего нет</h3>
              <p className="text-center max-w-sm">Никто еще не загрузил видео. Будьте первыми!</p>
              <button onClick={() => setIsUploadOpen(true)} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-full font-medium mt-4">
                Загрузить видео
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </main>
      </div>

      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onSuccess={loadVideos} 
      />
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-colors ${active ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'}`}
    >
      <div className={`${active ? 'text-white' : ''}`}>{icon}</div>
      <span className="hidden lg:block font-medium text-sm">{label}</span>
    </button>
  );
}
