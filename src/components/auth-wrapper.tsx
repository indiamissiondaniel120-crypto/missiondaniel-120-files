
"use client"

import React, { useState, createContext, useContext, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { GraduationCap, AlertCircle, ShieldCheck, Loader2, UserRound } from 'lucide-react'
import { ADMINS } from '@/lib/mock-data'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useFirestore } from '@/firebase'
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors'

interface User {
  name: string
  id: string
  role: 'student' | 'admin' | 'mentor'
  class?: string
  schoolName?: string
  location?: string
}

interface AuthContextType {
  user: User | null
  login: (id: string, password: string, loginType: 'student' | 'admin' | 'mentor') => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const db = useFirestore()

  const login = async (id: string, password: string, loginType: 'student' | 'admin' | 'mentor') => {
    if (!db) return false

    if (loginType === 'admin') {
      const found = ADMINS.find(u => u.id === id && u.password === password)
      if (found) {
        setUser({ 
          name: found.name, 
          id: found.id, 
          role: 'admin' 
        })
        return true
      }
    } else if (loginType === 'mentor') {
      const mentorDocRef = doc(db, 'mentors', id)
      try {
        const snap = await getDoc(mentorDocRef)
        if (snap.exists()) {
          const data = snap.data()
          if (data.password === password) {
            setUser({
              name: data.name,
              id: id,
              role: 'mentor'
            })
            return true
          }
        }
      } catch (e: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: mentorDocRef.path, operation: 'get' }));
        return false
      }
    } else {
      const studentDocRef = doc(db, 'students', id)
      try {
        const snap = await getDoc(studentDocRef)
        if (snap.exists()) {
          const data = snap.data()
          if (data.password === password) {
            setUser({
              name: data.name,
              id: id,
              role: 'student',
              class: data.class,
              schoolName: data.schoolName,
              location: data.location
            })
            
            addDoc(collection(db, 'students', id, 'activity'), {
              type: 'login',
              timestamp: serverTimestamp(),
              metadata: { device: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown' }
            })

            return true
          }
        }
      } catch (e: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: studentDocRef.path, operation: 'get' }));
        return false
      }
    }
    return false
  }

  const logout = () => {
    if (user && user.role === 'student' && db) {
       addDoc(collection(db, 'students', user.id, 'activity'), {
        type: 'logout',
        timestamp: serverTimestamp()
      })
    }
    setUser(null)
  }

  const value = useMemo(() => ({ user, login, logout }), [user, db])

  return (
    <AuthContext.Provider value={value}>
      {user ? children : <LoginScreen />}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

function LoginScreen() {
  const { login } = useAuth()
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'student' | 'admin' | 'mentor'>('student')

  const handleLogin = async () => {
    setError(null)
    if (!id || !password) {
      setError('Please fill in all fields.')
      return
    }

    setLoading(true)
    try {
      const success = await login(id, password, activeTab)
      if (!success) {
        setError(`Invalid Credentials for ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}.`)
      }
    } catch (err) {
      setError('An error occurred during login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-xl overflow-hidden">
        <div className={`h-2 ${activeTab === 'admin' ? 'bg-accent' : activeTab === 'mentor' ? 'bg-orange-500' : 'bg-primary'}`} />
        <CardHeader className="text-center space-y-2 pb-2">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-2 ${
            activeTab === 'admin' ? 'bg-accent/10 text-accent' : 
            activeTab === 'mentor' ? 'bg-orange-100 text-orange-600' : 
            'bg-primary/10 text-primary'
          }`}>
            {activeTab === 'admin' ? <ShieldCheck size={40} /> : activeTab === 'mentor' ? <UserRound size={40} /> : <GraduationCap size={40} />}
          </div>
          <CardTitle className={`text-3xl font-bold tracking-tight ${
            activeTab === 'admin' ? 'text-accent' : 
            activeTab === 'mentor' ? 'text-orange-600' : 
            'text-primary'
          }`}>
            DANIEL 120
          </CardTitle>
          <CardDescription className="text-muted-foreground italic">"Uplifting students, shaping futures"</CardDescription>
        </CardHeader>
        
        <Tabs defaultValue="student" className="w-full" onValueChange={(v) => setActiveTab(v as any)}>
          <div className="px-6 pb-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="mentor">Mentor</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="space-y-4 pt-4">
            {error && (
              <Alert variant="destructive" className="py-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="loginId">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} ID</Label>
              <Input 
                id="loginId" 
                placeholder={`Enter your ${activeTab} ID`} 
                value={id} 
                onChange={(e) => setId(e.target.value)} 
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className={`w-full py-6 text-lg text-white ${
                activeTab === 'admin' ? 'bg-accent hover:bg-accent/90' : 
                activeTab === 'mentor' ? 'bg-orange-500 hover:bg-orange-600' : 
                'bg-primary hover:bg-primary/90'
              }`} 
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : `Login as ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
            </Button>
          </CardFooter>
        </Tabs>
      </Card>
    </div>
  )
}
