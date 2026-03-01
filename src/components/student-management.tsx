"use client"

import React, { useState, useMemo } from 'react'
import { useFirestore } from '@/firebase'
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCollection } from '@/firebase'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserPlus, Users, School, MapPin } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors'

export function StudentManagement() {
  const db = useFirestore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    password: '',
    name: '',
    schoolName: '',
    location: '',
    class: ''
  })

  // Memoize the collection reference to prevent infinite loops in useCollection
  const studentsQuery = useMemo(() => {
    return db ? collection(db, 'students') : null
  }, [db])

  const { data: students } = useCollection(studentsQuery)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db) return
    
    if (!formData.id || !formData.password || !formData.name || !formData.class) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please fill in all required fields."
      })
      return
    }

    setLoading(true)
    const studentDocRef = doc(db, 'students', formData.id)
    const dataToSave = {
      ...formData,
      createdAt: serverTimestamp()
    }

    setDoc(studentDocRef, dataToSave)
      .then(() => {
        toast({
          title: "Student Registered",
          description: `${formData.name} has been added successfully.`
        })
        setFormData({
          id: '',
          password: '',
          name: '',
          schoolName: '',
          location: '',
          class: ''
        })
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: studentDocRef.path,
          operation: 'create',
          requestResourceData: dataToSave,
        } satisfies SecurityRuleContext);

        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-accent">
              <UserPlus className="h-5 w-5" />
              Register New Student
            </CardTitle>
            <CardDescription>Add a student to the DANIEL 120 database.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="s_id">Student ID (Username)</Label>
                <Input 
                  id="s_id" 
                  placeholder="e.g. D120-2024-001" 
                  value={formData.id}
                  onChange={(e) => setFormData({...formData, id: e.target.value})}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s_pass">Password</Label>
                <Input 
                  id="s_pass" 
                  type="password" 
                  placeholder="Create a password" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s_name">Full Name</Label>
                <Input 
                  id="s_name" 
                  placeholder="Student's Name" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s_class">Class / Stream</Label>
                <Select onValueChange={(v) => setFormData({...formData, class: v})} value={formData.class} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class-9">Class 9</SelectItem>
                    <SelectItem value="class-10">Class 10</SelectItem>
                    <SelectItem value="class-11">Class 11</SelectItem>
                    <SelectItem value="class-12">Class 12</SelectItem>
                    <SelectItem value="neet">NEET</SelectItem>
                    <SelectItem value="jee">JEE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="s_school">School Name</Label>
                <Input 
                  id="s_school" 
                  placeholder="School Name" 
                  value={formData.schoolName}
                  onChange={(e) => setFormData({...formData, schoolName: e.target.value})}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s_loc">Location</Label>
                <Input 
                  id="s_loc" 
                  placeholder="City, State" 
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : "Add Student"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Registered Students
              </div>
              <div className="text-sm font-normal text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {students?.length || 0} Total
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students && students.length > 0 ? (
                    students.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="font-bold">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.id}</div>
                        </TableCell>
                        <TableCell>
                          <span className="capitalize">{s.class?.replace('-', ' ') || 'N/A'}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <School size={14} className="text-muted-foreground" />
                            {s.schoolName || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin size={14} className="text-muted-foreground" />
                            {s.location || 'N/A'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        No students registered yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("animate-spin", className)}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}
