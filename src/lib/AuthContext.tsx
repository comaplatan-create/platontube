import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, getUser, getUserByUid } from './db';
import { auth, signInWithGoogle, signOut } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  login: () => Promise<void>; // now using Google Auth
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  setLocalUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  login: async () => {},
  logout: () => {},
  isLoading: true,
  refreshUser: async () => {},
  setLocalUser: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoading(true);
      setFirebaseUser(fbUser);
      if (fbUser) {
        let dbUser = await getUserByUid(fbUser.uid);
        setUser(dbUser || null);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
       await signInWithGoogle();
    } catch (e) {
       console.error("Login failed", e);
       throw e;
    }
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setFirebaseUser(null);
  };

  const refreshUser = async () => {
    if (user) {
        const dbUser = await getUser(user.handle);
        if (dbUser) {
            setUser(dbUser);
        }
    }
  };

  const setLocalUser = (dbUser: User | null) => {
    setUser(dbUser);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, login, logout: handleLogout, isLoading, refreshUser, setLocalUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
