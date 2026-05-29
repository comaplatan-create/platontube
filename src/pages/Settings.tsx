import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { checkUnique, updateUserSettings, changeUserHandle, uploadAvatar } from '../lib/db';
import { Upload, ArrowLeft, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Settings() {
  const { user, firebaseUser, setLocalUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!firebaseUser && !user) {
      navigate('/auth');
    }
  }, [firebaseUser, user, navigate]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setHandle(user.handle);
      setAvatarPreview(user.avatarUrl || null);
    }
  }, [user]);

  if (!user) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarBlob(file);
      setAvatarPreview(URL.createObjectURL(file));
      setError(null);
      setSuccess(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      if (handle !== user.handle) {
        if (!handle.startsWith('@')) {
          setError('Псевдоним должен начинаться с @');
          setIsSaving(false);
          return;
        }
        if (handle.length < 3) {
          setError('Псевдоним слишком короткий');
          setIsSaving(false);
          return;
        }
        
        await changeUserHandle(user.handle, handle, name, avatarBlob, user.subscriptions || [], user.subscriberCount);
        
        // Refresh local user
        setLocalUser({
          ...user,
          handle,
          name,
          avatarUrl: avatarPreview || user.avatarUrl
        });
        
        setSuccess('Профиль успешно обновлен!');
      } else {
        // Just name / avatar change
        let newAvatarUrl = user.avatarUrl;
        if (avatarBlob) {
          newAvatarUrl = await uploadAvatar(user.handle, avatarBlob);
        }
        
        await updateUserSettings(user.handle, {
          name,
          ...(newAvatarUrl ? { avatarUrl: newAvatarUrl } : {})
        });
        
        setLocalUser({
          ...user,
          name,
          ...(newAvatarUrl ? { avatarUrl: newAvatarUrl } : {})
        });
        
        setSuccess('Профиль успешно обновлен!');
      }
    } catch (err: any) {
      console.error(err);
      setError('Не удалось сохранить изменения: ' + (err.message || 'неизвестная ошибка'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl relative">
        <Link to="/home" className="absolute top-8 left-8 text-neutral-400 hover:text-white transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        
        <h2 className="text-3xl font-bold text-center mb-8">Настройки профиля</h2>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-4 rounded-xl mb-6 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex flex-col items-center justify-center mb-8">
             <div 
               className="w-32 h-32 rounded-full bg-neutral-800 border-2 border-dashed border-neutral-600 flex items-center justify-center overflow-hidden cursor-pointer relative group"
               onClick={() => fileInputRef.current?.click()}
             >
               {avatarPreview ? (
                 <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
               ) : (
                 <Upload className="w-8 h-8 text-neutral-500 group-hover:text-neutral-400 transition-colors" />
               )}
               <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-sm font-medium text-white transition-opacity">Изменить</div>
             </div>
             <input 
               type="file" 
               ref={fileInputRef} 
               accept="image/*" 
               className="hidden" 
               onChange={handleAvatarChange} 
             />
             <p className="text-sm text-neutral-500 mt-3">Нажмите, чтобы изменить аватарку</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Название канала</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setSuccess(null); setError(null); }}
              required
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              placeholder="Мой крутой канал"
              disabled={isSaving}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">Псевдоним</label>
            <input
              type="text"
              value={handle}
              onChange={(e) => {
                 const val = e.target.value;
                 if (val.startsWith('@')) setHandle(val);
                 else setHandle('@' + val.replace('@', ''));
                 setSuccess(null); setError(null);
              }}
              required
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              placeholder="@handle"
              disabled={isSaving}
            />
            <p className="text-xs text-neutral-500 mt-2">Внимание: изменение псевдонима может занять некоторое время</p>
          </div>

          <div>
             <label className="block text-sm font-medium text-neutral-300 mb-2">Оформление</label>
             <button
               type="button"
               onClick={toggleTheme}
               className="w-full flex items-center justify-between bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-xl px-4 py-3 text-white transition-all"
             >
               <span className="flex items-center gap-2">
                 {theme === 'dark' ? <Moon className="w-5 h-5 text-neutral-400" /> : <Sun className="w-5 h-5 text-yellow-500" />}
                 {theme === 'dark' ? 'Темная тема' : 'Светлая тема'}
               </span>
               <span className="text-xs text-neutral-400 border border-neutral-600 rounded bg-neutral-900 px-2 py-1">Сменить</span>
             </button>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-white hover:bg-neutral-200 text-black font-semibold py-4 rounded-xl text-lg shadow-lg transition-all mt-8 disabled:opacity-50"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </form>
      </div>
    </div>
  );
}
