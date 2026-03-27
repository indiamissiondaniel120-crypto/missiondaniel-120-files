"use client"

import React, { useState, useMemo } from 'react'
import { useFirestore } from '@/firebase'
import { collection, doc, setDoc, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc } from 'firebase/firestore'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCollection } from '@/firebase'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserPlus, Users, School, MapPin, Activity, Clock, FileText, PlayCircle, Download, LogOut, UserRound, GraduationCap, Edit2, MessageSquare, BookOpen, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChatInterface } from '@/components/chat-interface'
import { Textarea } from '@/components/ui/textarea'

export function StudentManagement() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [studentForm, setStudentForm] = useState({
    id: '',
    password: '',
    name: '',
    schoolName: '',
    location: '',
    class: '',
    mentorId: ''
  })
  
  const [mentorForm, setMentorForm] = useState({
    id: '',
    password: '',
    name: '',
    expertise: '',
    phone: ''
  })

  const [courseForm, setCourseForm] = useState({
    id: '',
    name: '',
    description: '',
    image: ''
  })

  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [editingMentor, setEditingMentor] = useState<any>(null)
  const [editingCourse, setEditingCourse] = useState<any>(null)

  const studentsQuery = useMemo(() => db ? collection(db, 'students') : null, [db])
  const mentorsQuery = useMemo(() => db ? collection(db, 'mentors') : null, [db])
  const coursesQuery = useMemo(() => db ? collection(db, 'courses') : null, [db])

  const { data: students } = useCollection(studentsQuery)
  const { data: mentors } = useCollection(mentorsQuery)
  const { data: courses } = useCollection(coursesQuery)

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db) return
    if (!studentForm.id || !studentForm.password || !studentForm.name || !studentForm.class) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Fill in all required fields." })
      return
    }

    setLoading(true)
    const docRef = doc(db, 'students', studentForm.id)
    const data = { ...studentForm, createdAt: serverTimestamp() }

    setDoc(docRef, data)
      .then(() => {
        toast({ title: "Student Registered", description: `${studentForm.name} added.` })
        setStudentForm({ id: '', password: '', name: '', schoolName: '', location: '', class: '', mentorId: '' })
      })
      .catch(async () => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'write', requestResourceData: data })))
      .finally(() => setLoading(false))
  }

  const handleUpdateStudent = async () => {
    if (!db || !editingStudent) return
    setLoading(true)
    const docRef = doc(db, 'students', editingStudent.id)
    
    updateDoc(docRef, editingStudent)
      .then(() => {
        toast({ title: "Updated", description: "Student details updated successfully." })
        setEditingStudent(null)
      })
      .catch(async () => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: editingStudent })))
      .finally(() => setLoading(false))
  }

  const handleRegisterMentor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db) return
    if (!mentorForm.id || !mentorForm.password || !mentorForm.name) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Fill in required fields." })
      return
    }

    setLoading(true)
    const docRef = doc(db, 'mentors', mentorForm.id)
    const data = { ...mentorForm, createdAt: serverTimestamp() }

    setDoc(docRef, data)
      .then(() => {
        toast({ title: "Mentor Registered", description: `${mentorForm.name} added.` })
        setMentorForm({ id: '', password: '', name: '', expertise: '', phone: '' })
      })
      .catch(async () => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'write', requestResourceData: data })))
      .finally(() => setLoading(false))
  }

  const handleUpdateMentor = async () => {
    if (!db || !editingMentor) return
    setLoading(true)
    const docRef = doc(db, 'mentors', editingMentor.id)
    
    updateDoc(docRef, editingMentor)
      .then(() => {
        toast({ title: "Updated", description: "Mentor details updated successfully." })
        setEditingMentor(null)
      })
      .catch(async () => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: editingMentor })))
      .finally(() => setLoading(false))
  }

  const handleRegisterCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db) return
    if (!courseForm.id || !courseForm.name) {
      toast({ variant: "destructive", title: "Missing Fields", description: "ID and Name are required." })
      return
    }

    setLoading(true)
    const docRef = doc(db, 'courses', courseForm.id)
    const data = { ...courseForm }

    setDoc(docRef, data)
      .then(() => {
        toast({ title: "Class Registered", description: `${courseForm.name} added.` })
        setCourseForm({ id: '', name: '', description: '', image: '' })
      })
      .catch(async () => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'write', requestResourceData: data })))
      .finally(() => setLoading(false))
  }

  const handleUpdateCourse = async () => {
    if (!db || !editingCourse) return
    setLoading(true)
    const docRef = doc(db, 'courses', editingCourse.id)
    
    updateDoc(docRef, editingCourse)
      .then(() => {
        toast({ title: "Updated", description: "Class details updated successfully." })
        setEditingCourse(null)
      })
      .catch(async () => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'update', requestResourceData: editingCourse })))
      .finally(() => setLoading(false))
  }

  const handleDeleteCourse = async (courseId: string) => {
    if (!db) return
    if (!confirm("Are you sure you want to delete this class? Materials might be affected.")) return

    const docRef = doc(db, 'courses', courseId)
    deleteDoc(docRef)
      .then(() => toast({ title: "Deleted", description: "Class removed." }))
      .catch(async () => errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' })))
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Tabs defaultValue="students" className="w-full">
        <TabsList className="mb-4 bg-muted/50 p-1">
          <TabsTrigger value="students" className="flex items-center gap-2 px-6">
            <GraduationCap size={16} /> Students
          </TabsTrigger>
          <TabsTrigger value="mentors" className="flex items-center gap-2 px-6">
            <UserRound size={16} /> Mentors
          </TabsTrigger>
          <TabsTrigger value="courses" className="flex items-center gap-2 px-6">
            <BookOpen size={16} /> Classes/Streams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 border-accent/20">
              <CardHeader>
                <CardTitle className="text-accent flex items-center gap-2">
                  <UserPlus size={20} /> Register Student
                </CardTitle>
                <CardDescription>Add a student and assign a mentor.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegisterStudent} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Student ID</Label>
                    <Input value={studentForm.id} onChange={e => setStudentForm({...studentForm, id: e.target.value})} placeholder="e.g. S123" disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" value={studentForm.password} onChange={e => setStudentForm({...studentForm, password: e.target.value})} placeholder="Set password" disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} placeholder="Enter name" disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label>Class / Stream</Label>
                    <Select onValueChange={v => setStudentForm({...studentForm, class: v})} value={studentForm.class} disabled={loading}>
                      <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                      <SelectContent>
                        {courses?.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                        {(!courses || courses.length === 0) && <SelectItem value="none" disabled>No classes defined</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assign Mentor</Label>
                    <Select onValueChange={v => setStudentForm({...studentForm, mentorId: v})} value={studentForm.mentorId} disabled={loading}>
                      <SelectTrigger><SelectValue placeholder="Select Mentor (Optional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Mentor</SelectItem>
                        {mentors?.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.name} ({m.expertise})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>School</Label>
                      <Input value={studentForm.schoolName} onChange={e => setStudentForm({...studentForm, schoolName: e.target.value})} placeholder="School name" disabled={loading} />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input value={studentForm.location} onChange={e => setStudentForm({...studentForm, location: e.target.value})} placeholder="City/Region" disabled={loading} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-accent" disabled={loading}>Add Student</Button>
                </form>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Registered Students</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Mentor</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students?.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="font-bold">{s.name}</div>
                            <div className="text-xs text-muted-foreground">{s.id}</div>
                          </TableCell>
                          <TableCell className="capitalize">{courses?.find(c => c.id === s.class)?.name || s.class}</TableCell>
                          <TableCell>
                            {s.mentorId && s.mentorId !== 'none' ? (
                              <div className="text-sm">{mentors?.find(m => m.id === s.mentorId)?.name || s.mentorId}</div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">None</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setEditingStudent(s)}><Edit2 size={16} /></Button>
                            <ActivityViewer student={s} />
                            {s.mentorId && s.mentorId !== 'none' && (
                              <ChatMonitor student={s} mentorId={s.mentorId} mentors={mentors} />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mentors" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-600 flex items-center gap-2">
                  <UserPlus size={20} /> Register Mentor
                </CardTitle>
                <CardDescription>Add a new mentor to the system.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegisterMentor} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Mentor ID (Username)</Label>
                    <Input value={mentorForm.id} onChange={e => setMentorForm({...mentorForm, id: e.target.value})} placeholder="e.g. M123" disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" value={mentorForm.password} onChange={e => setMentorForm({...mentorForm, password: e.target.value})} placeholder="Set password" disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={mentorForm.name} onChange={e => setMentorForm({...mentorForm, name: e.target.value})} placeholder="Enter name" disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label>Expertise</Label>
                    <Input value={mentorForm.expertise} onChange={e => setMentorForm({...mentorForm, expertise: e.target.value})} placeholder="e.g. Physics" disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input value={mentorForm.phone} onChange={e => setMentorForm({...mentorForm, phone: e.target.value})} placeholder="Contact number" disabled={loading} />
                  </div>
                  <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={loading}>Add Mentor</Button>
                </form>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Registered Mentors</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mentor</TableHead>
                        <TableHead>Expertise</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mentors?.map((m: any) => (
                        <TableRow key={m.id}>
                          <TableCell>
                            <div className="font-bold">{m.name}</div>
                            <div className="text-xs text-muted-foreground">{m.id}</div>
                          </TableCell>
                          <TableCell>{m.expertise || 'N/A'}</TableCell>
                          <TableCell>{m.phone || 'N/A'}</TableCell>
                          <TableCell className="text-right">
                             <Button variant="ghost" size="sm" onClick={() => setEditingMentor(m)}><Edit2 size={16} /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <BookOpen size={20} /> Add Class / Stream
                </CardTitle>
                <CardDescription>Define a new academic stream.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegisterCourse} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Class ID (URL friendly)</Label>
                    <Input value={courseForm.id} onChange={e => setCourseForm({...courseForm, id: e.target.value.toLowerCase().replace(/\s+/g, '-')})} placeholder="e.g. class-10" disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label>Class Name</Label>
                    <Input value={courseForm.name} onChange={e => setCourseForm({...courseForm, name: e.target.value})} placeholder="e.g. Class 10" disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} placeholder="Detailed description" disabled={loading} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cover Image URL</Label>
                    <Input value={courseForm.image} onChange={e => setCourseForm({...courseForm, image: e.target.value})} placeholder="https://..." disabled={loading} />
                  </div>
                  <Button type="submit" className="w-full bg-primary" disabled={loading}>Add Class</Button>
                </form>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Available Classes</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class Name</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courses?.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-bold">{c.name}</TableCell>
                          <TableCell className="text-xs">{c.id}</TableCell>
                          <TableCell className="text-right flex justify-end gap-2">
                             <Button variant="ghost" size="sm" onClick={() => setEditingCourse(c)}><Edit2 size={16} /></Button>
                             <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteCourse(c.id)}><Trash2 size={16} /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Course Dialog */}
      <Dialog open={!!editingCourse} onOpenChange={() => setEditingCourse(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Class: {editingCourse?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editingCourse?.name || ''} onChange={e => setEditingCourse({...editingCourse, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={editingCourse?.description || ''} onChange={e => setEditingCourse({...editingCourse, description: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Cover Image URL</Label>
              <Input value={editingCourse?.image || ''} onChange={e => setEditingCourse({...editingCourse, image: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCourse(null)}>Cancel</Button>
            <Button onClick={handleUpdateCourse} disabled={loading}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={!!editingStudent} onOpenChange={() => setEditingStudent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Student: {editingStudent?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editingStudent?.name || ''} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select onValueChange={v => setEditingStudent({...editingStudent, class: v})} value={editingStudent?.class || ''}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {courses?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mentor</Label>
              <Select onValueChange={v => setEditingStudent({...editingStudent, mentorId: v})} value={editingStudent?.mentorId || ''}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Mentor</SelectItem>
                  {mentors?.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>School</Label>
                <Input value={editingStudent?.schoolName || ''} onChange={e => setEditingStudent({...editingStudent, schoolName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={editingStudent?.location || ''} onChange={e => setEditingStudent({...editingStudent, location: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStudent(null)}>Cancel</Button>
            <Button onClick={handleUpdateStudent} disabled={loading}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Mentor Dialog */}
      <Dialog open={!!editingMentor} onOpenChange={() => setEditingMentor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Mentor: {editingMentor?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editingMentor?.name || ''} onChange={e => setEditingMentor({...editingMentor, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Expertise</Label>
              <Input value={editingMentor?.expertise || ''} onChange={e => setEditingMentor({...editingMentor, expertise: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={editingMentor?.phone || ''} onChange={e => setEditingMentor({...editingMentor, phone: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMentor(null)}>Cancel</Button>
            <Button onClick={handleUpdateMentor} disabled={loading}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ChatMonitor({ student, mentorId, mentors }: { student: any, mentorId: string, mentors: any[] | null }) {
  const mentor = mentors?.find(m => m.id === mentorId)
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-orange-500"><MessageSquare size={16} className="mr-2" /> Chat</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Chat History: {student.name} & {mentor?.name || mentorId}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <ChatInterface 
            chatId={`${student.id}_${mentorId}`} 
            currentUser={{ id: 'admin', name: 'Admin Monitor', role: 'admin' }} 
            otherUserName={student.name}
            readonly={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ActivityViewer({ student }: { student: any }) {
  const db = useFirestore()
  const activityQuery = useMemo(() => db && student.id ? query(collection(db, 'students', student.id, 'activity'), orderBy('timestamp', 'desc')) : null, [db, student.id])
  const { data: activities, loading } = useCollection(activityQuery)

  const downloadCSV = () => {
    if (!activities) return

    // Breakdown metrics
    let totalPDFTime = 0;
    let totalVideoTime = 0;
    let totalAwayTime = 0;
    let loginCount = 0;
    let lastLogin: Date | null = null;
    let firstActivity: Date | null = null;
    let lastActivity: Date | null = null;

    activities.forEach((log: any) => {
      const dur = Number(log.duration) || 0;
      const type = log.type;
      const ts = log.timestamp?.toDate();

      if (type === 'pdf_view') totalPDFTime += dur;
      if (type === 'video_view') totalVideoTime += dur;
      if (type === 'tab_away') totalAwayTime += dur;
      if (type === 'login') {
        loginCount++;
        if (!lastLogin || ts > lastLogin) lastLogin = ts;
      }
      
      if (ts) {
        if (!firstActivity || ts < firstActivity) firstActivity = ts;
        if (!lastActivity || ts > lastActivity) lastActivity = ts;
      }
    });

    const totalStudyTime = totalPDFTime + totalVideoTime;

    const headers = ["Date", "Time", "Activity Type", "Duration (sec)", "Details"]
    const rows = activities.map((log: any) => [
      log.timestamp?.toDate() ? log.timestamp.toDate().toLocaleDateString() : 'N/A',
      log.timestamp?.toDate() ? log.timestamp.toDate().toLocaleTimeString() : 'N/A',
      log.type || 'N/A',
      log.duration || 0,
      log.metadata?.title || log.metadata?.reason || ''
    ])

    const summaryRows = [
      [],
      ["CONSOLIDATED ATTENDANCE & USAGE REPORT"],
      ["Student Name", student.name],
      ["Student ID", student.id],
      ["Class", student.class || 'N/A'],
      ["First Recorded Activity", firstActivity ? firstActivity.toLocaleString() : 'N/A'],
      ["Last Recorded Activity", lastActivity ? lastActivity.toLocaleString() : 'N/A'],
      [],
      ["METRIC", "SECONDS", "MINUTES"],
      ["Total Active Study Time (PDF + Video)", totalStudyTime, (totalStudyTime / 60).toFixed(2)],
      ["Total PDF Reading Time", totalPDFTime, (totalPDFTime / 60).toFixed(2)],
      ["Total Video Watching Time", totalVideoTime, (totalVideoTime / 60).toFixed(2)],
      ["Total Time Away from Tab", totalAwayTime, (totalAwayTime / 60).toFixed(2)],
      ["Total Login Events", loginCount, "-"],
      [],
      ["VISION: Uplifting Education Shaping Futures"]
    ]

    const csvContent = "data:text/csv;charset=utf-8," + 
      [headers, ...rows, ...summaryRows].map(e => e.map(cell => `"${cell}"`).join(",")).join("\n")
    
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `attendance_report_${student.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-accent"><Activity size={16} className="mr-2" /> Logs</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <DialogTitle>Attendance & Activity Logs: {student.name}</DialogTitle>
          <Button variant="outline" size="sm" onClick={downloadCSV}><Download size={16} className="mr-2" /> Export Report</Button>
        </DialogHeader>
        <ScrollArea className="flex-1 mt-4">
          {loading ? (
            <div className="flex justify-center p-8"><Activity className="animate-spin" /></div>
          ) : activities?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No activity recorded yet.</div>
          ) : (
            <div className="space-y-2">
              {activities?.map((log: any, i: number) => (
                <div key={i} className="flex gap-4 p-4 rounded-xl border bg-accent/5">
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between">
                      <span className="font-bold capitalize">{log.type.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-muted-foreground">{log.timestamp?.toDate()?.toLocaleString()}</span>
                    </div>
                    {log.metadata?.title && <p className="text-sm">Material: {log.metadata.title}</p>}
                    {log.metadata?.reason && <p className="text-xs italic">Reason: {log.metadata.reason}</p>}
                    {log.duration !== undefined && log.duration > 0 && (
                      <div className="text-xs font-medium text-accent flex items-center gap-1">
                        <Clock size={12} /> {Math.floor(log.duration / 60)}m {log.duration % 60}s
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
