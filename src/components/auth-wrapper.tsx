
'use client';

import React, { useState, createContext, useContext, useMemo, useEffect } from 'react';
import { ADMINS } from '@/lib/mock-data';
import { useFirestore, useAuth as useFirebaseAuth } from '@/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface User {
  name: string;
  id: string;
  role: 'student' | 'admin' | 'mentor' | 'public_student' | 'muskhan_student';
  class?: string;
  mentorId?: string;
}

interface AuthContextType {
  user: User | null;
  login: (id: string, password: string, loginType: 'student' | 'admin' | 'mentor', portal?: 'standard' | 'muskhan') => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const db = useFirestore();
  const auth = useFirebaseAuth();
  const { toast } = useToast();

  // Handle automatic anonymous sign-in to satisfy security rules
  useEffect(() => {
    if (auth && !auth.currentUser) {
      signInAnonymously(auth).catch((e: any) => {
        if (e.code === 'auth/admin-restricted-operation') {
          toast({
            variant: "destructive",
            title: "Anonymous Auth Disabled",
            description: "Please enable 'Anonymous' sign-in in your Firebase Console (Build > Authentication > Sign-in method).",
          });
        }
      });
    }
  }, [auth, toast]);

  useEffect(() => {
    if (!user || !db || user.role === 'admin') return;

    const collectionName = (user.role === 'student' || user.role === 'muskhan_student' || user.role === 'public_student') ? 'students' : 'mentors';
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
      async (serverError) => {
        // Handled centrally
      }
    );

    return () => unsubscribe();
  }, [user?.id, db]);

  const login = async (id: string, password: string, loginType: 'student' | 'admin' | 'mentor', portal: 'standard' | 'muskhan' = 'standard') => {
    if (!db || !auth) return { success: false, error: 'Initialization error' };

    if (loginType === 'admin') {
      const found = ADMINS.find((u) => u.id === id && u.password === password);
      if (found) {
        setUser({ name: found.name, id: found.id, role: 'admin' });
        return { success: true };
      }
    } else {
      const coll = loginType === 'student' ? 'students' : 'mentors';
      const docRef = doc(db, coll, id);
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          
          // Role Verification for Portals
          if (loginType === 'student') {
            if (portal === 'standard' && data.role === 'muskhan_student') {
              return { success: false, error: 'Please use the Muskhan portal to login.' };
            }
            if (portal === 'muskhan' && data.role === 'student') {
              return { success: false, error: 'Please use the standard portal to login.' };
            }
          }

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
            const activityData = {
              type: 'login',
              timestamp: serverTimestamp(),
              metadata: { role: data.role || loginType, portal }
            };
            
            addDoc(activityRef, activityData).catch(async (serverError) => {
              errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: activityRef.path,
                operation: 'create',
                requestResourceData: activityData
              }));
            });

            return { success: true };
          }
        }
      } catch (e) {
        return { success: false, error: 'Connection error' };
      }
    }
    return { success: false, error: 'Invalid ID or password' };
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
