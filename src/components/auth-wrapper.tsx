
'use client';

import React, { useState, createContext, useContext, useMemo, useEffect } from 'react';
import { ADMINS } from '@/lib/mock-data';
import { useFirestore, useAuth as useFirebaseAuth } from '@/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

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
  const auth = useFirebaseAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !db || user.role === 'admin') return;

    const collectionName = user.role.includes('student') ? 'students' : 'mentors';
    const docRef = doc(db, collectionName, user.id);

    const unsubscribe = onSnapshot(
      docRef, 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUser((prev) => prev ? { 
            ...prev, 
            name: data.name, 
            class: data.class, 
            mentorId: data.mentorId,
            role: data.role || prev.role 
          } : null);
        }
      },
      (error) => {
        // Silent fail for background sync
      }
    );

    return () => unsubscribe();
  }, [user?.id, db]);

  const login = async (id: string, password: string, loginType: 'student' | 'admin' | 'mentor') => {
    if (!db || !auth) return false;

    // Ensure we are signed into Firebase Auth so security rules (request.auth != null) work
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (e: any) {
        if (e.code === 'auth/admin-restricted-operation') {
          toast({
            variant: "destructive",
            title: "Authentication Setup Required",
            description: "Please enable 'Anonymous' sign-in in your Firebase Console for the chat features to work.",
          });
        }
      }
    }

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
          // For students, check password. For public students, they might not have one but are already in the DB.
          if (data.password === password || (loginType === 'student' && data.role === 'public_student')) {
            const userData: User = { 
              name: data.name, 
              id, 
              role: data.role || loginType, 
              class: data.class,
              mentorId: data.mentorId 
            };
            setUser(userData);
            
            // Log attendance (Non-blocking)
            const activityRef = collection(db, coll, id, 'activity');
            addDoc(activityRef, {
              type: 'login',
              timestamp: serverTimestamp(),
              metadata: { role: data.role || loginType }
            }).catch(() => {
              // Silently fail if rules block initial write before anonymous auth finishes
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
  const value = useMemo(() => ({ user, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
