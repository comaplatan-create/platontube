import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6 sm:p-12 font-sans overflow-hidden">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight">
              PlatonTube - <br className="hidden sm:block" />
              <span className="text-red-500">Будущее</span> для хостинга видео!
            </h1>
            <p className="text-lg sm:text-xl text-neutral-400 max-w-lg leading-relaxed">
              Смотрите видео без рекламы, выкладывайте свои, получайте новых подписчиков. <br className="hidden sm:block" />
              <strong className="text-white font-medium">Никакой подписки, всё в бесплатном доступе!</strong>
            </p>
          </div>
          
          <div>
            <button 
              onClick={() => navigate('/auth')}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold py-4 px-10 rounded-full text-lg shadow-lg shadow-red-600/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
            >
              <Play className="w-6 h-6 fill-white" />
              Продолжить
            </button>
          </div>
        </div>

        <div className="relative flex justify-center items-center h-[400px] lg:h-[600px] perspective-1000">
          {/* Soft red glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-red-600/30 blur-[100px] rounded-full pointer-events-none"></div>
          
          {/* 3D Cube with P */}
          <div className="relative w-48 h-48 sm:w-64 sm:h-64 animate-spin-slow preserve-3d group">
            {/* Front */}
            <div className="absolute inset-0 bg-red-600/80 border-2 border-red-400 backdrop-blur-sm rounded-2xl flex items-center justify-center transform translate-z-32 shadow-[0_0_50px_rgba(220,38,38,0.5)]">
               <span className="text-8xl sm:text-9xl font-black text-white filter drop-shadow-md">P</span>
            </div>
            {/* Back */}
            <div className="absolute inset-0 bg-red-700/60 border-2 border-red-500 backdrop-blur-sm rounded-2xl transform -translate-z-32 rotate-y-180"></div>
            {/* Right */}
            <div className="absolute inset-0 bg-red-600/70 border-2 border-red-500 backdrop-blur-sm rounded-2xl transform translate-x-32 rotate-y-90"></div>
            {/* Left */}
            <div className="absolute inset-0 bg-red-600/70 border-2 border-red-500 backdrop-blur-sm rounded-2xl transform -translate-x-32 -rotate-y-90"></div>
            {/* Top */}
            <div className="absolute inset-0 bg-red-500/70 border-2 border-red-400 backdrop-blur-sm rounded-2xl transform -translate-y-32 rotate-x-90"></div>
            {/* Bottom */}
            <div className="absolute inset-0 bg-red-800/70 border-2 border-red-600 backdrop-blur-sm rounded-2xl transform translate-y-32 -rotate-x-90 shadow-2xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
