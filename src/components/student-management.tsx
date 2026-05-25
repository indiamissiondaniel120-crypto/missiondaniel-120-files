"use client"

import React, { useState, useMemo, useEffect } from 'react'
import { useFirestore } from '@/firebase'
import { collection, doc, setDoc, serverTimestamp, query, orderBy, where, updateDoc, deleteDoc, addDoc, writeBatch } from 'firebase/firestore'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCollection } from '@/firebase'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserPlus, Activity, Clock, FileText, PlayCircle, Download, UserRound, GraduationCap, Edit2, MessageSquare, BookOpen, Trash2, Plus, Upload, Loader2, Library, CheckCircle2, Link, Youtube, ExternalLink, ListChecks, Search, Filter, Layers, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"

const MATHS_CHAPTER_COUNT: Record<string, number> = {
  'class-4': 14,
  'class-5': 15,
  'class-6': 10,
  'class-7': 8,
  'class-8': 7,
  'class-9': 8,
  'class-10': 15
};

function getChapterCount(courseId: string, subjectName: string): number {
  const name = subjectName.toLowerCase();
  if (name.includes('maths')) return MATHS_CHAPTER_COUNT[courseId] || 1;
  if (name.includes('hamara adhbhut sansar')) return 10;
  if (name.includes('jigyasa')) {
    if (courseId === 'class-8') return 13;
    return 12; // Class 6 and 7
  }
  if (name.includes('exploration')) return 13;
  if (name.includes('vigyan')) return 13;
  return 1;
}

function getYouTubeID(url: string) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

async function fetchYouTubeTitle(url: string): Promise<string | null> {
  const videoId = getYouTubeID(url);
  if (!videoId) return null;
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    const data = await response.json();
    return data.title || null;
  } catch (e) {
    console.error('Error fetching YouTube title:', e);
    return null;
  }
}

