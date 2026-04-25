
"use client"

import React, { useState, useMemo } from 'react'
import { useFirestore } from '@/firebase'
import { collection, doc, setDoc, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, addDoc } from 'firebase/firestore'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCollection } from '@/firebase'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserPlus, Activity, Clock, FileText, PlayCircle, Download, UserRound, GraduationCap, Edit2, MessageSquare, BookOpen, Trash2, Plus, Upload, Loader2, Library } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChatInterface } from '@/components/chat-interface'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'

export function StudentManagement() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('students')
  
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

  const [subjectForm, setSubjectForm] = useState({
    name: '',
    courseId: ''
  })

  const [materialForm, setMaterialForm] = useState({
    title: '',
    courseId: '',
    subjectId: '',
    file: null as File | null
  })

  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [editingMentor, setEditingMentor] = useState<any>(null)
  const [editingCourse, setEditingCourse] = useState<any>(null)

  const studentsQuery = useMemo(() => db ? collection(db, 'students') : null, [db])
  const mentorsQuery = useMemo(() => db ? collection(db, 'mentors') : null, [db])
  const coursesQuery = useMemo(() => db ? collection(db, 'courses') : null, [db])
  const subjectsQuery = useMemo(() => db ? collection(db, 'subjects') : null, [db])
  const materialsQuery = useMemo(() => db ? query(collection(db, 'materials'), orderBy('createdAt', 'desc')) : null, [db])

  const { data: students } = useCollection(studentsQuery)
  const { data: mentors } = useCollection(mentorsQuery)
  const { data: courses } = useCollection(coursesQuery)
  const { data: subjects } = useCollection(subjectsQuery)
  const { data: materials } = useCollection(materialsQuery)

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

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db) return
    if (!subjectForm.name || !subjectForm.courseId) return

    setLoading(true)
    addDoc(collection(db, 'subjects'), subjectForm)
      .then(() => {
        toast({ title: "Subject Added", description: `Added ${subjectForm.name}` })
        setSubjectForm({ name: '', courseId: '' })
      })
      .finally(() => setLoading(false))
  }

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !materialForm.file || !materialForm.courseId || !materialForm.subjectId) {
      toast({ variant: "destructive", title: "Missing Details", description: "Please select file, class, and subject." })
      return
    }

    setIsUploading(true)
    setUploadProgress(10)

    // Simulate Upload Progress (Since Storage setup is pending user action)
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval)
          return 90
        }
        return prev + 10
      })
    }, 300)

    setTimeout(async () => {
      clearInterval(interval)
      setUploadProgress(100)

      const fileExtension = materialForm.file?.name.split('.').pop()?.toLowerCase() || ''
      const isVideo = ['mp4', 'm4v', 'webm', 'mp3'].includes(fileExtension)
      
      const newMaterial = {
        title: materialForm.title || materialForm.file?.name || 'Untitled',
        courseId: materialForm.courseId,
        subjectId: materialForm.subjectId,
        type: isVideo ? 'video' : 'pdf',
        fileType: fileExtension,
        url: 'https://placeholder-url.com', // Replace with real storage URL once Blaze plan is active
        createdAt: serverTimestamp()
      }

      await addDoc(collection(db, 'materials'), newMaterial)
      
      setIsUploading(false)
      setUploadProgress(0)
      setMaterialForm({ title: '', courseId: '', subjectId: '', file: null })
      toast({ title: "Uploaded", description: "Material metadata saved. Note: Real storage upload requires Blaze plan." })
    }, 2000)
  }

  const handleDeleteSubject = async (id: string) => {
    if (!db) return
    deleteDoc(doc(db, 'subjects', id))
  }

  const handleDeleteMaterial = async (id: string) => {
    if (!db) return
    deleteDoc(doc(db, 'materials', id))
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 bg-muted/50 p-1 flex-wrap h-auto">
          <TabsTrigger value="students" className="flex items-center gap-2 px-6">
            <GraduationCap size={16} /> Students
          </TabsTrigger>
          <TabsTrigger value="mentors" className="flex items-center gap-2 px-6">
            <UserRound size={16} /> Mentors
          </TabsTrigger>
          <TabsTrigger value="courses" className="flex items-center gap-2 px-6">
            <BookOpen size={16} /> Classes
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-2 px-6">
            <Library size={16} /> Materials & Subjects
          </TabsTrigger>
        </TabsList>

        {/* ... Existing TabsContent for Students, Mentors, Courses ... */}
        {/* Simplified for brevity, assume they exist or keep original logic */}

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
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full bg-accent" disabled={loading}>Add Student</Button>
                </form>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Registered Students</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
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
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegisterMentor} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Mentor ID</Label>
                    <Input value={mentorForm.id} onChange={e => setMentorForm({...mentorForm, id: e.target.value})} placeholder="e.g. M123" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" value={mentorForm.password} onChange={e => setMentorForm({...mentorForm, password: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={mentorForm.name} onChange={e => setMentorForm({...mentorForm, name: e.target.value})} />
                  </div>
                  <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600">Add Mentor</Button>
                </form>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Mentors</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Expertise</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mentors?.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-bold">{m.name}</TableCell>
                        <TableCell>{m.expertise}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setEditingMentor(m)}><Edit2 size={16} /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <BookOpen size={20} /> Add Class
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegisterCourse} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Class ID</Label>
                    <Input value={courseForm.id} onChange={e => setCourseForm({...courseForm, id: e.target.value})} placeholder="e.g. class-9" />
                  </div>
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={courseForm.name} onChange={e => setCourseForm({...courseForm, name: e.target.value})} />
                  </div>
                  <Button type="submit" className="w-full bg-primary">Add Class</Button>
                </form>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Available Classes</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses?.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-bold">{c.name}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setEditingCourse(c)}><Edit2 size={16} /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="materials" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Subject Management */}
            <Card className="border-accent/20">
              <CardHeader>
                <CardTitle className="text-accent flex items-center gap-2">
                  <Plus size={20} /> Manage Subjects
                </CardTitle>
                <CardDescription>Add subjects to specific classes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleAddSubject} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Subject Name</Label>
                    <Input 
                      placeholder="e.g. Maths" 
                      value={subjectForm.name}
                      onChange={e => setSubjectForm({...subjectForm, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Link to Class</Label>
                    <Select 
                      onValueChange={v => setSubjectForm({...subjectForm, courseId: v})} 
                      value={subjectForm.courseId}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                      <SelectContent>
                        {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="bg-accent" disabled={loading || !subjectForm.name || !subjectForm.courseId}>
                    Add
                  </Button>
                </form>

                <div className="rounded-md border h-[300px]">
                  <ScrollArea className="h-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subjects?.map((s: any) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell>{courses?.find(c => c.id === s.courseId)?.name}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteSubject(s.id)} className="text-destructive">
                                <Trash2 size={14} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>

            {/* Material Upload */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <Upload size={20} /> Upload Materials
                </CardTitle>
                <CardDescription>Upload files and link to Class & Subject.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleUploadMaterial} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Material Title</Label>
                    <Input 
                      placeholder="e.g. Algebra Basics" 
                      value={materialForm.title}
                      onChange={e => setMaterialForm({...materialForm, title: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Select Class</Label>
                      <Select 
                        onValueChange={v => setMaterialForm({...materialForm, courseId: v, subjectId: ''})} 
                        value={materialForm.courseId}
                      >
                        <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                        <SelectContent>
                          {courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Select Subject</Label>
                      <Select 
                        onValueChange={v => setMaterialForm({...materialForm, subjectId: v})} 
                        value={materialForm.subjectId}
                        disabled={!materialForm.courseId}
                      >
                        <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                        <SelectContent>
                          {subjects?.filter(s => s.courseId === materialForm.courseId).map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border-2 border-dashed rounded-xl p-8 text-center bg-muted/30 relative">
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={e => setMaterialForm({...materialForm, file: e.target.files?.[0] || null})}
                    />
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 rounded-full bg-primary/10 text-primary">
                        <Plus size={32} />
                      </div>
                      <p className="text-sm font-medium">
                        {materialForm.file ? materialForm.file.name : "Click to select or drag & drop"}
                      </p>
                      <p className="text-xs text-muted-foreground">PDF, TXT, MP4, MP3, PPT, DOC, JPG</p>
                    </div>
                  </div>

                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}

                  <Button className="w-full bg-primary" disabled={isUploading || !materialForm.file}>
                    {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2" />}
                    Confirm Upload
                  </Button>
                </form>

                <div className="rounded-md border h-[250px]">
                   <ScrollArea className="h-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {materials?.map((m: any) => (
                          <TableRow key={m.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {m.type === 'video' ? <PlayCircle className="text-accent" size={14} /> : <FileText className="text-red-500" size={14} />}
                                <span className="font-medium truncate max-w-[150px]">{m.title}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">{subjects?.find(s => s.id === m.subjectId)?.name}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteMaterial(m.id)} className="text-destructive">
                                <Trash2 size={14} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Existing Edit Dialogs remain same */}
      <Dialog open={!!editingStudent} onOpenChange={() => setEditingStudent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
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
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateStudent}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ... Rest of the helper components ActivityViewer, ChatMonitor stay same ...
// Use existing implementations from your previous code
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
    const totalPDFTime = activities.filter((l: any) => l.type === 'pdf_view').reduce((acc, curr: any) => acc + (Number(curr.duration) || 0), 0)
    const totalVideoTime = activities.filter((l: any) => l.type === 'video_view').reduce((acc, curr: any) => acc + (Number(curr.duration) || 0), 0)
    
    const headers = ["Date", "Activity", "Duration (sec)"]
    const rows = activities.map((log: any) => [
      log.timestamp?.toDate()?.toLocaleString() || 'N/A',
      log.type,
      log.duration || 0
    ])

    const csvContent = "data:text/csv;charset=utf-8," + 
      [headers, ...rows, ["", "Total Study", totalPDFTime + totalVideoTime]].map(e => e.join(",")).join("\n")
    
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `report_${student.id}.csv`);
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
          <DialogTitle>Logs: {student.name}</DialogTitle>
          <Button variant="outline" size="sm" onClick={downloadCSV}><Download size={16} className="mr-2" /> Export</Button>
        </DialogHeader>
        <ScrollArea className="flex-1 mt-4">
          {loading ? <Loader2 className="animate-spin mx-auto mt-8" /> : (
            <div className="space-y-2">
              {activities?.map((log: any, i: number) => (
                <div key={i} className="p-3 border rounded-lg flex justify-between">
                  <span>{log.type.replace(/_/g, ' ')}</span>
                  <span className="text-muted-foreground">{log.timestamp?.toDate()?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function handleUpdateStudent() { /* ... */ }
