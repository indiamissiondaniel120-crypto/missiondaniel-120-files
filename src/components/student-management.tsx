
"use client"

import React, { useState, useMemo, useEffect } from 'react'
import { useFirestore } from '@/firebase'
import { collection, doc, setDoc, serverTimestamp, query, orderBy, updateDoc, deleteDoc, addDoc, writeBatch, where, getDocs } from 'firebase/firestore'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCollection } from '@/firebase'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserPlus, Activity, FileText, PlayCircle, Download, UserRound, GraduationCap, Edit2, BookOpen, Trash2, Plus, Loader2, Library, ListChecks, Search, ExternalLink, AlertTriangle, FileSpreadsheet, Layers, Link, MessageSquare, Video, Clock, CheckCircle2, MonitorPlay, Globe } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/auth-wrapper'

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
    return 12; 
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
  const { user } = useAuth()
  const db = useFirestore()
  const { toast } = useToast()
  
  const isAdmin = user?.role === 'admin';
  const isMentor = user?.role === 'mentor';

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(isMentor ? 'academic-sheet' : 'students')
  const [overviewClassFilter, setOverviewClassFilter] = useState<string>('all')
  const [overviewSubjectSearch, setOverviewSubjectSearch] = useState<string>('')

  const [studentForm, setStudentForm] = useState({ id: '', password: '', name: '', schoolName: '', location: '', class: '', mentorId: '' })
  const [mentorForm, setMentorForm] = useState({ id: '', password: '', name: '', expertise: '', phone: '' })
  const [courseForm, setCourseForm] = useState({ id: '', name: '', description: '', image: '' })
  const [subjectForm, setSubjectForm] = useState({ name: '', selectedCourseIds: [] as string[] })
  const [materialForm, setMaterialForm] = useState({ title: '', courseId: '', subjectId: '', type: 'video' as 'video' | 'pdf', url: '', chapter: 1 })

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

  const [selectedLiveSession, setSelectedLiveSession] = useState<any>(null);

  useEffect(() => {
    if (isMentor && activeTab !== 'academic-sheet') {
      setActiveTab('academic-sheet');
    }
  }, [isMentor, activeTab]);

  const studentsQuery = useMemo(() => db ? collection(db, 'students') : null, [db])
  const mentorsQuery = useMemo(() => db ? collection(db, 'mentors') : null, [db])
  const coursesQuery = useMemo(() => db ? collection(db, 'courses') : null, [db])
  const subjectsQuery = useMemo(() => db ? collection(db, 'subjects') : null, [db])
  const materialsQuery = useMemo(() => db ? collection(db, 'materials') : null, [db])
  const privateDoubtsQuery = useMemo(() => db ? collection(db, 'privateDoubts') : null, [db])
  const publicDoubtsQuery = useMemo(() => db ? collection(db, 'publicDoubts') : null, [db])
  const liveHistoryQuery = useMemo(() => db ? collection(db, 'liveClassHistory') : null, [db])

  const { data: students } = useCollection(studentsQuery)
  const { data: mentors } = useCollection(mentorsQuery)
  const { data: rawCourses } = useCollection(coursesQuery)
  const { data: subjects } = useCollection(subjectsQuery)
  const { data: materials } = useCollection(materialsQuery)
  const { data: allPrivateDoubts } = useCollection(privateDoubtsQuery)
  const { data: allPublicDoubts } = useCollection(publicDoubtsQuery)
  const { data: rawLiveHistory } = useCollection(liveHistoryQuery)

  const courses = useMemo(() => sortClasses(rawCourses || []), [rawCourses]);

  const sortedMaterials = useMemo(() => {
    if (!materials) return [];
    return [...materials].sort((a, b) => {
      if (a.courseId !== b.courseId) return a.courseId.localeCompare(b.courseId);
      if (a.subjectId !== b.subjectId) return a.subjectId.localeCompare(b.subjectId);
      return (Number(a.chapter) || 0) - (Number(b.chapter) || 0);
    });
  }, [materials]);

  const liveHistory = useMemo(() => {
    if (!rawLiveHistory) return null;
    return [...rawLiveHistory].sort((a, b) => {
      const tA = a.createdAt?.toDate?.()?.getTime() || 0;
      const tB = b.createdAt?.toDate?.()?.getTime() || 0;
      return tB - tA;
    });
  }, [rawLiveHistory]);

  const handleRegisterStudent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !studentForm.id || !studentForm.name || !isAdmin) return
    setLoading(true)
    
    const docRef = doc(db, 'students', studentForm.id);
    const data = { ...studentForm, createdAt: serverTimestamp() };
    setDoc(docRef, data)
      .then(() => {
        toast({ title: "Student Registered" })
        setStudentForm({ id: '', password: '', name: '', schoolName: '', location: '', class: '', mentorId: '' })
        setLoading(false)
      })
      .catch(async (serverError) => {
        setLoading(false)
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'write',
          requestResourceData: data
        }));
      });
  }

  const handleRegisterMentor = (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !mentorForm.id || !mentorForm.name || !isAdmin) return
    setLoading(true)
    const docRef = doc(db, 'mentors', mentorForm.id)
    const data = { ...mentorForm, createdAt: serverTimestamp() };
    setDoc(docRef, data)
      .then(() => {
        toast({ title: "Mentor Registered" })
        setMentorForm({ id: '', password: '', name: '', expertise: '', phone: '' })
        setLoading(false)
      })
      .catch(async (serverError) => {
        setLoading(false)
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'write',
          requestResourceData: data
        }));
      });
  }

  const handleRegisterCourse = (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !courseForm.id || !courseForm.name || !isAdmin) return
    setLoading(true)
    const docRef = doc(db, 'courses', courseForm.id)
    const data = { ...courseForm };
    setDoc(docRef, data)
      .then(() => {
        toast({ title: "Class Registered" })
        setCourseForm({ id: '', name: '', description: '', image: '' })
        setLoading(false)
      })
      .catch(async (serverError) => {
        setLoading(false)
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'write',
          requestResourceData: data
        }));
      });
  }

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !subjectForm.name || !isAdmin) return
    setLoading(true)
    const collRef = collection(db, 'subjects');
    const promises = subjectForm.selectedCourseIds.map(courseId => {
       const data = { name: subjectForm.name, courseId };
       return addDoc(collRef, data).catch(async (serverError) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: collRef.path,
            operation: 'create',
            requestResourceData: data
          }));
       });
    })
    Promise.all(promises).then(() => {
      setSubjectForm({ name: '', selectedCourseIds: [] })
      setLoading(false)
    });
  }

  const handleUploadMaterial = (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !materialForm.courseId || !materialForm.subjectId || !isAdmin) return
    setIsUploading(true)
    const collRef = collection(db, 'materials');
    const data = { ...materialForm, createdAt: serverTimestamp() };
    addDoc(collRef, data).then(() => {
      setIsUploading(false)
      setMaterialForm({ title: '', courseId: '', subjectId: '', type: 'video', url: '', chapter: 1 })
      toast({ title: "Material Added" })
    }).catch(async (serverError) => {
       setIsUploading(false);
       errorEmitter.emit('permission-error', new FirestorePermissionError({
         path: collRef.path,
         operation: 'create',
         requestResourceData: data
       }));
    });
  }

  const handleDeleteSubject = (id: string) => {
    if (!db || !isAdmin) return;
    const docRef = doc(db, 'subjects', id);
    deleteDoc(docRef).catch(async (serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      }));
    });
  }

  const handleDeleteMaterial = (id: string) => {
    if (!db || !isAdmin) return;
    const docRef = doc(db, 'materials', id);
    deleteDoc(docRef).catch(async (serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      }));
    });
  }

  const handleUpdateStudent = () => {
    if (!db || !editingStudent || !isAdmin) return
    setLoading(true)
    const studentRef = doc(db, 'students', editingStudent.id);
    updateDoc(studentRef, { ...editingStudent }).then(() => {
      setEditingStudent(null)
      toast({ title: "Updated" })
      setLoading(false)
    }).catch(async (serverError) => {
      setLoading(false)
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: studentRef.path,
        operation: 'update',
        requestResourceData: editingStudent
      }));
    });
  }

  const handleUpdateMaterial = () => {
    if (!db || !editingMaterial || !isAdmin) return
    setLoading(true)
    const docRef = doc(db, 'materials', editingMaterial.id);
    updateDoc(docRef, { ...editingMaterial }).then(() => {
      setEditingMaterial(null)
      toast({ title: "Updated" })
      setLoading(false)
    }).catch(async (serverError) => {
      setLoading(false)
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: editingMaterial
      }));
    });
  }

  const filteredCoursesForSheet = useMemo(() => {
    if (!courses) return [];
    if (overviewClassFilter === 'all') return courses;
    return courses.filter(c => c.id === overviewClassFilter);
  }, [courses, overviewClassFilter]);

  const downloadOverviewCSV = () => {
    if (!filteredCoursesForSheet || !subjects || !materials) return;
    
    const headers = ["Class", "Subject", "Chapter", "Videos Count", "PDFs Count", "Material Titles", "Video Links", "PDF Links"];
    const rows: any[] = [];

    filteredCoursesForSheet.forEach(course => {
      let cSubs = subjects.filter(s => s.courseId === course.id);
      if (overviewSubjectSearch) {
        cSubs = cSubs.filter(s => s.name.toLowerCase().includes(overviewSubjectSearch.toLowerCase()));
      }

      cSubs.forEach(sub => {
        const standardTotal = getChapterCount(course.id, sub.name);
        const dbChapters = (materials || [])
          .filter(m => m.courseId === course.id && m.subjectId === sub.id)
          .map(m => Number(m.chapter));
        
        const allChapters = Array.from(new Set([
          ...Array.from({ length: standardTotal }, (_, i) => i + 1),
          ...dbChapters
        ])).sort((a, b) => a - b);

        allChapters.forEach(ch => {
          const chMat = materials.filter(m => m.courseId === course.id && m.subjectId === sub.id && Number(m.chapter) === ch);
          const videos = chMat.filter(m => m.type === 'video');
          const pdfs = chMat.filter(m => m.type === 'pdf');
          const titles = chMat.map(m => m.title).join(" | ");
          const videoLinks = videos.map(v => v.url).join(" | ");
          const pdfLinks = pdfs.map(p => p.url).join(" | ");

          rows.push([
            course.name,
            sub.name,
            `Ch ${ch}`,
            videos.length,
            pdfs.length,
            titles,
            videoLinks,
            pdfLinks
          ]);
        });
      });
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `academic_overview_${overviewClassFilter === 'all' ? 'full' : overviewClassFilter}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 bg-muted/50 p-1 flex-wrap h-auto gap-1">
          {isAdmin && (
            <>
              <TabsTrigger value="students" className="flex items-center gap-2 px-3 md:px-6 text-xs md:text-sm"><GraduationCap size={14} /> Students</TabsTrigger>
              <TabsTrigger value="mentors" className="flex items-center gap-2 px-3 md:px-6 text-xs md:text-sm"><UserRound size={14} /> Mentors</TabsTrigger>
              <TabsTrigger value="courses" className="flex items-center gap-2 px-3 md:px-6 text-xs md:text-sm"><BookOpen size={14} /> Classes</TabsTrigger>
              <TabsTrigger value="materials" className="flex items-center gap-2 px-3 md:px-6 text-xs md:text-sm"><Library size={14} /> Materials</TabsTrigger>
              <TabsTrigger value="doubts" className="flex items-center gap-2 px-3 md:px-6 text-xs md:text-sm"><MessageSquare size={14} /> Private</TabsTrigger>
              <TabsTrigger value="public-doubts" className="flex items-center gap-2 px-3 md:px-6 text-xs md:text-sm"><Globe size={14} /> Public</TabsTrigger>
              <TabsTrigger value="live-attendance" className="flex items-center gap-2 px-3 md:px-6 text-xs md:text-sm relative">
                <Video size={14} /> Live
                {liveHistory?.some(h => !h.viewedByAdmin) && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white" />
                )}
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="academic-sheet" className="flex items-center gap-2 px-3 md:px-6 text-xs md:text-sm"><ListChecks size={14} /> Overview</TabsTrigger>
        </TabsList>

        {isAdmin && (
          <>
            <TabsContent value="students" className="space-y-6 md:space-y-8">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <Card className="lg:col-span-1 border-accent/20">
                  <CardHeader><CardTitle className="text-accent flex items-center gap-2 text-xl md:text-2xl"><UserPlus size={18} /> Register Student</CardTitle></CardHeader>
                  <CardContent>
                    <form onSubmit={handleRegisterStudent} className="space-y-4">
                      <div className="space-y-2"><Label className="text-xs">Student ID</Label><Input value={studentForm.id} onChange={e => setStudentForm({...studentForm, id: e.target.value})} disabled={loading} className="h-10 md:h-12" /></div>
                      <div className="space-y-2"><Label className="text-xs">Password</Label><Input type="password" value={studentForm.password} onChange={e => setStudentForm({...studentForm, password: e.target.value})} disabled={loading} className="h-10 md:h-12" /></div>
                      <div className="space-y-2"><Label className="text-xs">Full Name</Label><Input value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} disabled={loading} className="h-10 md:h-12" /></div>
                      <div className="space-y-2"><Label className="text-xs">Class</Label>
                        <Select onValueChange={v => setStudentForm({...studentForm, class: v})} value={studentForm.class} disabled={loading}>
                          <SelectTrigger className="h-10 md:h-12"><SelectValue placeholder="Select Class" /></SelectTrigger>
                          <SelectContent>{courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label className="text-xs">Mentor</Label>
                        <Select onValueChange={v => setStudentForm({...studentForm, mentorId: v})} value={studentForm.mentorId} disabled={loading}>
                          <SelectTrigger className="h-10 md:h-12"><SelectValue placeholder="Select Mentor" /></SelectTrigger>
                          <SelectContent><SelectItem value="none">No Mentor</SelectItem>{mentors?.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" className="w-full bg-accent py-5 md:py-6" disabled={loading}>Add Student</Button>
                    </form>
                  </CardContent>
                </Card>
                <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-xl md:text-2xl">Registered Students</CardTitle></CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader><TableRow><TableHead>Student</TableHead><TableHead className="hidden md:table-cell">Class</TableHead><TableHead className="hidden md:table-cell">Mentor</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                          <TableBody>{students?.map((s: any) => (
                            <TableRow key={s.id}><TableCell><div className="font-bold text-xs md:text-sm">{s.name}</div><div className="text-[10px] text-muted-foreground">{s.id} • {courses?.find(c => c.id === s.class)?.name}</div></TableCell>
                              <TableCell className="capitalize hidden md:table-cell">{courses?.find(c => c.id === s.class)?.name || s.class}</TableCell>
                              <TableCell className="hidden md:table-cell">{s.mentorId && s.mentorId !== 'none' ? mentors?.find(m => m.id === s.mentorId)?.name : 'None'}</TableCell>
                              <TableCell className="text-right flex justify-end gap-1 md:gap-2"><Button variant="ghost" size="sm" onClick={() => setEditingStudent(s)} className="h-8 w-8 p-0"><Edit2 size={14} /></Button><ActivityViewer student={s} mentors={mentors || []} /></TableCell>
                            </TableRow>))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="doubts" className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl md:text-2xl">Private Doubt Safety Monitor</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student/Mentor</TableHead>
                          <TableHead className="hidden md:table-cell">Question</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allPrivateDoubts?.map((doubt: any) => (
                          <TableRow key={doubt.id}>
                            <TableCell>
                              <div className="font-bold text-xs">{doubt.studentName}</div>
                              <div className="text-[10px] text-muted-foreground">To: {mentors?.find(m => m.id === doubt.mentorId)?.name || 'Unknown'}</div>
                              <div className="md:hidden text-[10px] italic mt-1 truncate max-w-[150px]">{doubt.question}</div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell max-w-xs truncate">{doubt.question}</TableCell>
                            <TableCell><Badge variant={doubt.status === 'answered' ? 'default' : 'outline'} className="text-[10px]">{doubt.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="public-doubts" className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl md:text-2xl"><Globe className="text-accent" /> Students Corner Doubts</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Public Student</TableHead>
                          <TableHead className="hidden md:table-cell">Question</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allPublicDoubts?.map((doubt: any) => (
                          <TableRow key={doubt.id}>
                            <TableCell>
                              <div className="font-bold text-xs">{doubt.studentName}</div>
                              <div className="text-[10px] text-muted-foreground">{doubt.className}</div>
                              <div className="md:hidden text-[10px] italic mt-1 truncate max-w-[150px]">{doubt.question}</div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell max-w-xs truncate">{doubt.question}</TableCell>
                            <TableCell>
                              <Badge variant={doubt.status === 'answered' ? 'default' : 'secondary'} className={`text-[10px] ${doubt.status === 'answered' ? 'bg-green-600' : ''}`}>
                                {doubt.status === 'answered' ? 'Answered' : 'Open'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="live-attendance" className="space-y-8">
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl md:text-2xl"><MonitorPlay className="text-accent" /> Live Class History</CardTitle>
                  <CardDescription className="text-xs md:text-sm">View attendance logs for daily sessions.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border overflow-hidden">
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead>Class Info</TableHead>
                            <TableHead className="hidden md:table-cell">Status</TableHead>
                            <TableHead className="text-right">Report</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {liveHistory?.map((session: any) => (
                            <TableRow key={session.id} className={!session.viewedByAdmin ? 'bg-primary/5 font-bold' : ''}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-xs md:text-sm font-black flex items-center gap-1">
                                    {session.title}
                                    {!session.viewedByAdmin && <Badge className="h-3 px-1 text-[7px] bg-red-500">NEW</Badge>}
                                  </span>
                                  <span className="text-[8px] md:text-[10px] text-muted-foreground uppercase">{session.className} • {session.subjectName}</span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <Badge variant={session.status === 'active' ? 'default' : 'secondary'} className={`text-[10px] ${session.status === 'active' ? 'bg-green-600' : ''}`}>
                                  {session.status === 'active' ? 'LIVE' : 'ENDED'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 md:h-10 text-[10px] md:text-sm gap-1 border-primary/20"
                                  onClick={() => setSelectedLiveSession(session)}
                                >
                                  <FileSpreadsheet size={14} /> View
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
            </TabsContent>
            
            <TabsContent value="mentors" className="space-y-8">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1 border-orange-200">
                  <CardHeader><CardTitle className="text-orange-600 flex items-center gap-2 text-xl md:text-2xl"><UserPlus size={18} /> Register Mentor</CardTitle></CardHeader>
                  <CardContent><form onSubmit={handleRegisterMentor} className="space-y-4">
                      <div className="space-y-2"><Label className="text-xs">Mentor ID</Label><Input value={mentorForm.id} onChange={e => setMentorForm({...mentorForm, id: e.target.value})} className="h-10 md:h-12" /></div>
                      <div className="space-y-2"><Label className="text-xs">Password</Label><Input type="password" value={mentorForm.password} onChange={e => setMentorForm({...mentorForm, password: e.target.value})} className="h-10 md:h-12" /></div>
                      <div className="space-y-2"><Label className="text-xs">Name</Label><Input value={mentorForm.name} onChange={e => setMentorForm({...mentorForm, name: e.target.value})} className="h-10 md:h-12" /></div>
                      <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 py-5">Add Mentor</Button>
                    </form></CardContent>
                </Card>
                <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-xl md:text-2xl">Mentors</CardTitle></CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <ScrollArea className="h-[400px]">
                        <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="hidden md:table-cell">Expertise</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                          <TableBody>{mentors?.map((m: any) => (<TableRow key={m.id}><TableCell className="font-bold text-xs md:text-sm">{m.name}</TableCell><TableCell className="hidden md:table-cell">{m.expertise}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setEditingMentor(m)} className="h-8 w-8 p-0"><Edit2 size={14} /></Button></TableCell></TableRow>))}</TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="courses" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1 border-primary/20"><CardHeader><CardTitle className="text-primary flex items-center gap-2 text-xl md:text-2xl"><BookOpen size={18} /> Add Class</CardTitle></CardHeader>
                  <CardContent><form onSubmit={handleRegisterCourse} className="space-y-4">
                      <div className="space-y-2"><Label className="text-xs">Class ID</Label><Input value={courseForm.id} onChange={e => setCourseForm({...courseForm, id: e.target.value})} className="h-10 md:h-12" /></div>
                      <div className="space-y-2"><Label className="text-xs">Name</Label><Input value={courseForm.name} onChange={e => setCourseForm({...courseForm, name: e.target.value})} className="h-10 md:h-12" /></div>
                      <Button type="submit" className="w-full bg-primary py-5">Add Class</Button>
                    </form></CardContent>
                </Card>
                <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-xl md:text-2xl">Classes</CardTitle></CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <ScrollArea className="h-[400px]">
                        <Table><TableHeader><TableRow><TableHead>Class</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                          <TableBody>{courses?.map((c: any) => (<TableRow key={c.id}><TableCell className="font-bold text-xs md:text-sm">{c.name}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setEditingCourse(c)} className="h-8 w-8 p-0"><Edit2 size={14} /></Button></TableCell></TableRow>))}</TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="materials" className="space-y-6 md:space-y-8">
              <div className="flex justify-end mb-2"><BulkUploadDialog courses={courses || []} subjects={subjects || []} materials={materials || []} /></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                <Card className="border-accent/20">
                  <CardHeader><CardTitle className="text-accent flex items-center gap-2 text-lg md:text-xl"><Plus size={18} /> Manage Subjects</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <form onSubmit={handleAddSubject} className="space-y-4">
                      <div className="space-y-2"><Label className="text-xs">Subject Name</Label><Input value={subjectForm.name} onChange={e => setSubjectForm({...subjectForm, name: e.target.value})} className="h-10 md:h-12" /></div>
                      <div className="space-y-2"><Label className="text-xs">Select Classes</Label>
                        <ScrollArea className="h-[120px] md:h-[200px] border rounded-lg p-2">
                          <div className="grid grid-cols-1 gap-2">{courses?.map(course => (
                            <div key={course.id} className="flex items-center space-x-2"><Checkbox id={course.id} checked={subjectForm.selectedCourseIds.includes(course.id)} onCheckedChange={() => {
                              setSubjectForm(p => ({...p, selectedCourseIds: p.selectedCourseIds.includes(course.id) ? p.selectedCourseIds.filter(id => id !== course.id) : [...p.selectedCourseIds, course.id]}))
                            }} /><label htmlFor={course.id} className="text-xs md:text-sm">{course.name}</label></div>))}
                          </div></ScrollArea></div>
                      <Button type="submit" className="w-full bg-accent h-12" disabled={loading}>Create Subject</Button>
                    </form>
                    <div className="pt-4 border-t"><ScrollArea className="h-[200px] md:h-[250px]"><Table><TableHeader><TableRow><TableHead>Subject</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                      <TableBody>{subjects?.map((s: any) => (<TableRow key={s.id}><TableCell className="text-xs">{s.name} ({courses?.find(c => c.id === s.courseId)?.name})</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => handleDeleteSubject(s.id)} className="h-8 w-8 p-0"><Trash2 size={12} /></Button></TableCell></TableRow>))}</TableBody>
                    </Table></ScrollArea></div>
                  </CardContent>
                </Card>
                <Card className="border-primary/20">
                  <CardHeader><CardTitle className="text-primary flex items-center gap-2 text-lg md:text-xl"><Library size={18} /> Add Materials</CardTitle></CardHeader>
                  <CardContent className="space-y-4 md:space-y-6">
                    <form onSubmit={handleUploadMaterial} className="space-y-4">
                      <div className="space-y-2"><Label className="text-xs">Title</Label><Input value={materialForm.title} onChange={e => setMaterialForm({...materialForm, title: e.target.value})} className="h-10 md:h-12" /></div>
                      <div className="space-y-2"><Label className="text-xs">Type</Label><RadioGroup value={materialForm.type} onValueChange={(v: any) => setMaterialForm({...materialForm, type: v})} className="flex gap-4">
                          <div className="flex items-center space-x-2"><RadioGroupItem value="video" id="v" /><Label htmlFor="v" className="text-xs">Video</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="pdf" id="p" /><Label htmlFor="p" className="text-xs">Note</Label></div>
                        </RadioGroup></div>
                      <div className="grid grid-cols-2 gap-2 md:gap-4">
                        <Select onValueChange={v => setMaterialForm({...materialForm, courseId: v, subjectId: ''})} value={materialForm.courseId}><SelectTrigger className="h-10 md:h-12 text-xs"><SelectValue placeholder="Class" /></SelectTrigger><SelectContent>{courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
                        <Select onValueChange={v => setMaterialForm({...materialForm, subjectId: v})} value={materialForm.subjectId} disabled={!materialForm.courseId}><SelectTrigger className="h-10 md:h-12 text-xs"><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent>{subjects?.filter(s => s.courseId === materialForm.courseId).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label className="text-xs">Chapter</Label><Input type="number" value={materialForm.chapter} onChange={e => setMaterialForm({...materialForm, chapter: Number(e.target.value)})} className="h-10 md:h-12" /></div>
                        <div className="space-y-2"><Label className="text-xs">URL</Label><Input value={materialForm.url} onChange={e => setMaterialForm({...materialForm, url: e.target.value})} className="h-10 md:h-12" /></div>
                      </div>
                      <Button className="w-full bg-primary h-12" disabled={isUploading}>Save Material</Button>
                    </form>
                    <ScrollArea className="h-[200px] md:h-[250px]"><Table><TableHeader><TableRow><TableHead>Material</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                      <TableBody>{sortedMaterials?.map((m: any) => (
                          <TableRow key={m.id}>
                            <TableCell>
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <span className="text-xs font-bold truncate">{m.title}</span>
                                <span className="text-[9px] uppercase text-primary/60">{courses?.find(c => c.id === m.courseId)?.name} • Ch {m.chapter}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => setEditingMaterial(m)} className="h-7 w-7 p-0"><Edit2 size={12} /></Button><Button variant="ghost" size="sm" onClick={() => handleDeleteMaterial(m.id)} className="h-7 w-7 p-0"><Trash2 size={12} /></Button></TableCell>
                          </TableRow>
                        )
                      )}</TableBody>
                    </Table></ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </>
        )}

        <TabsContent value="academic-sheet">
          <Card className="border-accent/20">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg md:text-2xl"><ListChecks className="text-accent" /> Academic Resource Sheet</CardTitle>
              </div>
              <Button onClick={downloadOverviewCSV} className="bg-accent rounded-xl gap-2 w-full sm:w-auto h-10 md:h-12">
                <Download size={16} /> Export CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 md:p-4 bg-muted/30 rounded-xl md:rounded-2xl border border-dashed border-accent/20">
                <div className="space-y-1"><Label className="text-[9px] md:text-[10px] uppercase">Class</Label><Select onValueChange={setOverviewClassFilter} value={overviewClassFilter}><SelectTrigger className="h-9 md:h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Classes</SelectItem>{courses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label className="text-[9px] md:text-[10px] uppercase">Subject Search</Label><div className="relative"><Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input className="pl-8 h-9 md:h-11" placeholder="Search..." value={overviewSubjectSearch} onChange={e => setOverviewSubjectSearch(e.target.value)} /></div></div>
              </div>
              
              <div className="rounded-xl border overflow-hidden shadow-sm">
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-1/3 text-xs">Class & Subject</TableHead>
                        <TableHead className="w-1/6 text-xs">Ch</TableHead>
                        <TableHead className="text-xs">Stats</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCoursesForSheet?.flatMap(course => {
                        let cSubs = subjects?.filter(s => s.courseId === course.id) || []
                        if (overviewSubjectSearch) {
                          cSubs = cSubs.filter(s => s.name.toLowerCase().includes(overviewSubjectSearch.toLowerCase()))
                        }
                        
                        return cSubs.flatMap(sub => {
                          const standardTotal = getChapterCount(course.id, sub.name)
                          const dbChapters = (materials || [])
                            .filter(m => m.courseId === course.id && m.subjectId === sub.id)
                            .map(m => Number(m.chapter))
                          
                          const allChapters = Array.from(new Set([
                            ...Array.from({ length: standardTotal }, (_, i) => i + 1),
                            ...dbChapters
                          ])).sort((a, b) => a - b)

                          const totalChaptersCount = allChapters.length
                          
                          return allChapters.map((ch, i) => {
                            const chMat = materials?.filter(m => m.courseId === course.id && m.subjectId === sub.id && Number(m.chapter) === ch) || []
                            const r = { 
                              ch, 
                              videos: chMat.filter(m => m.type === 'video'), 
                              pdfs: chMat.filter(m => m.type === 'pdf') 
                            }
                            
                            return (
                              <TableRow key={`${sub.id}-${ch}`} className="hover:bg-accent/5">
                                {i === 0 && (
                                  <TableCell className="font-bold border-r align-top bg-muted/5 text-[10px] md:text-sm" rowSpan={totalChaptersCount}>
                                    <div className="flex flex-col truncate max-w-[100px] md:max-w-none">
                                      <span>{sub.name}</span>
                                      <span className="text-[8px] text-muted-foreground uppercase font-normal">{course.name}</span>
                                    </div>
                                  </TableCell>
                                )}
                                <TableCell 
                                  className="text-center border-r font-medium cursor-pointer hover:bg-accent hover:text-white transition-all text-[10px] md:text-sm"
                                  onClick={() => setSelectedChapterInfo({
                                    className: course.name,
                                    subjectName: sub.name,
                                    chapter: ch,
                                    materials: [...r.videos, ...r.pdfs]
                                  })}
                                >
                                  {ch}
                                </TableCell>
                                <TableCell className="p-2">
                                  <div className="flex items-center gap-1 md:gap-3">
                                    <Badge variant={r.videos.length > 0 ? "default" : "outline"} className={`text-[8px] h-4 min-w-6 justify-center ${r.videos.length > 0 ? 'bg-red-500' : 'opacity-40'}`}>V:{r.videos.length}</Badge>
                                    <Badge variant={r.pdfs.length > 0 ? "default" : "outline"} className={`text-[8px] h-4 min-w-6 justify-center ${r.pdfs.length > 0 ? 'bg-blue-500' : 'opacity-40'}`}>P:{r.pdfs.length}</Badge>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        })
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingStudent} onOpenChange={() => setEditingStudent(null)}>
        <DialogContent className="w-[95vw] rounded-xl"><DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4"><Input value={editingStudent?.name || ''} onChange={e => setEditingStudent({...editingStudent, name: e.target.value})} className="h-12" /></div>
          <DialogFooter><Button onClick={handleUpdateStudent} className="w-full h-12">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingMaterial} onOpenChange={() => setEditingMaterial(null)}>
        <DialogContent className="w-[95vw] rounded-xl"><DialogHeader><DialogTitle>Edit Material</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Label className="text-xs">Title</Label>
            <Input value={editingMaterial?.title || ''} onChange={e => setEditingMaterial({...editingMaterial, title: e.target.value})} className="h-12" />
            <Label className="text-xs">URL</Label>
            <Input value={editingMaterial?.url || ''} onChange={e => setEditingMaterial({...editingMaterial, url: e.target.value})} className="h-12" />
          </div>
          <DialogFooter><Button onClick={handleUpdateMaterial} className="w-full h-12">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedChapterInfo} onOpenChange={() => setSelectedChapterInfo(null)}>
        <DialogContent className="max-w-md w-[95vw] rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-primary text-base md:text-lg">{selectedChapterInfo?.className} - {selectedChapterInfo?.subjectName}</DialogTitle>
            <DialogDescription className="text-xs">Chapter {selectedChapterInfo?.chapter} Resources</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto pr-1">
            {selectedChapterInfo?.materials.length === 0 ? (
              <p className="text-center text-muted-foreground italic py-4 text-xs">No materials uploaded for this chapter yet.</p>
            ) : (
              <div className="space-y-3">
                {selectedChapterInfo?.materials.map((m) => (
                  <div key={m.id} className="p-3 rounded-xl border bg-muted/20 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        {m.type === 'video' ? <PlayCircle className="text-red-500 h-3.5 w-3.5" /> : <FileText className="text-blue-500 h-3.5 w-3.5" />}
                        <span className="font-bold text-xs truncate">{m.title}</span>
                      </div>
                      <Badge variant="outline" className="text-[8px] uppercase">{m.type}</Badge>
                    </div>
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary truncate hover:underline flex items-center gap-1.5">
                      <Link className="h-2.5 w-2.5 shrink-0" /> {m.url}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedChapterInfo(null)} className="rounded-xl w-full h-11">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LiveAttendanceViewer session={selectedLiveSession} onClose={() => setSelectedLiveSession(null)} />
    </div>
  )
}

function LiveAttendanceViewer({ session, onClose }: { session: any, onClose: () => void }) {
  const db = useFirestore()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!session || !db) return;
    setLoading(true);

    if (!session.viewedByAdmin) {
      updateDoc(doc(db, 'liveClassHistory', session.id), { viewedByAdmin: true }).catch(console.error);
    }

    const q = query(collection(db, 'liveAttendanceLogs'), where('sessionId', '==', session.id));
    getDocs(q).then(snap => {
      const fetchedLogs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      setLogs(fetchedLogs.sort((a: any, b: any) => (a.timestamp?.toDate()?.getTime() || 0) - (b.timestamp?.toDate()?.getTime() || 0)));
      setLoading(false);
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });
  }, [session, db]);

  const downloadReport = () => {
    if (!logs.length) return;
    const headers = ["User Name", "User Role", "Pulse Timestamp"];
    const rows = logs.map(l => [
      l.userName,
      l.userRole,
      l.timestamp?.toDate()?.toLocaleString() || ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `live_attendance_${session.historyId || session.id}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  if (!session) return null;

  return (
    <Dialog open={!!session} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden w-[95vw] rounded-2xl">
        <DialogHeader className="p-6 md:p-8 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-lg md:text-2xl font-black truncate">{session.title}</DialogTitle>
              <DialogDescription className="font-bold text-[10px] md:text-sm">
                {session.className} • {session.subjectName}
              </DialogDescription>
            </div>
            <Button onClick={downloadReport} className="bg-accent rounded-xl h-10 md:h-12 gap-2 text-xs w-full md:w-auto" disabled={logs.length === 0}>
              <Download size={14} /> Export Report
            </Button>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 p-4 md:p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
              <p className="font-black text-xs text-muted-foreground animate-pulse">Compiling logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 bg-muted/10 border-4 border-dashed rounded-[2rem] border-primary/10">
              <Clock size={32} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="font-black text-xs text-muted-foreground/60 italic">No attendance pulses recorded.</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs">Role</TableHead>
                    <TableHead className="text-right text-xs">Marks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(logs.reduce((acc: any, log: any) => {
                    if (!acc[log.userId]) {
                      acc[log.userId] = { name: log.userName, role: log.userRole, count: 0, last: log.timestamp };
                    }
                    acc[log.userId].count++;
                    if (log.timestamp?.toDate() > acc[log.userId].last?.toDate()) {
                      acc[log.userId].last = log.timestamp;
                    }
                    return acc;
                  }, {})).map((user: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-bold text-[11px] md:text-sm">
                        {user.name}
                        <div className="sm:hidden text-[9px] text-muted-foreground uppercase">{user.role}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell"><Badge variant="outline" className="text-[9px] uppercase font-black">{user.role}</Badge></TableCell>
                      <TableCell className="text-right"><Badge className="bg-primary/10 text-primary text-[9px] md:text-[10px]">{user.count} pulses</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ScrollArea>
        <DialogFooter className="p-4 md:p-6 border-t bg-muted/20">
          <Button onClick={onClose} className="rounded-xl h-11 md:h-12 w-full md:w-auto px-8 font-black">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ActivityViewer({ student, mentors }: { student: any, mentors: any[] }) {
  const db = useFirestore()
  const activityQuery = useMemo(() => db && student.id ? query(collection(db, 'students', student.id, 'activity'), orderBy('timestamp', 'desc')) : null, [db, student.id])
  const { data: activities, loading } = useCollection(activityQuery)

  const downloadAttendanceCSV = () => {
    if (!activities) return
    const headers = ["Date", "Event Type", "Item/Title", "Chapter", "Duration (Seconds)"]
    const rows = activities.map((log: any) => {
      const date = log.timestamp?.toDate()?.toLocaleString() || '';
      const type = log.type || '';
      const item = log.metadata?.title || (log.type === 'login' || log.type === 'logout' ? '' : '-');
      const chapter = log.metadata?.chapter || '-';
      const duration = log.duration || 0;
      return [date, type, item, chapter, duration]
    })
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `attendance_report_${student.id}.csv`);
    document.body.appendChild(link);
    link.click();
  }

  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-accent"><Activity size={14} /></Button></DialogTrigger>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 w-[95vw] rounded-2xl">
        <DialogHeader className="p-6 md:p-8 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <DialogTitle className="truncate text-base md:text-xl">Activity: {student.name}</DialogTitle>
          </div>
          <Button variant="outline" size="sm" onClick={downloadAttendanceCSV} className="gap-1.5 h-10 w-full sm:w-auto rounded-xl border-accent/20 text-xs">
            <FileSpreadsheet size={14} /> Attendance
          </Button>
        </DialogHeader>
        <ScrollArea className="flex-1 p-6 md:p-8">
          {loading ? <Loader2 className="animate-spin mx-auto mt-8 h-8 w-8 text-primary" /> : (
            <div className="space-y-3">
              {activities?.length === 0 && <p className="text-center text-muted-foreground py-8 italic text-xs">No activity recorded.</p>}
              {activities?.map((log: any, i: number) => (
                <div key={i} className="p-3 md:p-4 border rounded-xl flex items-center justify-between bg-muted/10 hover:bg-muted/20 transition-colors">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-bold text-[10px] md:text-sm uppercase text-primary truncate max-w-[150px] md:max-w-none">{log.type?.replace(/_/g, ' ')}</span>
                    <span className="text-[9px] md:text-xs text-muted-foreground truncate">
                      {log.metadata?.title ? `${log.metadata.title} (Ch ${log.metadata.chapter})` : ''}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[9px] md:text-xs font-medium text-foreground">{log.timestamp?.toDate()?.toLocaleTimeString()}</div>
                    <div className="text-[8px] md:text-[10px] text-muted-foreground">{log.timestamp?.toDate()?.toLocaleDateString()}</div>
                    {log.duration > 0 && <div className="text-[8px] md:text-[10px] text-accent font-bold mt-0.5">{log.duration}s</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <DialogFooter className="p-4 md:p-6 border-t bg-muted/20">
          <DialogTrigger asChild><Button className="w-full h-11 md:h-12 rounded-xl font-black">Close</Button></DialogTrigger>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BulkUploadDialog({ courses, subjects, materials }: { courses: any[], subjects: any[], materials: any[] }) {
  const db = useFirestore()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [loading, setLoading] = useState(false)
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([])

  const selectedCourse = useMemo(() => courses.find(c => c.id === selectedClassId), [courses, selectedClassId])
  const selectedSubject = useMemo(() => subjects.find(s => s.id === selectedSubjectId), [subjects, selectedSubjectId])

  const chapterStatus = useMemo(() => {
    if (!selectedCourse || !selectedSubject) return []
    const standardTotal = getChapterCount(selectedCourse.id, selectedSubject.name)
    const dbChapters = (materials || [])
      .filter(m => m.courseId === selectedCourse.id && m.subjectId === selectedSubject.id)
      .map(m => Number(m.chapter))
    
    const allChapterNums = Array.from(new Set([
      ...Array.from({ length: standardTotal }, (_, i) => i + 1),
      ...dbChapters
    ])).sort((a, b) => a - b)

    const result = []
    for (const i of allChapterNums) {
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
    const currentRowsChapters = bulkRows.map(r => r.chapter)
    const nextIncomplete = incompleteChapters.find(c => !currentRowsChapters.includes(c.chapter))
    
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
    } else {
      const maxChapter = Math.max(0, ...chapterStatus.map(c => c.chapter), ...currentRowsChapters)
      setBulkRows([...bulkRows, {
        chapter: maxChapter + 1,
        title: '',
        videoUrl: '',
        pdfUrl: '',
        isFetchingTitle: false
      }])
    }
  }

  const handleUpdateRow = async (index: number, field: keyof BulkRow, value: any) => {
    const updated = [...bulkRows]
    updated[index] = { ...updated[index], [field]: value }
    setBulkRows(updated)

    if (field === 'videoUrl' && typeof value === 'string' && value.trim()) {
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

  const handleSaveBulk = () => {
    if (!db || !selectedCourse || !selectedSubject) return
    setLoading(true)
    const batch = writeBatch(db)
    
    bulkRows.forEach(row => {
      const finalTitle = row.title.trim();
      
      if (row.videoUrl.trim()) {
        const vRef = row.videoId ? doc(db, 'materials', row.videoId) : doc(collection(db, 'materials'))
        const data = {
          title: finalTitle || `Chapter ${row.chapter} Video`,
          courseId: selectedCourse.id,
          subjectId: selectedSubject.id,
          type: 'video',
          url: row.videoUrl.trim(),
          chapter: Number(row.chapter),
          createdAt: serverTimestamp()
        };
        batch.set(vRef, data, { merge: true })
      }
      
      if (row.pdfUrl.trim()) {
        const pRef = row.pdfId ? doc(db, 'materials', row.pdfId) : doc(collection(db, 'materials'))
        const data = {
          title: finalTitle ? `${finalTitle} (Notes)` : `Chapter ${row.chapter} Notes`,
          courseId: selectedCourse.id,
          subjectId: selectedSubject.id,
          type: 'pdf',
          url: row.pdfUrl.trim(),
          chapter: Number(row.chapter),
          createdAt: serverTimestamp()
        };
        batch.set(pRef, data, { merge: true })
      }
    })

    batch.commit()
      .then(() => {
        toast({ title: "Bulk Upload Successful" })
        setOpen(false)
        setLoading(false)
      })
      .catch(async (serverError) => {
        setLoading(false)
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'materials',
          operation: 'write'
        }));
      });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="bg-primary rounded-xl text-xs md:text-sm h-10 md:h-11"><Layers className="mr-2 h-3.5 w-3.5" /> Bulk Upload</Button></DialogTrigger>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden w-[98vw] rounded-2xl">
        <DialogHeader className="p-6 pb-2"><DialogTitle className="text-lg md:text-2xl">Bulk Material Upload</DialogTitle></DialogHeader>
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-2">
          <div className="space-y-6 pb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select onValueChange={setSelectedClassId} value={selectedClassId}><SelectTrigger className="h-11"><SelectValue placeholder="Class" /></SelectTrigger><SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
              <Select onValueChange={setSelectedSubjectId} value={selectedSubjectId} disabled={!selectedClassId}><SelectTrigger className="h-11"><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent>{subjects.filter(s => s.courseId === selectedClassId).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
            </div>
            {selectedSubject && (
              <div className="space-y-6">
                <div className="bg-muted/30 p-3 md:p-4 rounded-xl md:rounded-2xl border border-dashed flex flex-wrap gap-2">
                  {chapterStatus.filter(c => c.completed).map(c => <Badge key={c.chapter} variant="secondary" className="bg-green-100 text-green-700 text-[10px]">Ch {c.chapter} Done</Badge>)}
                </div>
                <div className="flex justify-between items-center px-1">
                  <h4 className="text-xs font-bold uppercase text-primary">Bulk Entry</h4>
                  <Button variant="outline" size="sm" onClick={handleAddRow} disabled={bulkRows.length >= 20} className="h-9 rounded-lg"><Plus size={14} className="mr-1" /> Add Row</Button>
                </div>
                <div className="space-y-4">
                  {bulkRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-4 bg-accent/5 rounded-xl border border-accent/10">
                      <div className="sm:col-span-1">
                        <Label className="text-[9px] opacity-60">Ch #</Label>
                        <Input type="number" className="bg-white h-10" value={row.chapter} onChange={e => handleUpdateRow(idx, 'chapter', Number(e.target.value))} />
                      </div>
                      <div className="sm:col-span-3">
                        <Label className="text-[9px] opacity-60">Title</Label>
                        <Input className="bg-white h-10 text-xs" placeholder="Fetched title" value={row.title} onChange={e => handleUpdateRow(idx, 'title', e.target.value)} />
                      </div>
                      <div className="sm:col-span-4"><Label className="text-[9px] opacity-60">Video URL</Label><Input className="bg-white h-10 text-[10px]" value={row.videoUrl} onChange={e => handleUpdateRow(idx, 'videoUrl', e.target.value)} /></div>
                      <div className="sm:col-span-4"><Label className="text-[9px] opacity-60">PDF URL</Label><Input className="bg-white h-10 text-[10px]" value={row.pdfUrl} onChange={e => handleUpdateRow(idx, 'pdfUrl', e.target.value)} /></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="p-4 md:p-6 border-t bg-muted/20 flex flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} className="w-full sm:w-auto h-11">Cancel</Button>
          <Button onClick={handleSaveBulk} disabled={loading || bulkRows.length === 0} className="w-full sm:w-auto h-11">Upload All</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
