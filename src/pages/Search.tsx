import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { searchVideos, searchUsers, getUser, User, Video } from '../lib/db';
import { ArrowLeft, Search as SearchIcon, CheckCircle } from 'lucide-react';
import VideoCard from '../components/VideoCard';

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();

  const [videos, setVideos] = useState<(Video & { author?: User })[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const doSearch = async () => {
      setIsLoading(true);
      try {
        if (query.trim()) {
          const [foundUsers, foundVideos] = await Promise.all([
            searchUsers(query),
            searchVideos(query)
          ]);

          const videosWithAuthors = await Promise.all(
            foundVideos.map(async (v) => {
              const author = await getUser(v.handle);
              return { ...v, author };
            })
          );
          
          videosWithAuthors.sort((a, b) => b.createdAt - a.createdAt);

          setUsers(foundUsers);
          setVideos(videosWithAuthors);
        } else {
          setUsers([]);
          setVideos([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    doSearch();
  }, [query]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      <header className="sticky top-0 z-50 h-16 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 flex items-center px-4 sm:px-6 justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/home')} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-neutral-300" />
          </button>
          <Link to="/home" className="font-semibold text-lg hidden sm:block hover:text-red-500 transition-colors">PlatonTube</Link>
        </div>

        <div className="flex-1 max-w-xl">
          <form 
            onSubmit={(e) => { 
              e.preventDefault(); 
              const q = new FormData(e.currentTarget).get('q'); 
              if (q) navigate(`/search?q=${encodeURIComponent(q.toString())}`); 
            }} 
            className="flex items-center bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2 focus-within:border-neutral-600 focus-within:bg-neutral-950 transition-colors"
          >
            <input name="q" defaultValue={query} type="text" placeholder="Введите запрос..." className="bg-transparent border-none outline-none flex-1 text-sm text-neutral-200 placeholder-neutral-500" />
            <button type="submit"><SearchIcon className="w-4 h-4 text-neutral-500 hover:text-white transition-colors cursor-pointer" /></button>
          </form>
        </div>
        <div className="w-10"></div> {/* Spacer for centering */}
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl mx-auto w-full">
        <h2 className="text-xl font-semibold mb-6">Результаты по запросу: {query}</h2>

        {isLoading ? (
          <div className="text-neutral-400">Поиск...</div>
        ) : (users.length === 0 && videos.length === 0) ? (
          <div className="text-center text-neutral-500 py-12">
            <SearchIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg">Ничего не найдено</p>
            <p className="text-sm mt-1">Попробуйте ввести другие ключевые слова</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Users section */}
            {users.length > 0 && (
              <div>
                <h3 className="text-neutral-400 text-sm font-medium mb-4 uppercase tracking-wider">Каналы</h3>
                <div className="flex flex-col gap-4">
                  {users.map(u => (
                    <Link key={u.handle} to={`/channel/${u.handle.replace('@', '')}`} className="flex items-center gap-4 p-4 rounded-xl hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-colors">
                      <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-2xl flex-shrink-0 overflow-hidden">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          u.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg flex items-center gap-1.5">
                          {u.name}
                          {u.handle.toLowerCase() === '@platontube' && (
                            <CheckCircle className="w-4 h-4 fill-neutral-400 text-neutral-900" />
                          )}
                        </h4>
                        <p className="text-neutral-400 text-sm">{u.handle} • {u.subscriberCount.toLocaleString('ru-RU')} подписчиков</p>
                      </div>
                      <button className="bg-neutral-800 hover:bg-neutral-700 font-medium px-4 py-2 rounded-full transition-colors h-fit">
                        Перейти
                      </button>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Videos section */}
            {videos.length > 0 && (
              <div>
                <h3 className="text-neutral-400 text-sm font-medium mb-4 uppercase tracking-wider">Видео</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {videos.map(video => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
