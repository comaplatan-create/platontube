import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { checkUnique, createUser, uploadAvatar } from '../lib/db';
import { Upload } from 'lucide-react';

export default function Auth() {
  const { login, user, firebaseUser, setLocalUser } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('@');
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    try {
      setError(null);
      await login();
    } catch (err: any) {
      console.error(err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setError('Окно входа было закрыто. Пожалуйста, попробуйте еще раз и не закрывайте всплывающее окно.');
      } else if (err?.code === 'auth/popup-blocked') {
        setError('Всплывающее окно было заблокировано браузером. Пожалуйста, разрешите всплывающие окна для этого сайта.');
      } else {
        setError('Не удалось войти. Ошибка: ' + (err.message || 'Неизвестная ошибка'));
      }
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarBlob(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    
    setError(null);
    setIsRegistering(true);

    try {
      if (!handle.startsWith('@')) {
        setError('Псевдоним должен начинаться с @');
        setIsRegistering(false);
        return;
      }
      if (handle.length < 3) {
        setError('Псевдоним слишком короткий');
        setIsRegistering(false);
        return;
      }

      const { isUnique, error: uniqueError } = await checkUnique(handle, name);
      if (!isUnique) {
        setError(uniqueError || 'Этот канал или псевдоним уже занят');
        setIsRegistering(false);
        return;
      }

      let avatarUrl = '';
      if (avatarBlob) {
        avatarUrl = await uploadAvatar(handle, avatarBlob);
      }

      const newUser = {
        handle,
        name,
        subscriberCount: 0,
        subscriptions: [],
        uid: firebaseUser.uid,
        ...(avatarUrl ? { avatarUrl } : {})
      };

      await createUser(newUser);
      setLocalUser(newUser);
      navigate('/home');
    } catch (err: any) {
      console.error(err);
      setError('Не удалось создать канал. Ошибка: ' + (err.message || 'Неизвестная ошибка'));
    } finally {
      setIsRegistering(false);
    }
  };

  if (firebaseUser && !user) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 py-12">
        <div className="max-w-md w-full bg-neutral-900 rounded-3xl p-8 shadow-2xl border border-neutral-800 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Создать канал</h2>
          <p className="text-neutral-400 mb-8">Вы вошли как {firebaseUser.email}. Теперь создайте свой канал.</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateChannel} className="space-y-5">
            <div className="flex flex-col items-center justify-center mb-6">
               <div 
                 className="w-24 h-24 rounded-full bg-neutral-800 border-2 border-dashed border-neutral-600 flex items-center justify-center overflow-hidden cursor-pointer relative group"
                 onClick={() => fileInputRef.current?.click()}
               >
                 {avatarPreview ? (
                   <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                 ) : (
                   <Upload className="w-8 h-8 text-neutral-500 group-hover:text-neutral-400 transition-colors" />
                 )}
                 <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-xs text-white">Выбрать</div>
               </div>
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 accept="image/*" 
                 className="hidden" 
                 onChange={handleAvatarChange} 
               />
               <p className="text-xs text-neutral-500 mt-2">Аватарка (необязательно)</p>
            </div>

            <div className="text-left">
              <label className="block text-sm font-medium text-neutral-300 mb-2">Название канала</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                placeholder="Мой крутой канал"
                disabled={isRegistering}
              />
            </div>
            
            <div className="text-left">
              <label className="block text-sm font-medium text-neutral-300 mb-2">Псевдоним</label>
              <input
                type="text"
                value={handle}
                onChange={(e) => {
                   const val = e.target.value;
                   if (val.startsWith('@')) setHandle(val);
                   else setHandle('@' + val.replace('@', ''));
                }}
                required
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                placeholder="@handle"
                disabled={isRegistering}
              />
            </div>

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-4 rounded-xl text-lg shadow-lg transition-all mt-4 disabled:opacity-50"
            >
              {isRegistering ? 'Создание...' : 'Создать канал'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-900 rounded-3xl p-8 shadow-2xl border border-neutral-800 text-center">
        <h2 className="text-3xl font-bold text-white mb-3">Добро пожаловать в PlatonTube</h2>
        <p className="text-neutral-400 mb-8">Войдите в свой аккаунт Google, чтобы продолжить.</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          className="w-full bg-white hover:bg-neutral-200 text-black font-semibold py-4 rounded-xl text-lg shadow-lg transition-all"
        >
          Войти через Google
        </button>
      </div>
    </div>
  );
}