function sortClasses(classes: any[]) {
  if (!classes) return [];
  return [...classes].sort((a, b) => {
    const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
    const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
    if (numA !== 0 && numB !== 0) return numA - numB;
    if (numA !== 0) return -1;
    if (numB !== 0) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function StudentManagement() {
  const db = useFirestore()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('students')
  const [overviewClassFilter, setOverviewClassFilter] = useState<string>('all')
  const [overviewSubjectSearch, setOverviewSubjectSearch] = useState<string>('')

  const [studentForm, setStudentForm] = useState({ id: '', password: '', name: '', schoolName: '', location: '', class: '', mentorId: '' })
  const [mentorForm, setMentorForm] = useState({ id: '', password: '', name: '', expertise: '', phone: '' })
  const [courseForm, setCourseForm] = useState({ id: '', name: '', description: '', image: '' })
  const [subjectForm, setSubjectForm] = useState({ name: '', selectedCourseIds: [] as string[] })
  const [materialForm, setMaterialForm] = useState({ title: '', courseId: '', subjectId: '', type: 'video' as 'video' | 'pdf', url: '', chapter: 1 })

  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)

  const [editingStudent, setEditingStudent] = useState<any>(null)
  const [editingMentor, setEditingMentor] = useState<any>(null)
  const [editingCourse, setEditingCourse] = useState<any>(null)
  const [editingMaterial, setEditingMaterial] = useState<any>(null)

  const [selectedChapterInfo, setSelectedChapterInfo] = useState<{
    className: string,
    subjectName: string,
    chapter: number,
    materials: any[]
  } | null>(null);

  const studentsQuery = useMemo(() => db ? collection(db, 'students') : null, [db])
  const mentorsQuery = useMemo(() => db ? collection(db, 'mentors') : null, [db])
  const coursesQuery = useMemo(() => db ? collection(db, 'courses') : null, [db])
  const subjectsQuery = useMemo(() => db ? collection(db, 'subjects') : null, [db])
  const materialsQuery = useMemo(() => db ? query(collection(db, 'materials'), orderBy('chapter', 'asc')) : null, [db])

  const { data: students } = useCollection(studentsQuery)
  const { data: mentors } = useCollection(mentorsQuery)
  const { data: rawCourses } = useCollection(coursesQuery)
  const { data: subjects } = useCollection(subjectsQuery)
  const { data: materials } = useCollection(materialsQuery)

  const courses = useMemo(() => sortClasses(rawCourses || []), [rawCourses]);

  const sortedMaterials = useMemo(() => {
    if (!materials) return [];
    return [...materials].sort((a, b) => {
      // Primary sort: Class
      if (a.courseId !== b.courseId) return a.courseId.localeCompare(b.courseId);
      // Secondary sort: Subject
      if (a.subjectId !== b.subjectId) return a.subjectId.localeCompare(b.subjectId);
      // Tertiary sort: Chapter (Numerical)
      return (Number(a.chapter) || 0) - (Number(b.chapter) || 0);
    });
  }, [materials]);

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !studentForm.id || !studentForm.name) return
    setLoading(true)
    const docRef = doc(db, 'students', studentForm.id)
    setDoc(docRef, { ...studentForm, createdAt: serverTimestamp() }).then(() => {
      toast({ title: "Student Registered" })
      setStudentForm({ id: '', password: '', name: '', schoolName: '', location: '', class: '', mentorId: '' })
    }).finally(() => setLoading(false))
  }

  const handleRegisterMentor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !mentorForm.id || !mentorForm.name) return
    setLoading(true)
    const docRef = doc(db, 'mentors', mentorForm.id)
    setDoc(docRef, { ...mentorForm, createdAt: serverTimestamp() }).then(() => {
      toast({ title: "Mentor Registered" })
      setMentorForm({ id: '', password: '', name: '', expertise: '', phone: '' })
    }).finally(() => setLoading(false))
  }

  const handleRegisterCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !courseForm.id || !courseForm.name) return
    setLoading(true)
    const docRef = doc(db, 'courses', courseForm.id)
    setDoc(docRef, { ...courseForm }).then(() => {
      toast({ title: "Class Registered" })
      setCourseForm({ id: '', name: '', description: '', image: '' })
    }).finally(() => setLoading(false))
  }

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !subjectForm.name) return
    setLoading(true)
    const promises = subjectForm.selectedCourseIds.map(courseId => addDoc(collection(db, 'subjects'), { name: subjectForm.name, courseId }))
    await Promise.all(promises)
    setSubjectForm({ name: '', selectedCourseIds: [] })
    setLoading(false)
  }

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !materialForm.courseId || !materialForm.subjectId) return
    setIsUploading(true)
    setUploadProgress(50)
    await addDoc(collection(db, 'materials'), { ...materialForm, createdAt: serverTimestamp() })
    setUploadProgress(100)
    setTimeout(() => {
      setIsUploading(false)
      setMaterialForm({ title: '', courseId: '', subjectId: '', type: 'video', url: '', chapter: 1 })
      toast({ title: "Material Added" })
    }, 500)
  }

  const handleDeleteSubject = (id: string) => db && deleteDoc(doc(db, 'subjects', id))
  const handleDeleteMaterial = (id: string) => db && deleteDoc(doc(db, 'materials', id))

  const handleUpdateStudent = async () => {
    if (!db || !editingStudent) return
    setLoading(true)
    updateDoc(doc(db, 'students', editingStudent.id), { ...editingStudent }).then(() => {
      setEditingStudent(null)
      toast({ title: "Updated" })
    }).finally(() => setLoading(false))
  }

  const handleUpdateMaterial = async () => {
    if (!db || !editingMaterial) return
    setLoading(true)
    updateDoc(doc(db, 'materials', editingMaterial.id), { ...editingMaterial }).then(() => {
      setEditingMaterial(null)
      toast({ title: "Updated" })
    }).finally(() => setLoading(false))
  }

  const filteredCoursesForSheet = useMemo(() => {
    if (!courses) return [];
    if (overviewClassFilter === 'all') return courses;
    return courses.filter(c => c.id === overviewClassFilter);
  }, [courses, overviewClassFilter]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 bg-muted/50 p-1 flex-wrap h-auto">
          <TabsTrigger value="students" className="flex items-center gap-2 px-6"><GraduationCap size={16} /> Students</TabsTrigger>
          <TabsTrigger value="mentors" className="flex items-center gap-2 px-6"><UserRound size={16} /> Mentors</TabsTrigger>
          <TabsTrigger value="courses" className="flex items-center gap-2 px-6"><BookOpen size={16} /> Classes</TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center gap-2 px-6"><Library size={16} /> Materials & Subjects</TabsTrigger>
          <TabsTrigger value="academic-sheet" className="flex items-center gap-2 px-6"><ListChecks size={16} /> Overview Sheet</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-8">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 border-accent/20">
              <CardHeader><CardTitle className="text-accent flex items-center gap-2"><UserPlus size={20} /> Register Student</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleRegisterStudent} className="space-y-4">
                  <div className="space-y-2"><Label>Student ID</Label><Input value={studentForm.id} onChange={e => setStudentForm({...studentForm, id: e.target.value})} disabled={loading} /></div>
                  <div className="space-y-2"><Label>Password</Label><Input type="password" value={studentForm.password} onChange={e => setStudentForm({...studentForm, password: e.target.value})} disabled={loading} /></div>
                  <div className="space-y-2"><Label>Full Name</Label><Input value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} disabled={loading} /></div>
                  <div className="space-y-2"><Label>Class</Label>
                    <Select onValueChange={v => setStudentForm({...studentForm, class: v})} value={studentForm.class} disabled={loading}>
                      <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                      <SelectContent>{courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Mentor</Label>
                    <Select onValueChange={v => setStudentForm({...studentForm, mentorId: v})} value={studentForm.mentorId} disabled={loading}>
                      <SelectTrigger><SelectValue placeholder="Select Mentor" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">No Mentor</SelectItem>{mentors?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full bg-accent" disabled={loading}>Add Student</Button>
                </form>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2"><CardHeader><CardTitle>Registered Students</CardTitle></CardHeader>
              <CardContent><div className="rounded-md border overflow-hidden">
                <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead>Mentor</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                  <TableBody>{students?.map((s: any) => (
                    <TableRow key={s.id}><TableCell><div className="font-bold">{s.name}</div><div className="text-xs text-muted-foreground">{s.id}</div></TableCell>
                      <TableCell className="capitalize">{courses?.find(c => c.id === s.class)?.name || s.class}</TableCell>
                      <TableCell>{s.mentorId && s.mentorId !== 'none' ? mentors?.find(m => m.id === s.mentorId)?.name : 'None'}</TableCell>
                      <TableCell className="text-right flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setEditingStudent(s)}><Edit2 size={16} /></Button><ActivityViewer student={s} /></TableCell>
                    </TableRow>))}
                  </TableBody>
                </Table></div></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mentors" className="space-y-8">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 border-orange-200"><CardHeader><CardTitle className="text-orange-600 flex items-center gap-2"><UserPlus size={20} /> Register Mentor</CardTitle></CardHeader>
              <CardContent><form onSubmit={handleRegisterMentor} className="space-y-4">
                  <div className="space-y-2"><Label>Mentor ID</Label><Input value={mentorForm.id} onChange={e => setMentorForm({...mentorForm, id: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Password</Label><Input type="password" value={mentorForm.password} onChange={e => setMentorForm({...mentorForm, password: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Name</Label><Input value={mentorForm.name} onChange={e => setMentorForm({...mentorForm, name: e.target.value})} /></div>
                  <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600">Add Mentor</Button>
                </form></CardContent>
            </Card>
            <Card className="lg:col-span-2"><CardHeader><CardTitle>Mentors</CardTitle></CardHeader>
              <CardContent><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Expertise</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                  <TableBody>{mentors?.map((m: any) => (<TableRow key={m.id}><TableCell className="font-bold">{m.name}</TableCell><TableCell>{m.expertise}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setEditingMentor(m)}><Edit2 size={16} /></Button></TableCell></TableRow>))}</TableBody>
                </Table></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="courses" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 border-primary/20"><CardHeader><CardTitle className="text-primary flex items-center gap-2"><BookOpen size={20} /> Add Class</CardTitle></CardHeader>
              <CardContent><form onSubmit={handleRegisterCourse} className="space-y-4">
                  <div className="space-y-2"><Label>Class ID</Label><Input value={courseForm.id} onChange={e => setCourseForm({...courseForm, id: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Name</Label><Input value={courseForm.name} onChange={e => setCourseForm({...courseForm, name: e.target.value})} /></div>
                  <Button type="submit" className="w-full bg-primary">Add Class</Button>
                </form></CardContent>
            </Card>
            <Card className="lg:col-span-2"><CardHeader><CardTitle>Available Classes</CardTitle></CardHeader>
              <CardContent><Table><TableHeader><TableRow><TableHead>Class</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                  <TableBody>{courses?.map((c: any) => (<TableRow key={c.id}><TableCell className="font-bold">{c.name}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setEditingCourse(c)}><Edit2 size={16} /></Button></TableCell></TableRow>))}</TableBody>
                </Table></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="materials" className="space-y-8">
          <div className="flex justify-end mb-4"><BulkUploadDialog courses={courses || []} subjects={subjects || []} materials={materials || []} /></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-accent/20">
              <CardHeader><CardTitle className="text-accent flex items-center gap-2"><Plus size={20} /> Batch Manage Subjects</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleAddSubject} className="space-y-6">
                  <div className="space-y-2"><Label>Subject Name</Label><Input value={subjectForm.name} onChange={e => setSubjectForm({...subjectForm, name: e.target.value})} /></div>
                  <div className="space-y-3"><Label>Classes</Label><ScrollArea className="h-[200px] border rounded-lg p-3">
                      <div className="grid grid-cols-1 gap-3">{courses?.map(course => (
                        <div key={course.id} className="flex items-center space-x-2"><Checkbox id={course.id} checked={subjectForm.selectedCourseIds.includes(course.id)} onCheckedChange={() => {
                          setSubjectForm(p => ({...p, selectedCourseIds: p.selectedCourseIds.includes(course.id) ? p.selectedCourseIds.filter(id => id !== course.id) : [...p.selectedCourseIds, course.id]}))
                        }} /><label htmlFor={course.id}>{course.name}</label></div>))}
                      </div></ScrollArea></div>
                  <Button type="submit" className="w-full bg-accent" disabled={loading}>Create Subject</Button>
                </form>
                <div className="pt-6 border-t"><ScrollArea className="h-[250px]"><Table><TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Class</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                  <TableBody>{subjects?.map((s: any) => (<TableRow key={s.id}><TableCell>{s.name}</TableCell><TableCell>{courses?.find(c => c.id === s.courseId)?.name}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => handleDeleteSubject(s.id)}><Trash2 size={14} /></Button></TableCell></TableRow>))}</TableBody>
                </Table></ScrollArea></div>
              </CardContent>
            </Card>
            <Card className="border-primary/20">
              <CardHeader><CardTitle className="text-primary flex items-center gap-2"><Library size={20} /> Add Materials</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleUploadMaterial} className="space-y-4">
                  <div className="space-y-2"><Label>Title</Label><Input value={materialForm.title} onChange={e => setMaterialForm({...materialForm, title: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Type</Label><RadioGroup value={materialForm.type} onValueChange={(v: any) => setMaterialForm({...materialForm, type: v})} className="flex gap-4">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="video" id="v" /><Label htmlFor="v">Video</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="pdf" id="p" /><Label htmlFor="p">Note</Label></div>
                    </RadioGroup></div>
                  <div className="grid grid-cols-2 gap-4">
                    <Select onValueChange={v => setMaterialForm({...materialForm, courseId: v, subjectId: ''})} value={materialForm.courseId}><SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger><SelectContent>{courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
                    <Select onValueChange={v => setMaterialForm({...materialForm, subjectId: v})} value={materialForm.subjectId} disabled={!materialForm.courseId}><SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent>{subjects?.filter(s => s.courseId === materialForm.courseId).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div className="space-y-2"><Label>Chapter</Label><Input type="number" value={materialForm.chapter} onChange={e => setMaterialForm({...materialForm, chapter: Number(e.target.value)})} /></div>
                  <div className="space-y-2"><Label>URL</Label><Input value={materialForm.url} onChange={e => setMaterialForm({...materialForm, url: e.target.value})} /></div>
                  <Button className="w-full bg-primary" disabled={isUploading}>Save Material</Button>
                </form>
                <ScrollArea className="h-[250px]"><Table><TableHeader><TableRow><TableHead>Preview</TableHead><TableHead>Material</TableHead><TableHead>Details</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                  <TableBody>{sortedMaterials?.map((m: any) => {
                    const youtubeId = getYouTubeID(m.url);
                    const thumbnail = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/default.jpg` : null;
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="h-10 w-16 border rounded overflow-hidden flex items-center justify-center bg-muted/30">
                            {m.type === 'video' ? (
                              thumbnail ? (
                                <img src={thumbnail} alt="preview" className="w-full h-full object-cover" />
                              ) : <PlayCircle size={18} />
                            ) : <FileText size={18} />}
                          </div>
                        </TableCell>
                        <TableCell><span className="text-sm font-medium">{m.title}</span></TableCell>
                        <TableCell>
                           <div className="flex flex-col gap-0.5">
                             <span className="text-[10px] uppercase font-bold text-primary">{courses?.find(c => c.id === m.courseId)?.name}</span>
                             <span className="text-[9px] text-muted-foreground font-bold">Chapter {m.chapter}</span>
                           </div>
                        </TableCell>
                        <TableCell className="text-right flex gap-1"><Button variant="ghost" size="sm" onClick={() => setEditingMaterial(m)}><Edit2 size={12} /></Button><Button variant="ghost" size="sm" onClick={() => handleDeleteMaterial(m.id)}><Trash2 size={12} /></Button></TableCell>
                      </TableRow>
                    )
                  })}</TableBody>
                </Table></ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="academic-sheet">
          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ListChecks className="text-accent" /> Academic Resource Sheet</CardTitle>
              <CardDescription>Curriculum View: Classes → Subjects → Chapters → Materials.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4 p-4 bg-muted/30 rounded-2xl border border-dashed border-accent/20">
                <div className="flex-1"><Label className="text-[10px] uppercase">Class</Label><Select onValueChange={setOverviewClassFilter} value={overviewClassFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Classes</SelectItem>{courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="flex-1"><Label className="text-[10px] uppercase">Subject Search</Label><div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Search Subject..." value={overviewSubjectSearch} onChange={e => setOverviewSubjectSearch(e.target.value)} /></div></div>
              </div>
              
              <div className="rounded-xl border overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-1/4">Class & Subject</TableHead>
                      <TableHead className="w-1/6">Chapter</TableHead>
                      <TableHead>Materials Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCoursesForSheet?.flatMap(course => {
                      let cSubs = subjects?.filter(s => s.courseId === course.id) || []
                      if (overviewSubjectSearch) {
                        cSubs = cSubs.filter(s => s.name.toLowerCase().includes(overviewSubjectSearch.toLowerCase()))
                      }
                      
                      return cSubs.flatMap(sub => {
                        const total = getChapterCount(course.id, sub.name)
                        const rows = []
                        for (let ch = 1; ch <= total; ch++) {
                          const chMat = materials?.filter(m => m.courseId === course.id && m.subjectId === sub.id && Number(m.chapter) === ch) || []
                          rows.push({ 
                            ch, 
                            videos: chMat.filter(m => m.type === 'video'), 
                            pdfs: chMat.filter(m => m.type === 'pdf') 
                          })
                        }
                        
                        return rows.map((r, i) => (
                          <TableRow key={`${sub.id}-${r.ch}`} className="hover:bg-accent/5">
                            {i === 0 && (
                              <TableCell className="font-bold border-r align-top bg-muted/5" rowSpan={total}>
                                <div className="flex flex-col">
                                  <span>{sub.name}</span>
                                  <span className="text-[10px] text-muted-foreground uppercase font-normal">{course.name}</span>
                                </div>
                              </TableCell>
                            )}
                            <TableCell 
                              className="text-center border-r font-medium cursor-pointer hover:bg-accent hover:text-white transition-all group"
                              onClick={() => setSelectedChapterInfo({
                                className: course.name,
                                subjectName: sub.name,
                                chapter: r.ch,
                                materials: [...r.videos, ...r.pdfs]
                              })}
                            >
                              <div className="flex items-center justify-center gap-2">
                                Ch {r.ch}
                                <ExternalLink size={10} className="opacity-0 group-hover:opacity-100" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                  <Badge variant={r.videos.length > 0 ? "default" : "outline"} className={`text-[9px] h-5 min-w-8 justify-center ${r.videos.length > 0 ? 'bg-red-500 hover:bg-red-600' : 'text-muted-foreground opacity-50'}`}>
                                    V: {r.videos.length}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Badge variant={r.pdfs.length > 0 ? "default" : "outline"} className={`text-[9px] h-5 min-w-8 justify-center ${r.pdfs.length > 0 ? 'bg-blue-500 hover:bg-blue-600' : 'text-muted-foreground opacity-50'}`}>
                                    F: {r.pdfs.length}
                                  </Badge>
                                </div>
                                {r.videos.length > 0 && (
                                  <div className="flex gap-1 overflow-hidden">
                                    {r.videos.slice(0, 2).map(v => <span key={v.id} className="text-[8px] text-muted-foreground truncate max-w-[80px]">· {v.title}</span>)}
                                    {r.videos.length > 2 && <span className="text-[8px] text-muted-foreground">...</span>}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      })
                    })}
                    {filteredCoursesForSheet?.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">No data found for these filters.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingStudent} onOpenChange={() => setEditingStudent(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4"><Input value={editingStudent?.name || ''} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} /></div>
          <DialogFooter><Button onClick={handleUpdateStudent}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingMaterial} onOpenChange={() => setEditingMaterial(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit Material</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Label>Title</Label>
            <Input value={editingMaterial?.title || ''} onChange={e => setEditingMaterial({...editingMaterial, title: e.target.value})} />
            <Label>URL</Label>
            <Input value={editingMaterial?.url || ''} onChange={e => setEditingMaterial({...editingMaterial, url: e.target.value})} />
          </div>
          <DialogFooter><Button onClick={handleUpdateMaterial}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedChapterInfo} onOpenChange={() => setSelectedChapterInfo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">{selectedChapterInfo?.className} - {selectedChapterInfo?.subjectName}</DialogTitle>
            <DialogDescription>Chapter {selectedChapterInfo?.chapter} Resources</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedChapterInfo?.materials.length === 0 ? (
              <p className="text-center text-muted-foreground italic py-4">No materials uploaded for this chapter yet.</p>
            ) : (
              <div className="space-y-3">
                {selectedChapterInfo?.materials.map((m) => (
                  <div key={m.id} className="p-4 rounded-xl border bg-muted/20 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {m.type === 'video' ? <PlayCircle className="text-red-500 h-4 w-4" /> : <FileText className="text-blue-500 h-4 w-4" />}
                        <span className="font-bold text-sm">{m.title}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase">{m.type}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-primary truncate">
                      <Link className="h-3 w-3 shrink-0" />
                      <a href={m.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {m.url}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedChapterInfo(null)} className="rounded-xl">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface BulkRow {
  chapter: number;
  title: string;
  videoUrl: string;
  videoId?: string;
  pdfUrl: string;
  pdfId?: string;
  isFetchingTitle?: boolean;
}

function BulkUploadDialog({ courses, subjects, materials }: { courses: any[], subjects: any[], materials: any[] }) {
  const db = useFirestore()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [loading, setLoading] = useState(false)
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([])
  const [showConfirm, setShowConfirm] = useState(false)

  const selectedCourse = useMemo(() => courses.find(c => c.id === selectedClassId), [courses, selectedClassId])
  const selectedSubject = useMemo(() => subjects.find(s => s.id === selectedSubjectId), [subjects, selectedSubjectId])

  const chapterStatus = useMemo(() => {
    if (!selectedCourse || !selectedSubject) return []
    const total = getChapterCount(selectedCourse.id, selectedSubject.name)
    const result = []
    for (let i = 1; i <= total; i++) {
      const chMaterials = (materials || []).filter(m => m.courseId === selectedCourse.id && m.subjectId === selectedSubject.id && Number(m.chapter) === i)
      const video = chMaterials.find(m => m.type === 'video')
      const pdf = chMaterials.find(m => m.type === 'pdf')
      result.push({
        chapter: i,
        completed: !!video && !!pdf,
        title: video?.title || pdf?.title || '',
        videoUrl: video?.url || '',
        videoId: video?.id,
        pdfUrl: pdf?.url || '',
        pdfId: pdf?.id
      })
    }
    return result
  }, [selectedCourse, selectedSubject, materials])

  const incompleteChapters = useMemo(() => chapterStatus.filter(c => !c.completed), [chapterStatus])

  useEffect(() => {
    if (selectedClassId && selectedSubjectId) {
      const initialRows = incompleteChapters.slice(0, 1).map(c => ({
        chapter: c.chapter,
        title: c.title,
        videoUrl: c.videoUrl,
        videoId: c.videoId,
        pdfUrl: c.pdfUrl,
        pdfId: c.pdfId,
        isFetchingTitle: false
      }))
      setBulkRows(initialRows)
    } else {
      setBulkRows([])
    }
  }, [selectedClassId, selectedSubjectId, incompleteChapters])

  const handleAddRow = () => {
    if (bulkRows.length >= 20) return
    const currentChapterIds = bulkRows.map(r => r.chapter)
    const nextIncomplete = incompleteChapters.find(c => !currentChapterIds.includes(c.chapter))
    if (nextIncomplete) {
      setBulkRows([...bulkRows, {
        chapter: nextIncomplete.chapter,
        title: nextIncomplete.title,
        videoUrl: nextIncomplete.videoUrl,
        videoId: nextIncomplete.videoId,
        pdfUrl: nextIncomplete.pdfUrl,
        pdfId: nextIncomplete.pdfId,
        isFetchingTitle: false
      }])
    }
  }

  const handleUpdateRow = async (index: number, field: keyof BulkRow, value: any) => {
    const updated = [...bulkRows]
    updated[index] = { ...updated[index], [field]: value }
    setBulkRows(updated)

    if (field === 'videoUrl' && value.trim()) {
      const videoId = getYouTubeID(value);
      if (videoId) {
        updated[index].isFetchingTitle = true;
        setBulkRows([...updated]);
        const fetchedTitle = await fetchYouTubeTitle(value);
        if (fetchedTitle && !updated[index].title) {
          updated[index].title = fetchedTitle;
        }
        updated[index].isFetchingTitle = false;
        setBulkRows([...updated]);
      }
    }
  }

  const validateAndUpload = () => {
    const hasEmpty = bulkRows.some(r => !r.videoUrl.trim() || !r.pdfUrl.trim());
    if (hasEmpty) {
      setShowConfirm(true)
    } else {
      handleSaveBulk()
    }
  }

  const handleSaveBulk = async () => {
    if (!db || !selectedCourse || !selectedSubject) return
    setLoading(true)
    const batch = writeBatch(db)
    
    try {
      bulkRows.forEach(row => {
        const finalTitle = row.title.trim();
        
        if (row.videoUrl.trim()) {
          const vRef = row.videoId ? doc(db, 'materials', row.videoId) : doc(collection(db, 'materials'))
          batch.set(vRef, {
            title: finalTitle || `Chapter ${row.chapter} Video`,
            courseId: selectedCourse.id,
            subjectId: selectedSubject.id,
            type: 'video',
            url: row.videoUrl.trim(),
            chapter: row.chapter,
            createdAt: serverTimestamp()
          }, { merge: true })
        }
        
        if (row.pdfUrl.trim()) {
          const pRef = row.pdfId ? doc(db, 'materials', row.pdfId) : doc(collection(db, 'materials'))
          batch.set(pRef, {
            title: finalTitle ? `${finalTitle} (Notes)` : `Chapter ${row.chapter} Notes`,
            courseId: selectedCourse.id,
            subjectId: selectedSubject.id,
            type: 'pdf',
            url: row.pdfUrl.trim(),
            chapter: row.chapter,
            createdAt: serverTimestamp()
          }, { merge: true })
        }
      })
      await batch.commit()
      toast({ title: "Bulk Upload Successful" })
      setOpen(false)
      setShowConfirm(false)
    } catch (e) {
      console.error(e)
      toast({ variant: "destructive", title: "Upload Failed" })
    } finally {
      setLoading(false)
    }
  }

  const emptySummary = useMemo(() => {
    return bulkRows.filter(r => !r.videoUrl.trim() || !r.pdfUrl.trim())
      .map(r => `Chapter ${r.chapter} (${!r.videoUrl.trim() ? 'Video missing' : ''}${!r.videoUrl.trim() && !r.pdfUrl.trim() ? ', ' : ''}${!r.pdfUrl.trim() ? 'PDF missing' : ''})`)
      .join("; ")
  }, [bulkRows])

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button className="bg-primary rounded-xl"><Layers className="mr-2 h-4 w-4" /> Bulk Upload</Button></DialogTrigger>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2"><DialogTitle>Bulk Material Upload</DialogTitle></DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-2">
            <div className="space-y-6 pb-8">
              <div className="grid grid-cols-2 gap-4">
                <Select onValueChange={setSelectedClassId} value={selectedClassId}><SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger><SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
                <Select onValueChange={setSelectedSubjectId} value={selectedSubjectId} disabled={!selectedClassId}><SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent>{subjects.filter(s => s.courseId === selectedClassId).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
              </div>
              {selectedSubject && (
                <div className="space-y-6">
                  <div className="bg-muted/30 p-4 rounded-2xl border border-dashed flex flex-wrap gap-2">
                    {chapterStatus.filter(c => c.completed).map(c => <Badge key={c.chapter} variant="secondary" className="bg-green-100 text-green-700">Ch {c.chapter} (Done)</Badge>)}
                  </div>
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold uppercase text-primary">Bulk Entry</h4>
                    <Button variant="outline" size="sm" onClick={handleAddRow} disabled={bulkRows.length >= 20 || bulkRows.length >= incompleteChapters.length}><Plus size={14} className="mr-1" /> Add Row</Button>
                  </div>
                  <div className="space-y-3">
                    {bulkRows.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-3 items-end p-4 bg-accent/5 rounded-2xl border border-accent/10">
                        <div className="col-span-1 text-center font-bold text-primary">Ch {row.chapter}</div>
                        <div className="col-span-3">
                          <Label className="text-[10px] opacity-60">Chapter Title</Label>
                          <div className="relative">
                            <Input className="bg-white" placeholder="Auto-fetched if empty" value={row.title} onChange={e => handleUpdateRow(idx, 'title', e.target.value)} />
                            {row.isFetchingTitle && <Loader2 className="absolute right-2 top-2 h-4 w-4 animate-spin text-accent" />}
                          </div>
                        </div>
                        <div className="col-span-4"><Label className="text-[10px] opacity-60">Video URL</Label><Input className="bg-white" value={row.videoUrl} onChange={e => handleUpdateRow(idx, 'videoUrl', e.target.value)} /></div>
                        <div className="col-span-4"><Label className="text-[10px] opacity-60">PDF URL</Label><Input className="bg-white" value={row.pdfUrl} onChange={e => handleUpdateRow(idx, 'pdfUrl', e.target.value)} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="p-6 border-t bg-muted/20">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={validateAndUpload} disabled={loading || bulkRows.length === 0}>Upload All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-orange-500" /> Missing Information</AlertDialogTitle>
            <AlertDialogDescription>
              The following chapters are missing links: <br/><strong>{emptySummary}</strong><br/><br/>
              Would you like to go back and add the data, or continue and leave them empty (nil)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveBulk}>Continue Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ActivityViewer({ student }: { student: any }) {
  const db = useFirestore()
  const activityQuery = useMemo(() => db && student.id ? query(collection(db, 'students', student.id, 'activity'), orderBy('timestamp', 'desc')) : null, [db, student.id])
  const { data: activities, loading } = useCollection(activityQuery)

  const downloadCSV = () => {
    if (!activities) return
    const headers = ["Date", "Activity", "Duration"]
    const rows = activities.map((log: any) => [log.timestamp?.toDate()?.toLocaleString(), log.type, log.duration || 0])
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n")
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `report_${student.id}.csv`);
    document.body.appendChild(link);
    link.click();
  }

  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="ghost" size="sm" className="text-accent"><Activity size={16} /></Button></DialogTrigger>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle>Logs: {student.name}</DialogTitle>
          <Button variant="outline" size="sm" onClick={downloadCSV}><Download size={16} /></Button>
        </DialogHeader>
        <ScrollArea className="flex-1 mt-4">
          {loading ? <Loader2 className="animate-spin mx-auto mt-8" /> : (
            <div className="space-y-2">{activities?.map((log: any, i: number) => (
              <div key={i} className="p-3 border rounded-lg flex justify-between"><span>{log.type}</span><span className="text-muted-foreground">{log.timestamp?.toDate()?.toLocaleString()}</span></div>
            ))}</div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
