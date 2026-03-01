
"use client"

import React, { useState, useMemo } from 'react'
import { useFirestore } from '@/firebase'
import { collection, doc, setDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCollection } from '@/firebase'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserPlus, Users, School, MapPin, Activity, Clock, FileText, PlayCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

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
                {loading ? <Activity className="animate-spin" /> : "Add Student"}
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
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Activity</TableHead>
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
                          <div className="text-sm">{s.location || 'N/A'}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <ActivityViewer student={s} />
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

function ActivityViewer({ student }: { student: any }) {
  const db = useFirestore()
  const activityQuery = useMemo(() => {
    if (!db || !student.id) return null
    return query(collection(db, 'students', student.id, 'activity'), orderBy('timestamp', 'desc'))
  }, [db, student.id])

  const { data: activities, loading } = useCollection(activityQuery)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-accent hover:text-accent hover:bg-accent/10">
          <Activity size={16} className="mr-2" /> View Logs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Activity Logs: <span className="text-accent">{student.name}</span>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 mt-4 pr-4">
          {loading ? (
             <div className="flex justify-center p-8"><Activity className="animate-spin text-accent" /></div>
          ) : activities && activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((log: any, i: number) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl border bg-accent/5">
                  <div className="mt-1">
                    {log.type === 'login' && <Users className="text-green-500" size={20} />}
                    {log.type === 'logout' && <LogOut className="text-red-500" size={20} />}
                    {log.type === 'pdf_view' && <FileText className="text-blue-500" size={20} />}
                    {log.type === 'video_view' && <PlayCircle className="text-purple-500" size={20} />}
                    {log.type === 'inactivity_logout' && <Clock className="text-orange-500" size={20} />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between">
                      <span className="font-bold capitalize">{log.type.replace('_', ' ')}</span>
                      <span className="text-xs text-muted-foreground">
                        {log.timestamp?.toDate() ? log.timestamp.toDate().toLocaleString() : 'Just now'}
                      </span>
                    </div>
                    {log.metadata?.title && (
                      <p className="text-sm text-muted-foreground">Material: {log.metadata.title}</p>
                    )}
                    {log.duration !== undefined && (
                      <div className="flex items-center gap-1 text-xs font-medium text-accent">
                        <Clock size={12} /> {Math.floor(log.duration / 60)}m {log.duration % 60}s duration
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">No logs found for this student.</div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function LogOut({ className, size }: { className?: string, size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size || 24}
      height={size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
