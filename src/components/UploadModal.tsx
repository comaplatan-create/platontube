import React, { useState, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { addVideo } from '../lib/db';
import { X, UploadCloud, Image as ImageIcon, Video as VideoIcon, Loader2 } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(Infinity);
  
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !user) return null;

  const handleThumbnailDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setThumbnailFile(file);
        setThumbnailPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleVideoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !videoFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setTimeRemaining(Infinity);
    try {
      await addVideo({
        handle: user.handle,
        title: title.trim(),
        description: description.trim(),
        thumbnailBlob: thumbnailFile || undefined,
        videoBlob: videoFile,
        type: 'video',
        createdAt: Date.now(),
        views: 0,
      }, (event) => {
        setUploadProgress(event.progress);
        setTimeRemaining(event.timeRemaining);
      });

      // Special prompt requirement log
      console.log(`Пользователь (канал: ${user.name}) опубликовал (видео)`);

      onSuccess();
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setThumbnailFile(null);
      setThumbnailPreview('');
      setVideoFile(null);
    } catch (e: any) {
      console.error(e);
      alert('Ошибка при загрузке видео: ' + (e.message || 'неизвестная ошибка'));
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds === Infinity || isNaN(seconds) || seconds < 0) return 'вычисление...';
    if (seconds < 60) return `${Math.ceil(seconds)} сек`;
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.ceil(seconds % 60);
    
    if (h > 0) {
      return `${h} ч ${m} мин ${s} сек`;
    }
    return `${m} мин ${s} сек`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 my-8">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10 rounded-t-2xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UploadCloud className="text-red-500" />
            Загрузка видео
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isUploading ? (
          <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-16 h-16 text-red-500 animate-spin mb-6" />
            <h3 className="text-2xl font-bold text-white mb-2">Загрузка видео...</h3>
            <p className="text-neutral-400 mb-8 max-w-sm text-center">
              {uploadProgress === 0 ? 'Подготовка файла (для больших видео это может занять несколько минут)...' : 'Пожалуйста, не закрывайте это окно. Идет процесс загрузки файла.'}
            </p>
            
            <div className="w-full max-w-md bg-neutral-800 rounded-full h-3 overflow-hidden mb-3">
              <div 
                className="bg-red-500 h-full transition-all duration-300 rounded-full" 
                style={{ width: `${Math.round(uploadProgress)}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between w-full max-w-md text-sm text-neutral-400 font-medium">
              <span>{Math.round(uploadProgress)}%</span>
              <span>Осталось: {formatTime(timeRemaining)}</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Название (обязательно)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all font-medium"
                placeholder="Добавьте название, которое привлечет зрителей"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all resize-none"
                placeholder="Расскажите, о чем ваше видео"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Видео файл (обязательно)</label>
                <div 
                  className={`border-2 border-dashed ${videoFile ? 'border-red-500 bg-red-500/5' : 'border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800'} rounded-xl p-4 text-center cursor-pointer transition-all aspect-video flex flex-col items-center justify-center`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleVideoDrop}
                  onClick={() => videoInputRef.current?.click()}
                >
                  <VideoIcon className={`w-8 h-8 mb-2 ${videoFile ? 'text-red-500' : 'text-neutral-500'}`} />
                  {videoFile ? (
                    <span className="text-white text-sm font-medium break-all">{videoFile.name}</span>
                  ) : (
                    <span className="text-neutral-400 text-sm">Перетащите видео сюда или нажмите для выбора</span>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="video/*" 
                  className="hidden" 
                  ref={videoInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setVideoFile(file);
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">Обложка (необязательно)</label>
                <div 
                  className="border-2 border-dashed border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800 rounded-xl p-4 text-center cursor-pointer transition-all aspect-video flex flex-col items-center justify-center relative overflow-hidden"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleThumbnailDrop}
                  onClick={() => thumbnailInputRef.current?.click()}
                >
                  {thumbnailPreview ? (
                    <img src={thumbnailPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 mb-2 text-neutral-500" />
                      <span className="text-neutral-400 text-sm">Перетащите картинку сюда или нажмите</span>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={thumbnailInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setThumbnailFile(file);
                      setThumbnailPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-neutral-800 sticky bottom-0 bg-neutral-900 pb-2">
            <button
              type="submit"
              disabled={isUploading || !title.trim() || !videoFile}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium py-3 px-8 rounded-full transition-all"
            >
              {isUploading ? 'Загрузка...' : 'Опубликовать'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
