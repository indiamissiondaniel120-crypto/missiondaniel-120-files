"use client"

import React, { useState, createContext, useContext } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { GraduationCap, AlertCircle, ShieldCheck } from 'lucide-react'
import { STUDENTS, ADMINS } from '@/lib/mock-data'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface User {
  name: string
  id: string
  role: 'student' | 'admin'
}

interface AuthContextType {
  user: User | null
  login: (id: string, password: string, isAdmin: boolean) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const login = (id: string, password: string, isAdmin: boolean) => {
    const list = isAdmin ? ADMINS : STUDENTS
    const found = list.find(u => u.id === id && u.password === password)
    
    if (found) {
      setUser({ 
        name: found.name, 
        id: found.id, 
        role: isAdmin ? 'admin' : 'student' 
      })
      return true
    }
    return false
  }

  const logout = () => setUser(null)

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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
  const [activeTab, setActiveTab] = useState<'student' | 'admin'>('student')

  const handleLogin = () => {
    setError(null)
    if (!id || !password) {
      setError('Please fill in all fields.')
      return
    }

    const success = login(id, password, activeTab === 'admin')
    if (!success) {
      setError(`Invalid ${activeTab === 'admin' ? 'Admin' : 'Student'} ID or Password.`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-xl overflow-hidden">
        <div className={`h-2 ${activeTab === 'admin' ? 'bg-accent' : 'bg-primary'}`} />
        <CardHeader className="text-center space-y-2 pb-2">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-2 ${activeTab === 'admin' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
            {activeTab === 'admin' ? <ShieldCheck size={40} /> : <GraduationCap size={40} />}
          </div>
          <CardTitle className={`text-3xl font-bold tracking-tight ${activeTab === 'admin' ? 'text-accent' : 'text-primary'}`}>
            DANIEL 120
          </CardTitle>
          <CardDescription className="text-muted-foreground italic">"Uplifting students, shaping futures"</CardDescription>
        </CardHeader>
        
        <Tabs defaultValue="student" className="w-full" onValueChange={(v) => setActiveTab(v as any)}>
          <div className="px-6 pb-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="student">Student Login</TabsTrigger>
              <TabsTrigger value="admin">Admin Login</TabsTrigger>
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
              <Label htmlFor="loginId">{activeTab === 'admin' ? 'Admin ID' : 'Student ID'}</Label>
              <Input 
                id="loginId" 
                placeholder={activeTab === 'admin' ? 'Enter admin username' : 'e.g. D120-001'} 
                value={id} 
                onChange={(e) => setId(e.target.value)} 
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
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className={`w-full py-6 text-lg text-white ${activeTab === 'admin' ? 'bg-accent hover:bg-accent/90' : 'bg-primary hover:bg-primary/90'}`} 
              onClick={handleLogin}
            >
              Login as {activeTab === 'admin' ? 'Admin' : 'Student'}
            </Button>
          </CardFooter>
        </Tabs>
      </Card>
    </div>
  )
}
