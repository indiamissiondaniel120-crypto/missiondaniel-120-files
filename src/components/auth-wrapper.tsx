"use client"

import React, { useState, createContext, useContext } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GraduationCap } from 'lucide-react'

interface AuthContextType {
  user: { name: string } | null
  login: (name: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ name: string } | null>(null)

  const login = (name: string) => setUser({ name })
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
  const [name, setName] = useState('')

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
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              placeholder="Enter your registered name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="id">Student ID</Label>
            <Input id="id" type="password" placeholder="••••••••" />
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-lg" 
            onClick={() => name && login(name)}
          >
            Login to Study
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
