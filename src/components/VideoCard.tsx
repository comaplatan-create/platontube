import React, { useMemo } from 'react';
import { Video, User } from '../lib/db';
import { Play, Trash2, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function VideoCard({ video, isManaging, onDelete }: { video: Video & { author?: User }, isManaging?: boolean, onDelete?: (id: string | number) => void }) {
  const navigate = useNavigate();
  const thumbnailSrc = useMemo(() => {
    if (video.thumbnailUrl) return video.thumbnailUrl;
    if (video.thumbnailBlob) return URL.createObjectURL(video.thumbnailBlob);
    return null;
  }, [video.thumbnailBlob, video.thumbnailUrl]);

  return (
    <div className="flex flex-col gap-3 group cursor-pointer relative" onClick={() => !isManaging && navigate(`/watch/${video.id}`)}>
      {isManaging && onDelete && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(video.id!); }}
          className="absolute z-10 top-2 right-2 p-2 bg-red-600/90 hover:bg-red-500 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all shadow-lg backdrop-blur-md"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}
      <div className={`relative aspect-video rounded-xl bg-neutral-800 overflow-hidden border ${isManaging ? 'border-red-500/50' : 'border-neutral-800 group-hover:border-neutral-700'} transition-colors`}>
         {thumbnailSrc ? (
           <img src={thumbnailSrc} alt={video.title} className="w-full h-full object-cover" />
         ) : (
           <div className="w-full h-full flex items-center justify-center bg-neutral-900 group-hover:bg-neutral-800 transition-colors">
              <Play className="w-12 h-12 text-neutral-600 group-hover:text-red-500 transition-colors" />
           </div>
         )}
         <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 text-xs font-medium rounded-md">
           10:00
         </div>
      </div>
      <div className="flex gap-3">
        {video.author ? (
          <Link to={`/channel/${video.author.handle.replace('@', '')}`} onClick={(e) => e.stopPropagation()} className="w-10 h-10 rounded-full bg-neutral-800 flex-shrink-0 flex items-center justify-center font-bold text-neutral-400 overflow-hidden hover:ring-2 hover:ring-neutral-600 outline-none transition-all relative">
            {video.author.avatarUrl ? (
              <img src={video.author.avatarUrl} alt={video.author.name} className="w-full h-full object-cover" />
            ) : (
              video.author.name.charAt(0).toUpperCase()
            )}
          </Link>
        ) : (
          <div className="w-10 h-10 rounded-full bg-neutral-800 flex-shrink-0 flex items-center justify-center font-bold text-neutral-400 overflow-hidden">
            ?
          </div>
        )}
        <div className="flex flex-col">
          <h3 className="font-semibold text-white line-clamp-2 leading-tight group-hover:text-red-400 transition-colors">{video.title}</h3>
          
          {video.author ? (
            <Link to={`/channel/${video.author.handle.replace('@', '')}`} onClick={(e) => e.stopPropagation()} className="text-sm text-neutral-400 mt-1 hover:text-white transition-colors w-max flex items-center gap-1">
              {video.author.name}
              {video.author.handle.toLowerCase() === '@platontube' && (
                <CheckCircle className="w-3.5 h-3.5 fill-neutral-400 text-neutral-900" />
              )}
            </Link>
          ) : (
            <p className="text-sm text-neutral-400 mt-1">{video.handle}</p>
          )}

          <div className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
            <span>{video.views.toLocaleString('ru-RU')} просмотров</span>
            <span>•</span>
            <span>{new Date(video.createdAt).toLocaleDateString('ru-RU')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
