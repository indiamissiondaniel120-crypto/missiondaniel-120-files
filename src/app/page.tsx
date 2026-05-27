'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AuthProvider, useAuth } from '@/components/auth-wrapper';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AICompanion } from '@/components/ai-companion';
import { Badge } from '@/components/ui/badge';
import { StudentManagement } from '@/components/student-management';
import { InactivityMonitor } from '@/components/inactivity-monitor';
import { ChatInterface } from '@/components/chat-interface';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Home, BookOpen, PlayCircle, ChevronRight, GraduationCap, Users, FileText, MessageSquare, Sparkles, ShieldCheck, HeartHandshake, Search, Send, Edit2, Loader2, UserRound, ArrowLeft, Pencil, Lightbulb, User, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { FirebaseClientProvider, useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, doc, updateDoc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

function getYouTubeEmbedUrl(url: string) {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}?modestbranding=1&rel=0&color=white`;
  }
  return url;
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

function DecorativeGraphics() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-20 left-10 text-primary/10 floating-graphic" style={{ animationDelay: '0s' }}>
        <GraduationCap size={120} />
      </div>
      <div className="absolute top-40 right-20 text-accent/10 floating-graphic" style={{ animationDelay: '1s' }}>
        <BookOpen size={100} />
      </div>
      <div className="absolute bottom-20 left-1/4 text-primary/5 floating-graphic" style={{ animationDelay: '2s' }}>
        <Lightbulb size={150} />
      </div>
      <div className="absolute top-1/2 right-1/4 text-accent/5 floating-graphic" style={{ animationDelay: '3.5s' }}>
        <Sparkles size={130} />
      </div>
      <div className="absolute bottom-40 right-10 text-primary/10 floating-graphic" style={{ animationDelay: '4.5s' }}>
        <Pencil size={90} />
      </div>
      <div className="absolute top-10 left-1/2 text-accent/10 floating-graphic" style={{ animationDelay: '5s' }}>
        <Sparkles size={80} />
      </div>
      <div className="absolute bottom-0 right-0 w-full h-1/3 bg-primary/5 -skew-y-3 origin-bottom-right" />
    </div>
  );
}

function PublicDoubtsQueue({ mentorId, mentorName }: { mentorId: string, mentorName: string }) {
  const db = useFirestore();
  const doubtsQuery = useMemo(() => db ? query(collection(db, 'publicDoubts'), where('status', 'in', ['open', 'answered'])) : null, [db]);
  const { data: doubts } = useCollection(doubtsQuery);

  const myAssigned = doubts?.filter(d => d.mentorId === mentorId) || [];
  const unassigned = doubts?.filter(d => d.status === 'open') || [];

  const handleClaim = (doubtId: string) => {
    if (!db) return;
    const docRef = doc(db, 'publicDoubts', doubtId);
    const updateData = {
      status: 'answered',
      mentorId: mentorId,
      assignedAt: serverTimestamp()
    };
    updateDoc(docRef, updateData).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: updateData
      }));
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold flex items-center gap-2 text-primary"><HeartHandshake className="text-accent" /> Students Corner Doubts</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-accent/20 h-[500px] flex flex-col">
          <CardHeader><CardTitle className="text-sm">Public Doubts I Responded To ({myAssigned.length})</CardTitle></CardHeader>
          <CardContent className="space-y-4 overflow-y-auto flex-1">
            {myAssigned.length === 0 && <p className="text-xs text-muted-foreground italic">No active assignments.</p>}
            {myAssigned.map(d => (
              <div key={d.id} className="p-4 border rounded-2xl bg-accent/5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm">{d.className}</p>
                    <p className="text-xs text-muted-foreground">Question: {d.question}</p>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ChatInterface 
                    chatId={`public_${d.id}`} 
                    currentUser={{ id: mentorId, name: mentorName, role: 'mentor' }} 
                    otherUserName="Public Student" 
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="h-[500px] flex flex-col">
          <CardHeader><CardTitle className="text-sm">Open Doubt Pool ({unassigned.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 flex-1 overflow-y-auto">
            {unassigned.length === 0 && <p className="text-xs text-muted-foreground italic">Pool is currently empty.</p>}
            {unassigned.map(d => (
              <div key={d.id} className="p-3 border rounded-xl flex justify-between items-center hover:bg-muted/30 transition-colors">
                <div className="flex-1 mr-4">
                  <p className="font-bold text-sm">{d.className}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{d.question}</p>
                </div>
                <Button size="sm" onClick={() => handleClaim(d.id)} className="rounded-xl">Claim & Reply</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MentorMyStudents({ mentorId, mentorName }: { mentorId: string, mentorName: string }) {
  const db = useFirestore();
  const studentsQuery = useMemo(() => db ? query(collection(db, 'students'), where('mentorId', '==', mentorId)) : null, [db]);
  const { data: myStudents } = useCollection(studentsQuery);

  if (!myStudents || myStudents.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold flex items-center gap-2 text-primary"><Users className="text-accent" /> Daniel 120 - My Assigned Students</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {myStudents.map(student => (
          <Card key={student.id} className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserRound size={16} className="text-primary" />
                {student.name}
              </CardTitle>
              <CardDescription className="text-xs">Class: {student.class}</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="w-full rounded-xl">Chat with Student</Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl h-[600px] flex flex-col p-0 overflow-hidden">
                  <DialogHeader className="p-4 border-b">
                    <DialogTitle>Daniel 120 Chat: {student.name}</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-hidden">
                    <ChatInterface 
                      chatId={`private_${student.id}`} 
                      currentUser={{ id: mentorId, name: mentorName, role: 'mentor' }} 
                      otherUserName={student.name} 
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function LandingPage({ onSelect }: { onSelect: (view: 'login' | 'public-register' | 'admin-login') => void }) {
  const allQuotes = [
    "True wisdom is a gift from the Creator, and every word of truth brings deep understanding and insight.",
    "An intelligent heart is always searching for knowledge, and the ears of the wise are constantly listening for truth.",
    "Guide a young mind on the path of light and wisdom, and they will walk in strength throughout their journey.",
    "To those who are dedicated to learning, the Creator bestows the skill of understanding and the light of knowledge in all paths of study.",
    "The heart of a learner thrives on wisdom, and the ears of the dedicated seek out understanding with joy.",
    "True knowledge begins with a deep respect for truth; those who seek wisdom will find a path to greatness.",
    "Commit your works to the light, and your plans will be established in wisdom."
  ];

  const [quote, setQuote] = useState("");

  useEffect(() => {
    const randomIdx = Math.floor(Math.random() * allQuotes.length);
    setQuote(allQuotes[randomIdx]);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-12 relative overflow-hidden">
      <DecorativeGraphics />
      
      <div className="max-w-3xl space-y-6 z-10">
        <div className="mx-auto w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl mb-8 transform hover:scale-110 transition-transform duration-500">
          <GraduationCap size={48} />
        </div>
        <h1 className="text-6xl md:text-8xl font-black text-primary tracking-tighter drop-shadow-sm">DANIEL 120</h1>
        <div className="h-24 flex flex-col items-center justify-center">
          <p className="text-xl md:text-3xl font-medium text-foreground/80 italic animate-in fade-in slide-in-from-bottom-2 duration-1000">
            {quote ? `"${quote}"` : "..."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl z-10 px-4">
        <Card className="group hover:border-primary/50 transition-all cursor-pointer shadow-2xl overflow-hidden rounded-[2.5rem] bg-white/60 backdrop-blur-md" onClick={() => onSelect('login')}>
          <div className="h-2 bg-primary group-hover:h-3 transition-all" />
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Daniel 120</CardTitle>
            <CardDescription>Official Portal for Students & Mentors</CardDescription>
          </CardHeader>
          <CardContent><Button className="w-full bg-primary py-7 rounded-2xl group-hover:scale-[1.02] transition-transform text-lg shadow-lg">Click to Login</Button></CardContent>
        </Card>

        <Card className="group hover:border-accent/50 transition-all cursor-pointer shadow-2xl overflow-hidden rounded-[2.5rem] bg-white/60 backdrop-blur-md" onClick={() => onSelect('public-register')}>
          <div className="h-2 bg-accent group-hover:h-3 transition-all" />
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Students Corner</CardTitle>
            <CardDescription>Uplifting education for every child.</CardDescription>
          </CardHeader>
          <CardContent><Button className="w-full bg-accent py-7 rounded-2xl group-hover:scale-[1.02] transition-transform text-lg shadow-lg">Click to Open</Button></CardContent>
        </Card>

        <Card className="group hover:border-indigo-400/50 transition-all cursor-pointer shadow-2xl overflow-hidden rounded-[2.5rem] opacity-70 grayscale hover:grayscale-0 hover:opacity-100 bg-white/60 backdrop-blur-md">
          <div className="h-2 bg-indigo-400 group-hover:h-3 transition-all" />
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Muskhan</CardTitle>
            <CardDescription>Supportive community access.</CardDescription>
          </CardHeader>
          <CardContent><Button variant="outline" className="w-full py-7 rounded-2xl text-lg">Click to Login</Button></CardContent>
        </Card>
      </div>

      <Button variant="ghost" className="text-muted-foreground hover:text-primary mt-12 gap-2 z-10 bg-white/50 backdrop-blur-sm rounded-xl" onClick={() => onSelect('admin-login')}>
        <ShieldCheck size={18} /> Management Login
      </Button>
    </div>
  );
}

function LoginScreen({ mode, onBack }: { mode: 'standard' | 'admin', onBack: () => void }) {
  const { login } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ id: '', password: '' });
  const [loginType, setLoginType] = useState<'student' | 'mentor'>(mode === 'admin' ? 'student' : 'student');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await login(form.id, form.password, mode === 'admin' ? 'admin' : loginType);
    if (!success) {
      toast({ variant: 'destructive', title: 'Login Failed', description: 'Invalid ID or password.' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      <DecorativeGraphics />
      <Card className="w-full max-w-md shadow-2xl z-10 rounded-[2.5rem] border-none bg-white/80 backdrop-blur-lg">
        <CardHeader className="text-center space-y-4 p-8">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg ${mode === 'admin' ? 'bg-accent' : 'bg-primary'}`}>
            {mode === 'admin' ? <ShieldCheck size={32} /> : <UserRound size={32} />}
          </div>
          <CardTitle className="text-2xl font-bold">{mode === 'admin' ? 'Management Login' : 'Daniel 120 Login'}</CardTitle>
          <CardDescription>Please enter your credentials to continue.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          <form onSubmit={handleLogin} className="space-y-6">
            {mode === 'standard' && (
              <Tabs value={loginType} onValueChange={(v: any) => setLoginType(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted p-1 h-12">
                  <TabsTrigger value="student" className="rounded-xl font-bold">Student</TabsTrigger>
                  <TabsTrigger value="mentor" className="rounded-xl font-bold">Mentor</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1">ID / Username</Label>
                <Input value={form.id} className="rounded-2xl h-14 bg-white/50 border-muted" onChange={e => setForm({...form, id: e.target.value})} placeholder="Enter your ID" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1">Password</Label>
                <Input type="password" value={form.password} className="rounded-2xl h-14 bg-white/50 border-muted" onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" />
              </div>
            </div>
            <Button type="submit" className={`w-full py-8 rounded-[1.5rem] text-lg font-bold shadow-xl ${mode === 'admin' ? 'bg-accent' : 'bg-primary'}`} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
            </Button>
            <Button variant="ghost" className="w-full rounded-xl" onClick={onBack} type="button">
              <ArrowLeft size={16} className="mr-2" /> Back to Home
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Dashboard() {
  const { user, logout, login } = useAuth();
  const { toast } = useToast();
  const db = useFirestore();
  
  const [view, setView] = useState<'landing' | 'login' | 'admin-login' | 'public-register' | 'dashboard'>(user ? 'dashboard' : 'landing');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [publicReg, setPublicReg] = useState({ name: '', classId: '' });

  const [activeMaterial, setActiveMaterial] = useState<any>(null);
  const materialStartTimeRef = useRef<number | null>(null);

  const isAdmin = user?.role === 'admin';
  const isMentor = user?.role === 'mentor';
  const isPublic = user?.role === 'public_student';

  useEffect(() => {
    if (user) setView('dashboard');
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'student' || !db) return;

    if (activeMaterial) {
      materialStartTimeRef.current = Date.now();
    }

    return () => {
      if (activeMaterial && materialStartTimeRef.current) {
        const durationSec = Math.floor((Date.now() - materialStartTimeRef.current) / 1000);
        if (durationSec > 5) {
          const activityRef = collection(db, 'students', user.id, 'activity');
          const data = {
            type: activeMaterial.type === 'video' ? 'view_video' : 'view_pdf',
            timestamp: serverTimestamp(),
            duration: durationSec,
            metadata: {
              title: activeMaterial.title,
              chapter: activeMaterial.chapter,
              materialId: activeMaterial.id
            }
          };
          addDoc(activityRef, data).catch(async () => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
               path: activityRef.path,
               operation: 'create',
               requestResourceData: data
             }));
          });
        }
        materialStartTimeRef.current = null;
      }
    };
  }, [activeMaterial, user, db]);

  const coursesQuery = useMemo(() => db ? collection(db, 'courses') : null, [db]);
  const subjectsQuery = useMemo(() => db ? collection(db, 'subjects') : null, [db]);
  const materialsQuery = useMemo(() => db ? collection(db, 'materials') : null, [db]);

  const { data: allCourses } = useCollection(coursesQuery);
  const { data: allSubjects } = useCollection(subjectsQuery);
  const { data: allMaterials } = useCollection(materialsQuery);

  const sortedCourses = useMemo(() => sortClasses(allCourses || []), [allCourses]);

  const visibleCourses = useMemo(() => {
    if (!sortedCourses) return [];
    if (isAdmin || isMentor) return sortedCourses;
    if (!user?.class) return [];
    return sortedCourses.filter((c: any) => c.id === user.class);
  }, [isAdmin, isMentor, user?.class, sortedCourses]);

  const currentMaterials = useMemo(() => {
    if (!selectedSubject || !selectedCourse) return [];
    return (allMaterials || [])
      .filter(m => m.courseId === selectedCourse.id && m.subjectId === selectedSubject.id)
      .sort((a, b) => (Number(a.chapter) || 0) - (Number(b.chapter) || 0));
  }, [selectedCourse, selectedSubject, allMaterials]);

  const handlePublicRegister = async () => {
    if (!db || !publicReg.name || !publicReg.classId) return;
    const publicId = `PUBLIC-${Date.now()}`;
    const docRef = doc(db, 'students', publicId);
    const data = {
      id: publicId,
      name: publicReg.name,
      class: publicReg.classId,
      role: 'public_student',
      createdAt: serverTimestamp()
    };
    setDoc(docRef, data).then(() => {
      login(publicId, '', 'student');
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'create',
        requestResourceData: data
      }));
    });
  };

  const navigateToHome = () => {
    setSelectedCourse(null);
    setSelectedSubject(null);
    setShowAdminPanel(false);
  };

  const handleLogout = async () => {
    if (user && db && user.role !== 'admin') {
      const collName = user.role.includes('student') ? 'students' : 'mentors';
      const activityRef = collection(db, collName, user.id, 'activity');
      const data = {
        type: 'logout',
        timestamp: serverTimestamp()
      };
      addDoc(activityRef, data).catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: activityRef.path,
          operation: 'create',
          requestResourceData: data
        }));
      });
    }
    logout();
    setView('landing');
  };

  if (view === 'landing' && !user) return <LandingPage onSelect={(v) => setView(v)} />;
  if (view === 'login' && !user) return <LoginScreen mode="standard" onBack={() => setView('landing')} />;
  if (view === 'admin-login' && !user) return <LoginScreen mode="admin" onBack={() => setView('landing')} />;
  
  if (view === 'public-register' && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
        <DecorativeGraphics />
        <Card className="w-full max-w-md shadow-2xl z-10 rounded-[2.5rem] border-none bg-white/80 backdrop-blur-lg">
          <CardHeader className="text-center space-y-4 p-8 pb-0">
            <div className="mx-auto w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center shadow-inner">
              <Users size={32} />
            </div>
            <CardTitle className="text-2xl font-bold">Students Corner</CardTitle>
            <CardDescription>Register your name to access free education.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1">Your Name</Label>
              <Input placeholder="Enter your full name" className="rounded-2xl h-14 bg-white/50" value={publicReg.name} onChange={e => setPublicReg({...publicReg, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1">Select Class</Label>
              <Select onValueChange={v => setPublicReg({...publicReg, classId: v})} value={publicReg.classId}>
                <SelectTrigger className="rounded-2xl h-14 bg-white/50"><SelectValue placeholder="Which class do you study in?" /></SelectTrigger>
                <SelectContent>{sortedCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-accent py-8 rounded-[1.5rem] text-lg font-bold shadow-xl shadow-accent/20" onClick={handlePublicRegister} disabled={!publicReg.name || !publicReg.classId}>Open Learning Portal</Button>
            <Button variant="ghost" className="w-full rounded-xl" onClick={() => setView('landing')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) return <div />;

  return (
    <SidebarProvider>
      <InactivityMonitor />
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar className="border-r-0 shadow-2xl">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3 text-white">
              <div className="bg-white/20 p-2 rounded-xl shadow-inner"><GraduationCap size={32} /></div>
              <h1 className="text-2xl font-black tracking-tighter">DANIEL 120</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={!selectedCourse && !showAdminPanel} onClick={navigateToHome} className="py-8 rounded-2xl hover:bg-white/10 text-white font-bold mb-2">
                  <Home className="mr-2" /> Dashboard
                </SidebarMenuButton>
              </SidebarMenuItem>
              {(isAdmin || isMentor) && (
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={showAdminPanel} onClick={() => setShowAdminPanel(true)} className="py-8 rounded-2xl bg-white/20 text-white font-black hover:bg-white/30 border border-white/20 mb-4">
                    <Users className="mr-2" /> {isAdmin ? 'Management Panel' : 'Mentor Dashboard'}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <div className="my-6 px-4 text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Curriculum Classes</div>
              {visibleCourses.map((course: any) => (
                <SidebarMenuItem key={course.id}>
                  <SidebarMenuButton isActive={selectedCourse?.id === course.id} onClick={() => setSelectedCourse(course)} className="py-7 rounded-2xl hover:bg-white/10 text-white font-medium mb-1">
                    <BookOpen className="mr-2 h-4 w-4" /> {course.name}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-6">
            <Button variant="ghost" className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10 rounded-2xl h-14" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-background/50">
          <div className="max-w-7xl mx-auto space-y-8 relative z-10">
            {showAdminPanel && (isAdmin || isMentor) ? (
              <StudentManagement />
            ) : !selectedCourse ? (
              <section className="space-y-12">
                <div className={`rounded-[3rem] p-16 text-white shadow-2xl relative overflow-hidden transition-all duration-700 ${isPublic ? 'bg-accent' : 'bg-primary'}`}>
                  <div className="relative z-10">
                    <h2 className="text-5xl md:text-7xl font-black mb-6 leading-[1.1] tracking-tight">Uplifting Education,<br/>Shaping Futures</h2>
                    <p className="text-white/90 text-2xl font-medium max-w-2xl">Welcome, {user?.name}. {isPublic ? 'A special space for your learning journey.' : 'Your dedicated study command center.'}</p>
                  </div>
                  <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />
                  <Sparkles className="absolute top-10 right-20 text-white/20 animate-pulse" size={120} />
                </div>

                {isMentor && (
                  <>
                    <MentorMyStudents mentorId={user.id} mentorName={user.name} />
                    <PublicDoubtsQueue mentorId={user.id} mentorName={user.name} />
                  </>
                )}

                <section className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-3xl font-black tracking-tight ${isPublic ? 'text-accent' : 'text-primary'}`}>Academic Core</h3>
                    <div className="h-1 flex-1 mx-8 bg-muted/40 rounded-full" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {visibleCourses.map((course: any) => (
                      <Card key={course.id} className="cursor-pointer group hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] transition-all duration-700 rounded-[3rem] border-none shadow-xl overflow-hidden bg-white/70 backdrop-blur-sm" onClick={() => setSelectedCourse(course)}>
                        <div className="h-56 relative bg-muted overflow-hidden">
                          <Image src={`https://picsum.photos/seed/${course.id}/600/400`} fill alt={course.name} className="object-cover group-hover:scale-110 transition-transform duration-1000" />
                          <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent opacity-60" />
                          <div className="absolute bottom-6 left-8 text-white font-black text-3xl tracking-tighter">{course.name}</div>
                        </div>
                        <CardHeader className="p-8">
                          <Button className={`w-full rounded-2xl py-8 font-black text-lg transition-all ${isPublic ? 'bg-accent shadow-accent/20' : 'bg-primary shadow-primary/20'} shadow-lg group-hover:scale-[1.03]`}>Access Materials</Button>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </section>
              </section>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-6">
                  <Button variant="outline" size="icon" onClick={() => setSelectedCourse(null)} className="rounded-full h-14 w-14 border-primary/20 hover:bg-primary/10 shadow-lg"><ChevronRight className="rotate-180" /></Button>
                  <div>
                    <h2 className={`text-5xl font-black tracking-tighter ${isPublic ? 'text-accent' : 'text-primary'}`}>{selectedCourse.name}</h2>
                    <p className="text-muted-foreground text-base font-bold uppercase tracking-widest opacity-60">Select a subject for your session</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                  <div className="lg:col-span-1 space-y-4">
                    <h4 className="font-black text-muted-foreground uppercase text-[11px] tracking-[0.2em] px-4 mb-6">Subject Catalog</h4>
                    <div className="space-y-4">
                      {allSubjects?.filter(s => s.courseId === selectedCourse.id).map(subject => (
                        <Button 
                          key={subject.id} 
                          variant={selectedSubject?.id === subject.id ? 'default' : 'ghost'} 
                          className={`w-full justify-start rounded-[2rem] px-8 py-10 text-xl font-black transition-all duration-300 ${selectedSubject?.id === subject.id ? (isPublic ? 'bg-accent text-white shadow-xl' : 'bg-primary text-white shadow-xl') : 'hover:bg-white bg-white/40 border border-transparent hover:border-primary/20'}`}
                          onClick={() => setSelectedSubject(subject)}
                        >
                          <div className={`mr-6 p-3 rounded-2xl shadow-sm ${selectedSubject?.id === subject.id ? 'bg-white/20' : 'bg-muted'}`}>
                            <BookOpen className="h-6 w-6" />
                          </div>
                          {subject.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-8">
                    {selectedSubject ? (
                      <Tabs defaultValue="videos" className="bg-white/60 backdrop-blur-md p-8 rounded-[3.5rem] shadow-2xl border border-white/40">
                        <TabsList className="grid w-full grid-cols-2 mb-10 bg-muted/30 p-2 rounded-3xl h-16">
                          <TabsTrigger value="videos" className="rounded-2xl text-xl font-black data-[state=active]:bg-white data-[state=active]:shadow-lg"><PlayCircle size={22} className="mr-3" /> Video Classes</TabsTrigger>
                          <TabsTrigger value="notes" className="rounded-2xl text-xl font-black data-[state=active]:bg-white data-[state=active]:shadow-lg"><FileText size={22} className="mr-3" /> PDF Notes</TabsTrigger>
                        </TabsList>
                        <TabsContent value="videos" className="space-y-8">
                          {currentMaterials.filter(m => m.type === 'video').length === 0 && (
                            <div className="text-center py-20 text-muted-foreground font-bold italic bg-muted/20 rounded-[3rem] border-4 border-dashed">No videos uploaded yet.</div>
                          )}
                          {currentMaterials.filter(m => m.type === 'video').map(v => (
                            <Card key={v.id} className="overflow-hidden border-none shadow-2xl rounded-[3rem] group relative hover:-translate-y-2 transition-all duration-500" onMouseEnter={() => setActiveMaterial(v)} onMouseLeave={() => setActiveMaterial(null)}>
                              <div className="aspect-video relative bg-black shadow-inner">
                                <iframe src={getYouTubeEmbedUrl(v.url)} className="absolute inset-0 w-full h-full" allowFullScreen />
                              </div>
                              <CardHeader className="p-8 bg-white/80">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <Badge variant="outline" className="mb-3 rounded-xl px-4 py-1.5 bg-primary/10 text-primary border-primary/20 font-black tracking-widest uppercase text-[10px]">Chapter {v.chapter}</Badge>
                                    <CardTitle className="text-2xl font-black tracking-tight">{v.title}</CardTitle>
                                  </div>
                                  {isAdmin && (
                                    <Button variant="ghost" size="icon" onClick={() => setEditingMaterial(v)} className="h-12 w-12 text-muted-foreground hover:bg-muted rounded-2xl">
                                      <Edit2 size={20} />
                                    </Button>
                                  )}
                                </div>
                              </CardHeader>
                            </Card>
                          ))}
                        </TabsContent>
                        <TabsContent value="notes" className="space-y-6">
                           {currentMaterials.filter(m => m.type === 'pdf').length === 0 && (
                            <div className="text-center py-20 text-muted-foreground font-bold italic bg-muted/20 rounded-[3rem] border-4 border-dashed">No notes uploaded yet.</div>
                          )}
                           {currentMaterials.filter(m => m.type === 'pdf').map(n => (
                            <Card key={n.id} className="hover:bg-white/80 transition-all rounded-[2.5rem] border-muted/40 border-2 bg-muted/10 group" onMouseEnter={() => setActiveMaterial(n)} onMouseLeave={() => setActiveMaterial(null)}>
                              <CardContent className="p-8 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                  <div className="p-4 bg-primary/10 text-primary rounded-3xl shadow-sm group-hover:scale-110 transition-transform"><FileText className="h-8 w-8" /></div>
                                  <div>
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/60 mb-1 block">Chapter {n.chapter}</span>
                                    <div className="font-black text-2xl tracking-tight">{n.title}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  {isAdmin && (
                                    <Button variant="ghost" size="icon" onClick={() => setEditingMaterial(n)} className="h-12 w-12 text-muted-foreground rounded-2xl">
                                      <Edit2 size={20} />
                                    </Button>
                                  )}
                                  <Button size="lg" onClick={() => window.open(n.url, '_blank')} className="rounded-2xl h-14 px-10 font-black text-lg bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95">Open Notes</Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </TabsContent>
                      </Tabs>
                    ) : <div className="text-center py-40 border-8 border-dashed rounded-[4rem] bg-white/20 border-primary/10 flex flex-col items-center justify-center space-y-6">
                        <div className="p-8 bg-primary/10 text-primary rounded-full shadow-inner animate-bounce"><BookOpen size={64} /></div>
                        <p className="text-2xl font-black text-primary/40 tracking-tight">Select a subject to open the curriculum.</p>
                      </div>}
                  </div>

                  <div className="lg:col-span-1">
                    {!isPublic ? (
                      <Tabs defaultValue="ai" className="bg-white/60 backdrop-blur-md border-primary/20 rounded-[3rem] shadow-2xl overflow-hidden p-2">
                        <TabsList className="grid w-full grid-cols-2 rounded-[2rem] h-14 bg-muted/30 mb-2">
                          <TabsTrigger value="ai" className="rounded-[1.5rem] font-black gap-2"><Sparkles size={16} /> AI Assistant</TabsTrigger>
                          <TabsTrigger value="mentor" className="rounded-[1.5rem] font-black gap-2"><MessageSquare size={16} /> Mentor Chat</TabsTrigger>
                        </TabsList>
                        <TabsContent value="ai">
                          <AICompanion />
                        </TabsContent>
                        <TabsContent value="mentor" className="h-[600px]">
                           <ChatInterface 
                             chatId={`private_${user.id}`} 
                             currentUser={{ id: user.id, name: user.name, role: user.role }} 
                             otherUserName="My Daniel 120 Mentor" 
                           />
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <Card className="bg-white/60 backdrop-blur-md border-accent/20 rounded-[3rem] shadow-2xl overflow-hidden">
                        <div className="h-3 bg-accent" />
                        <CardHeader className="p-10">
                          <CardTitle className="text-accent flex items-center gap-4 text-3xl font-black tracking-tighter"><Sparkles size={32} /> Students Corner</CardTitle>
                          <CardDescription className="text-foreground/70 font-bold text-base mt-2">Post your doubt and our mentors will respond anonymously.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-10 pt-0">
                          <PublicDoubtFlow selectedClassName={selectedCourse?.name || ''} />
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <Dialog open={!!editingMaterial} onOpenChange={() => setEditingMaterial(null)}>
        <DialogContent className="rounded-[3rem] p-10 max-w-lg border-none bg-white/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black tracking-tighter text-primary">Edit Material</DialogTitle>
            <DialogDescription className="font-bold">Modify the title or link for this resource.</DialogDescription>
          </DialogHeader>
          <div className="space-y-8 py-8">
            <div className="space-y-3">
              <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Material Title</Label>
              <Input className="rounded-2xl h-14 bg-muted/30 border-none font-bold text-lg" value={editingMaterial?.title || ''} onChange={e => setEditingMaterial({...editingMaterial, title: e.target.value})} />
            </div>
            <div className="space-y-3">
              <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Resource URL</Label>
              <Input className="rounded-2xl h-14 bg-muted/30 border-none font-medium" value={editingMaterial?.url || ''} onChange={e => setEditingMaterial({...editingMaterial, url: e.target.value})} />
            </div>
          </div>
          <DialogFooter className="p-0">
            <Button className="w-full h-16 rounded-3xl text-xl font-black bg-primary shadow-2xl shadow-primary/30" onClick={() => {
              if (db && editingMaterial) {
                const docRef = doc(db, 'materials', editingMaterial.id);
                const updateData = { ...editingMaterial };
                updateDoc(docRef, updateData).then(() => {
                  setEditingMaterial(null);
                  toast({ title: "Updated successfully" });
                }).catch(async () => {
                   errorEmitter.emit('permission-error', new FirestorePermissionError({
                     path: docRef.path,
                     operation: 'update',
                     requestResourceData: updateData
                   }));
                });
              }
            }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

function PublicDoubtFlow({ selectedClassName }: { selectedClassName: string }) {
  const { user } = useAuth();
  const db = useFirestore();
  const [question, setQuestion] = useState('');
  
  // Query to see if the user has an active doubt
  const doubtsQuery = useMemo(() => {
    if (!db || !user) return null;
    return query(collection(db, 'publicDoubts'), where('studentId', '==', user.id), where('status', 'in', ['open', 'answered']));
  }, [db, user]);

  const { data: myDoubts } = useCollection(doubtsQuery);
  const activeDoubt = myDoubts?.[0];

  const handleSubmit = async () => {
    if (!db || !question.trim() || !user) return;
    const doubtsRef = collection(db, 'publicDoubts');
    const data = {
      studentId: user.id,
      studentName: user.name,
      className: selectedClassName,
      question: question.trim(),
      status: 'open',
      mentorId: null,
      createdAt: serverTimestamp()
    };
    addDoc(doubtsRef, data).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: doubtsRef.path,
        operation: 'create',
        requestResourceData: data
      }));
    });
    setQuestion('');
  };

  if (activeDoubt) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-accent/10 rounded-2xl">
          <p className="text-xs font-bold text-accent uppercase mb-1">My Active Doubt</p>
          <p className="text-sm italic">"{activeDoubt.question}"</p>
          <Badge className="mt-2 bg-accent">{activeDoubt.status === 'open' ? 'Waiting for Mentor' : 'Mentor Responded'}</Badge>
        </div>
        <div className="h-[400px]">
           <ChatInterface 
             chatId={`public_${activeDoubt.id}`} 
             currentUser={{ id: user!.id, name: user!.name, role: user!.role }} 
             otherUserName="Mentor"
             isPublic
           />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Label className="font-black text-[11px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Academic Question</Label>
        <Input placeholder="E.g. Help me understand gravity?" className="rounded-2xl h-16 bg-white border-muted font-medium text-lg px-6" value={question} onChange={e => setQuestion(e.target.value)} />
      </div>
      <Button className="w-full bg-accent h-16 rounded-[1.5rem] text-xl font-black shadow-xl shadow-accent/20 hover:scale-[1.02] transition-transform" onClick={handleSubmit} disabled={!question.trim()}>Ask Mentors</Button>
    </div>
  );
}

export default function HomeApp() {
  return (
    <FirebaseClientProvider>
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    </FirebaseClientProvider>
  );
}
