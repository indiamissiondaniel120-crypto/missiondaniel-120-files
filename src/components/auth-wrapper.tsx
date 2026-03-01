"use client"

import React, { useState, createContext, useContext } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GraduationCap, AlertCircle } from 'lucide-react'
import { STUDENTS } from '@/lib/mock-data'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AuthContextType {
  user: { name: string; id: string } | null
  login: (studentId: string, password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ name: string; id: string } | null>(null)

  const login = (studentId: string, password: string) => {
    const student = STUDENTS.find(s => s.id === studentId && s.password === password)
    if (student) {
      setUser({ name: student.name, id: student.id })
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
  const [studentId, setStudentId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleLogin = () => {
    setError(null)
    if (!studentId || !password) {
      setError('Please fill in all fields.')
      return
    }

    const success = login(studentId, password)
    if (!success) {
      setError('Invalid Student ID or Password. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-xl overflow-hidden">
        <div className="h-2 bg-primary" />
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center text-primary mb-2">
            <GraduationCap size={40} />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">DANIEL 120</CardTitle>
          <CardDescription className="text-muted-foreground italic">"Uplifting students, shaping futures"</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" className="py-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="studentId">Student ID</Label>
            <Input 
              id="studentId" 
              placeholder="e.g. D120-001" 
              value={studentId} 
              onChange={(e) => setStudentId(e.target.value)} 
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
            className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-lg" 
            onClick={handleLogin}
          >
            Login to Study
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
