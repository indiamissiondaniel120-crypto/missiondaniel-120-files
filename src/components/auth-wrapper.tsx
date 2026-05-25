
'use client';

import React, { useState, createContext, useContext, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GraduationCap, AlertCircle, ShieldCheck, Loader2, UserRound } from 'lucide-react';
import { ADMINS } from '@/lib/mock-data';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFirestore } from '@/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface User {
  name: string;
  id: string;
  role: 'student' | 'admin' | 'mentor' | 'public_student';
  class?: string;
  mentorId?: string;
}

interface AuthContextType {
  user: User | null;
  login: (id: string, password: string, loginType: 'student' | 'admin' | 'mentor') => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const db = useFirestore();

  useEffect(() => {
    if (!user || !db || user.role === 'admin') return;

    const collectionName = user.role.includes('student') ? 'students' : 'mentors';
    const docRef = doc(db, collectionName, user.id);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUser((prev) => prev ? { ...prev, name: data.name, class: data.class, role: data.role || prev.role } : null);
      }
    });

    return () => unsubscribe();
  }, [user?.id, db]);

  const login = async (id: string, password: string, loginType: 'student' | 'admin' | 'mentor') => {
    if (!db) return false;

    if (loginType === 'admin') {
      const found = ADMINS.find((u) => u.id === id && u.password === password);
      if (found) {
        setUser({ name: found.name, id: found.id, role: 'admin' });
        return true;
      }
    } else {
      const coll = loginType === 'student' ? 'students' : 'mentors';
      const docRef = doc(db, coll, id);
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.password === password || loginType === 'student' && data.role === 'public_student') {
            const userData: User = { name: data.name, id, role: data.role || loginType, class: data.class };
            setUser(userData);
            
            // Log attendance
            addDoc(collection(db, coll, id, 'activity'), {
              type: 'login',
              timestamp: serverTimestamp(),
              metadata: { role: data.role || loginType }
            });

            return true;
          }
        }
      } catch (e) {
        return false;
      }
    }
    return false;
  };

  const logout = () => setUser(null);
  const value = useMemo(() => ({ user, login, logout }), [user, db]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
