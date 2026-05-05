
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
import { UserPlus, Activity, Clock, FileText, PlayCircle, Download, UserRound, GraduationCap, Edit2, MessageSquare, BookOpen, Trash2, Plus, Upload, Loader2, Library, CheckCircle2, Link, Youtube } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChatInterface } from '@/components/chat-interface'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

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
    selectedCourseIds: [] as string[]
  })

  const [materialForm, setMaterialForm] = useState({
    title: '',
    courseId: '',
    subjectId: '',
    type: 'video' as 'video' | 'pdf',
    url: '',
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
    if (!subjectForm.name || subjectForm.selectedCourseIds.length === 0) {
      toast({ variant: "destructive", title: "Incomplete", description: "Provide a name and select at least one class." })
      return
    }

    setLoading(true)
    try {
      const promises = subjectForm.selectedCourseIds.map(courseId => 
        addDoc(collection(db, 'subjects'), { name: subjectForm.name, courseId })
      )
      await Promise.all(promises)
      toast({ title: "Subjects Added", description: `Added ${subjectForm.name} to ${subjectForm.selectedCourseIds.length} classes.` })
      setSubjectForm({ name: '', selectedCourseIds: [] })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const toggleCourseSelection = (courseId: string) => {
    setSubjectForm(prev => {
      const isSelected = prev.selectedCourseIds.includes(courseId)
      if (isSelected) {
        return { ...prev, selectedCourseIds: prev.selectedCourseIds.filter(id => id !== courseId) }
      } else {
        return { ...prev, selectedCourseIds: [...prev.selectedCourseIds, courseId] }
      }
    })
  }

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !materialForm.courseId || !materialForm.subjectId) {
      toast({ variant: "destructive", title: "Missing Details", description: "Please select class and subject." })
      return
    }

    if (materialForm.type === 'video' && !materialForm.url) {
      toast({ variant: "destructive", title: "Missing URL", description: "Please provide a YouTube URL for the video." })
      return
    }

    if (materialForm.type === 'pdf' && !materialForm.file && !materialForm.url) {
      toast({ variant: "destructive", title: "Missing Content", description: "Please upload a file or provide a URL for the notes." })
      return
    }

    setIsUploading(true)
    setUploadProgress(10)

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval)
          return 95
        }
        return prev + 5
      })
    }, 100)

    setTimeout(async () => {
      clearInterval(interval)
      
      const newMaterial = {
        title: materialForm.title || (materialForm.type === 'video' ? 'New Video' : materialForm.file?.name || 'New Note'),
        courseId: materialForm.courseId,
        subjectId: materialForm.subjectId,
        type: materialForm.type,
        url: materialForm.url || 'https://placeholder-url.com', 
        createdAt: serverTimestamp()
      }

      await addDoc(collection(db, 'materials'), newMaterial)
      
      setUploadProgress(100)
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
        setMaterialForm({ title: '', courseId: '', subjectId: '', type: 'video', url: '', file: null })
        toast({ title: "Added", description: "Material successfully added." })
      }, 500)
    }, 1500)
  }

  const handleDeleteSubject = async (id: string) => {
    if (!db) return
    deleteDoc(doc(db, 'subjects', id))
  }

  const handleDeleteMaterial = async (id: string) => {
    if (!db) return
    deleteDoc(doc(db, 'materials', id))
  }

  const handleUpdateStudent = async () => {
    if (!db || !editingStudent) return
    setLoading(true)
    const docRef = doc(db, 'students', editingStudent.id)
    updateDoc(docRef, {
      name: editingStudent.name || '',
      class: editingStudent.class || '',
      mentorId: editingStudent.mentorId || 'none',
      schoolName: editingStudent.schoolName || '',
      location: editingStudent.location || ''
    }).then(() => {
      toast({ title: "Updated", description: "Student details saved." })
      setEditingStudent(null)
    }).finally(() => setLoading(false))
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
                  <Plus size={20} /> Batch Manage Subjects
                </CardTitle>
                <CardDescription>Type a subject and select all classes that should have it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleAddSubject} className="space-y-6">
                  <div className="space-y-2">
                    <Label>Subject Name</Label>
                    <Input 
                      placeholder="e.g. Maths" 
                      value={subjectForm.name}
                      onChange={e => setSubjectForm({...subjectForm, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label>Select Classes to Add This Subject To:</Label>
                    <ScrollArea className="h-[200px] border rounded-lg p-3">
                      <div className="grid grid-cols-1 gap-3">
                        {courses?.map(course => (
                          <div key={course.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded-md transition-colors">
                            <Checkbox 
                              id={`course-${course.id}`} 
                              checked={subjectForm.selectedCourseIds.includes(course.id)}
                              onCheckedChange={() => toggleCourseSelection(course.id)}
                            />
                            <label htmlFor={`course-${course.id}`} className="text-sm font-medium leading-none cursor-pointer flex-1">
                              {course.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <p className="text-[10px] text-muted-foreground italic">
                      {subjectForm.selectedCourseIds.length} classes selected.
                    </p>
                  </div>

                  <Button type="submit" className="w-full bg-accent" disabled={loading || !subjectForm.name || subjectForm.selectedCourseIds.length === 0}>
                    {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" size={16} />}
                    Create Subject for All Selected Classes
                  </Button>
                </form>

                <div className="pt-6 border-t">
                  <h4 className="font-bold text-sm mb-4">Existing Subjects</h4>
                  <div className="rounded-md border h-[250px]">
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
                </div>
              </CardContent>
            </Card>

            {/* Material Add (YouTube Links & Mock Files) */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <Library size={20} /> Add Materials
                </CardTitle>
                <CardDescription>Add YouTube videos or Notes (PDF/DOC) links.</CardDescription>
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

                  <div className="space-y-2">
                    <Label>Material Type</Label>
                    <RadioGroup 
                      value={materialForm.type} 
                      onValueChange={(v: any) => setMaterialForm({...materialForm, type: v, url: ''})}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="video" id="video" />
                        <Label htmlFor="video" className="cursor-pointer">Video (YouTube)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pdf" id="pdf" />
                        <Label htmlFor="pdf" className="cursor-pointer">Note (PDF/Doc)</Label>
                      </div>
                    </RadioGroup>
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

                  {materialForm.type === 'video' ? (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                      <Label className="flex items-center gap-2">
                        <Youtube className="text-red-600 h-4 w-4" /> YouTube URL
                      </Label>
                      <Input 
                        placeholder="https://www.youtube.com/watch?v=..." 
                        value={materialForm.url}
                        onChange={e => setMaterialForm({...materialForm, url: e.target.value})}
                      />
                      <p className="text-[10px] text-muted-foreground italic">Paste the full link to the YouTube video.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                       <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Link className="h-4 w-4" /> Resource URL (Optional)
                        </Label>
                        <Input 
                          placeholder="Link to file (e.g. Google Drive)" 
                          value={materialForm.url}
                          onChange={e => setMaterialForm({...materialForm, url: e.target.value})}
                        />
                      </div>
                      <div className="border-2 border-dashed rounded-xl p-6 text-center bg-muted/30 relative">
                        <input 
                          type="file" 
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          onChange={e => setMaterialForm({...materialForm, file: e.target.files?.[0] || null})}
                        />
                        <div className="flex flex-col items-center gap-1">
                          <Plus size={24} className="text-muted-foreground" />
                          <p className="text-xs font-medium">
                            {materialForm.file ? materialForm.file.name : "Or pick local file reference"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Processing...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}

                  <Button className="w-full bg-primary" disabled={isUploading}>
                    {isUploading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" size={16} />}
                    Save Material
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
                                {m.type === 'video' ? <Youtube className="text-red-600" size={14} /> : <FileText className="text-blue-500" size={14} />}
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

      {/* Edit Student Dialog */}
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
            <div className="space-y-2">
              <Label>School Name</Label>
              <Input value={editingStudent?.schoolName || ''} onChange={e => setEditingStudent({...editingStudent, schoolName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={editingStudent?.location || ''} onChange={e => setEditingStudent({...editingStudent, location: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateStudent} disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
