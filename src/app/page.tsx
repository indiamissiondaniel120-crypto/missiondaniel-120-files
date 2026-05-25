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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Home, BookOpen, PlayCircle, ChevronRight, GraduationCap, Users, FileText, MessageSquare, Sparkles, ShieldCheck, HeartHandshake, Search, Send, Edit2, Loader2, UserRound, ArrowLeft, Pencil, Lightbulb, Calculator } from 'lucide-react';
import Image from 'next/image';
import { FirebaseClientProvider, useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, doc, updateDoc, setDoc } from 'firebase/firestore';

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
        <Calculator size={130} />
      </div>
      <div className="absolute bottom-40 right-10 text-primary/10 floating-graphic" style={{ animationDelay: '4.5s' }}>
        <Pencil size={90} />
      </div>
      <div className="absolute top-10 left-1/2 text-accent/10 floating-graphic" style={{ animationDelay: '5s' }}>
        <Sparkles size={80} />
      </div>
      {/* Wave element */}
      <div className="absolute bottom-0 right-0 w-full h-1/3 bg-primary/5 -skew-y-3 origin-bottom-right" />
    </div>
  );
}

function PublicDoubtsQueue({ mentorId }: { mentorId: string }) {
  const db = useFirestore();
  const doubtsQuery = useMemo(() => db ? query(collection(db, 'publicDoubts'), where('status', 'in', ['open', 'assigned'])) : null, [db]);
  const { data: doubts } = useCollection(doubtsQuery);

  const myAssigned = doubts?.filter(d => d.mentorId === mentorId) || [];
  const unassigned = doubts?.filter(d => d.status === 'open') || [];

  const handleClaim = (doubtId: string) => {
    if (!db) return;
    updateDoc(doc(db, 'publicDoubts', doubtId), {
      status: 'assigned',
      mentorId: mentorId,
      assignedAt: serverTimestamp()
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold flex items-center gap-2 text-primary"><HeartHandshake className="text-accent" /> Shared Doubt Pool</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-accent/20">
          <CardHeader><CardTitle className="text-sm">Assigned to Me ({myAssigned.length})</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {myAssigned.length === 0 && <p className="text-xs text-muted-foreground italic">No active assignments.</p>}
            {myAssigned.map(d => (
              <div key={d.id} className="p-4 border rounded-2xl bg-accent/5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm">{d.className}</p>
                    <p className="text-xs text-muted-foreground">Question: {d.question}</p>
                  </div>
                </div>
                <ChatInterface chatId={`public_${d.id}`} currentUser={{ id: mentorId, name: 'Mentor', role: 'mentor' }} otherUserName="Student" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Open Pool ({unassigned.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
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
        <Card className="group hover:border-primary/50 transition-all cursor-pointer shadow-2xl overflow-hidden rounded-3xl" onClick={() => onSelect('login')}>
          <div className="h-2 bg-primary group-hover:h-3 transition-all" />
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Daniel 120</CardTitle>
            <CardDescription>Official Portal for Students & Mentors</CardDescription>
          </CardHeader>
          <CardContent><Button className="w-full bg-primary py-7 rounded-2xl group-hover:scale-[1.02] transition-transform text-lg">Click to Login</Button></CardContent>
        </Card>

        <Card className="group hover:border-accent/50 transition-all cursor-pointer shadow-2xl overflow-hidden rounded-3xl" onClick={() => onSelect('public-register')}>
          <div className="h-2 bg-accent group-hover:h-3 transition-all" />
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Students Corner</CardTitle>
            <CardDescription>Uplifting education for every child.</CardDescription>
          </CardHeader>
          <CardContent><Button className="w-full bg-accent py-7 rounded-2xl group-hover:scale-[1.02] transition-transform text-lg">Click to Open</Button></CardContent>
        </Card>

        <Card className="group hover:border-indigo-400/50 transition-all cursor-pointer shadow-2xl overflow-hidden rounded-3xl opacity-70 grayscale hover:grayscale-0 hover:opacity-100">
          <div className="h-2 bg-indigo-400 group-hover:h-3 transition-all" />
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Muskhan</CardTitle>
            <CardDescription>Supportive community access.</CardDescription>
          </CardHeader>
          <CardContent><Button variant="outline" className="w-full py-7 rounded-2xl text-lg">Click to Login</Button></CardContent>
        </Card>
      </div>

      <Button variant="ghost" className="text-muted-foreground hover:text-primary mt-12 gap-2 z-10 bg-white/50 backdrop-blur-sm" onClick={() => onSelect('admin-login')}>
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
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-6 relative overflow-hidden">
      <DecorativeGraphics />
      <Card className="w-full max-w-md shadow-2xl z-10 rounded-[2rem] border-none">
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
                <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted p-1">
                  <TabsTrigger value="student" className="rounded-lg">Student</TabsTrigger>
                  <TabsTrigger value="mentor" className="rounded-lg">Mentor</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>ID / Username</Label>
                <Input value={form.id} className="rounded-xl p-6" onChange={e => setForm({...form, id: e.target.value})} placeholder="Enter your ID" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={form.password} className="rounded-xl p-6" onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" />
              </div>
            </div>
            <Button type="submit" className={`w-full py-7 rounded-2xl text-lg shadow-xl ${mode === 'admin' ? 'bg-accent' : 'bg-primary'}`} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={onBack} type="button">
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

  // Usage tracking state
  const [activeMaterial, setActiveMaterial] = useState<any>(null);
  const materialStartTimeRef = useRef<number | null>(null);

  const isAdmin = user?.role === 'admin';
  const isMentor = user?.role === 'mentor';
  const isPublic = user?.role === 'public_student';

  useEffect(() => {
    if (user) setView('dashboard');
  }, [user]);

  // Track material usage duration
  useEffect(() => {
    if (!user || user.role !== 'student' || !db) return;

    if (activeMaterial) {
      materialStartTimeRef.current = Date.now();
    }

    return () => {
      if (activeMaterial && materialStartTimeRef.current) {
        const durationSec = Math.floor((Date.now() - materialStartTimeRef.current) / 1000);
        if (durationSec > 5) {
          addDoc(collection(db, 'students', user.id, 'activity'), {
            type: activeMaterial.type === 'video' ? 'view_video' : 'view_pdf',
            timestamp: serverTimestamp(),
            duration: durationSec,
            metadata: {
              title: activeMaterial.title,
              chapter: activeMaterial.chapter,
              materialId: activeMaterial.id
            }
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
    await setDoc(doc(db, 'students', publicId), {
      id: publicId,
      name: publicReg.name,
      class: publicReg.classId,
      role: 'public_student',
      createdAt: serverTimestamp()
    });
    login(publicId, '', 'student');
  };

  const navigateToHome = () => {
    setSelectedCourse(null);
    setSelectedSubject(null);
    setShowAdminPanel(false);
  };

  const handleLogout = async () => {
    if (user && db && user.role !== 'admin') {
      await addDoc(collection(db, user.role.includes('student') ? 'students' : 'mentors', user.id, 'activity'), {
        type: 'logout',
        timestamp: serverTimestamp()
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
        <Card className="w-full max-w-md shadow-2xl z-10 rounded-[2rem] border-none">
          <CardHeader className="text-center space-y-2 p-8 pb-0">
            <div className="mx-auto w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center shadow-inner">
              <Users size={32} />
            </div>
            <CardTitle className="text-2xl font-bold">Students Corner</CardTitle>
            <CardDescription>Register your name to access free education.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-4">
            <div className="space-y-2"><Label>Your Name</Label><Input placeholder="Enter your full name" className="rounded-xl p-6" value={publicReg.name} onChange={e => setPublicReg({...publicReg, name: e.target.value})} /></div>
            <div className="space-y-2"><Label>Select Class</Label>
              <Select onValueChange={v => setPublicReg({...publicReg, classId: v})} value={publicReg.classId}>
                <SelectTrigger className="rounded-xl h-12"><SelectValue placeholder="Which class do you study in?" /></SelectTrigger>
                <SelectContent>{sortedCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-accent py-7 rounded-2xl text-lg shadow-xl" onClick={handlePublicRegister} disabled={!publicReg.name || !publicReg.classId}>Open Learning Portal</Button>
            <Button variant="ghost" className="w-full" onClick={() => setView('landing')}>Back to Home</Button>
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
              <div className="bg-white/20 p-2 rounded-xl"><GraduationCap size={32} /></div>
              <h1 className="text-2xl font-bold tracking-tight">DANIEL 120</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={!selectedCourse && !showAdminPanel} onClick={navigateToHome} className="py-7 rounded-2xl hover:bg-white/10 text-white">
                  <Home className="mr-2" /> Dashboard
                </SidebarMenuButton>
              </SidebarMenuItem>
              {(isAdmin || isMentor) && (
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={showAdminPanel} onClick={() => setShowAdminPanel(true)} className="py-7 rounded-2xl text-accent-foreground font-bold hover:bg-accent/20">
                    <Users className="mr-2" /> {isAdmin ? 'Management Panel' : 'Mentor Dashboard'}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <div className="my-6 px-4 text-xs font-bold text-white/40 uppercase tracking-widest">Classes</div>
              {visibleCourses.map((course: any) => (
                <SidebarMenuItem key={course.id}>
                  <SidebarMenuButton isActive={selectedCourse?.id === course.id} onClick={() => setSelectedCourse(course)} className="py-7 rounded-2xl hover:bg-white/10 text-white">
                    <BookOpen className="mr-2 h-4 w-4" /> {course.name}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-6">
            <Button variant="ghost" className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10 rounded-xl" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f8faff] relative">
          <div className="max-w-7xl mx-auto space-y-8 relative z-10">
            {showAdminPanel && (isAdmin || isMentor) ? (
              <StudentManagement />
            ) : !selectedCourse ? (
              <section className="space-y-8">
                <div className={`rounded-[2.5rem] p-12 text-white shadow-2xl relative overflow-hidden ${isPublic ? 'bg-accent' : 'bg-primary'}`}>
                  <div className="relative z-10">
                    <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">Uplifting Education,<br/>Shaping Futures</h2>
                    <p className="text-white/80 text-xl font-medium">Welcome, {user?.name}. {isPublic ? 'A gift of knowledge for you.' : 'Your dedicated study space.'}</p>
                  </div>
                  {/* Decorative shape */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                  <Sparkles className="absolute top-10 right-20 text-white/20" size={100} />
                </div>

                {isMentor && <PublicDoubtsQueue mentorId={user.id} />}

                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-2xl font-bold ${isPublic ? 'text-accent' : 'text-primary'}`}>Study Area</h3>
                    <div className="h-1 flex-1 mx-6 bg-muted/40 rounded-full" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {visibleCourses.map((course: any) => (
                      <Card key={course.id} className="cursor-pointer group hover:shadow-2xl transition-all duration-500 rounded-[2rem] border-none shadow-xl overflow-hidden" onClick={() => setSelectedCourse(course)}>
                        <div className="h-48 relative bg-muted overflow-hidden">
                          <Image src={`https://picsum.photos/seed/${course.id}/600/400`} fill alt={course.name} className="object-cover group-hover:scale-110 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-4 left-6 text-white font-black text-2xl">{course.name}</div>
                        </div>
                        <CardHeader className="p-6 bg-white">
                          <Button className={`w-full rounded-2xl py-6 font-bold ${isPublic ? 'bg-accent' : 'bg-primary'}`}>Start Learning</Button>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </section>
              </section>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" onClick={() => setSelectedCourse(null)} className="rounded-full h-12 w-12 border-primary/20 hover:bg-primary/10"><ChevronRight className="rotate-180" /></Button>
                  <div>
                    <h2 className={`text-4xl font-black ${isPublic ? 'text-accent' : 'text-primary'}`}>{selectedCourse.name}</h2>
                    <p className="text-muted-foreground text-sm font-medium">Select a subject to explore resources</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-1 space-y-4">
                    <h4 className="font-bold text-muted-foreground uppercase text-[10px] tracking-widest px-2 mb-4">Core Subjects</h4>
                    <div className="space-y-3">
                      {allSubjects?.filter(s => s.courseId === selectedCourse.id).map(subject => (
                        <Button 
                          key={subject.id} 
                          variant={selectedSubject?.id === subject.id ? 'default' : 'ghost'} 
                          className={`w-full justify-start rounded-2xl px-6 py-8 text-lg font-bold transition-all ${selectedSubject?.id === subject.id ? (isPublic ? 'bg-accent' : 'bg-primary') : 'hover:bg-white bg-white/50 border border-transparent hover:border-primary/20'}`}
                          onClick={() => setSelectedSubject(subject)}
                        >
                          <div className={`mr-4 p-2 rounded-xl ${selectedSubject?.id === subject.id ? 'bg-white/20' : 'bg-muted'}`}>
                            <BookOpen className="h-5 w-5" />
                          </div>
                          {subject.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-6">
                    {selectedSubject ? (
                      <Tabs defaultValue="videos" className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-muted/20">
                        <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 p-1.5 rounded-2xl h-14">
                          <TabsTrigger value="videos" className="rounded-xl text-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-md"><PlayCircle size={18} className="mr-2" /> Videos</TabsTrigger>
                          <TabsTrigger value="notes" className="rounded-xl text-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-md"><FileText size={18} className="mr-2" /> Notes</TabsTrigger>
                        </TabsList>
                        <TabsContent value="videos" className="space-y-6">
                          {currentMaterials.filter(m => m.type === 'video').length === 0 && (
                            <div className="text-center py-12 text-muted-foreground italic bg-muted/20 rounded-3xl border-2 border-dashed">No videos uploaded yet.</div>
                          )}
                          {currentMaterials.filter(m => m.type === 'video').map(v => (
                            <Card key={v.id} className="overflow-hidden border-none shadow-2xl rounded-3xl group relative hover:-translate-y-1 transition-transform" onMouseEnter={() => setActiveMaterial(v)} onMouseLeave={() => setActiveMaterial(null)}>
                              <div className="aspect-video relative bg-black shadow-inner">
                                <iframe src={getYouTubeEmbedUrl(v.url)} className="absolute inset-0 w-full h-full" allowFullScreen />
                              </div>
                              <CardHeader className="p-6 bg-white border-t border-muted/10">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <Badge variant="outline" className="mb-2 rounded-lg bg-primary/5 text-primary border-primary/10">Chapter {v.chapter}</Badge>
                                    <CardTitle className="text-xl font-black">{v.title}</CardTitle>
                                  </div>
                                  {isAdmin && (
                                    <Button variant="ghost" size="icon" onClick={() => setEditingMaterial(v)} className="h-10 w-10 text-muted-foreground hover:bg-muted rounded-xl">
                                      <Edit2 size={18} />
                                    </Button>
                                  )}
                                </div>
                              </CardHeader>
                            </Card>
                          ))}
                        </TabsContent>
                        <TabsContent value="notes" className="space-y-4">
                           {currentMaterials.filter(m => m.type === 'pdf').length === 0 && (
                            <div className="text-center py-12 text-muted-foreground italic bg-muted/20 rounded-3xl border-2 border-dashed">No notes uploaded yet.</div>
                          )}
                           {currentMaterials.filter(m => m.type === 'pdf').map(n => (
                            <Card key={n.id} className="hover:bg-muted/30 transition-all rounded-3xl border-muted/40 border-2" onMouseEnter={() => setActiveMaterial(n)} onMouseLeave={() => setActiveMaterial(null)}>
                              <CardContent className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><FileText className="h-6 w-6" /></div>
                                  <div>
                                    <span className="text-[10px] font-bold uppercase text-blue-500">Chapter {n.chapter}</span>
                                    <div className="font-black text-lg">{n.title}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  {isAdmin && (
                                    <Button variant="ghost" size="icon" onClick={() => setEditingMaterial(n)} className="h-10 w-10 text-muted-foreground rounded-xl">
                                      <Edit2 size={18} />
                                    </Button>
                                  )}
                                  <Button size="lg" onClick={() => window.open(n.url, '_blank')} className="rounded-2xl px-8 font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">Open Notes</Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </TabsContent>
                      </Tabs>
                    ) : <div className="text-center py-32 border-4 border-dashed rounded-[3rem] bg-white/40 border-primary/10 flex flex-col items-center justify-center space-y-4">
                        <div className="p-6 bg-primary/10 text-primary rounded-full"><BookOpen size={48} /></div>
                        <p className="text-xl font-bold text-primary/60">Select a subject to start learning.</p>
                      </div>}
                  </div>

                  <div className="lg:col-span-1">
                    {!isPublic ? <AICompanion /> : (
                      <Card className="bg-accent/5 border-accent/20 rounded-[2rem] shadow-xl overflow-hidden">
                        <div className="h-2 bg-accent" />
                        <CardHeader className="p-8">
                          <CardTitle className="text-accent flex items-center gap-3 text-2xl font-black"><Sparkles /> Student Voice</CardTitle>
                          <CardDescription className="text-foreground/70 font-medium">Ask our expert mentors anything about your studies.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8 pt-0">
                          <PublicDoubtForm className={selectedCourse.name} />
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
        <DialogContent className="rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Edit Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="font-bold">Title</Label>
              <Input className="rounded-xl h-12" value={editingMaterial?.title || ''} onChange={e => setEditingMaterial({...editingMaterial, title: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">URL / Link</Label>
              <Input className="rounded-xl h-12" value={editingMaterial?.url || ''} onChange={e => setEditingMaterial({...editingMaterial, url: e.target.value})} />
            </div>
          </div>
          <DialogFooter className="p-6 pt-0">
            <Button className="w-full py-7 rounded-2xl text-lg font-bold bg-primary shadow-lg" onClick={async () => {
              if (db && editingMaterial) {
                await updateDoc(doc(db, 'materials', editingMaterial.id), { ...editingMaterial });
                setEditingMaterial(null);
                toast({ title: "Updated successfully" });
              }
            }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

function PublicDoubtForm({ className }: { className: string }) {
  const { user } = useAuth();
  const db = useFirestore();
  const [question, setQuestion] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!db || !question.trim() || !user) return;
    await addDoc(collection(db, 'publicDoubts'), {
      studentId: user.id,
      studentName: user.name,
      className,
      question: question.trim(),
      status: 'open',
      mentorId: null,
      createdAt: serverTimestamp()
    });
    setSent(true);
    setQuestion('');
  };

  if (sent) return <div className="text-center p-8 bg-green-50 text-green-700 rounded-3xl border border-green-200 font-bold animate-in zoom-in duration-300">Thank you! A mentor will respond to you soon.</div>;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="font-bold text-muted-foreground uppercase text-[10px]">Your Academic Question</Label>
        <Input placeholder="E.g. How to solve quadratic equations?" className="rounded-xl h-14 bg-white" value={question} onChange={e => setQuestion(e.target.value)} />
      </div>
      <Button className="w-full bg-accent py-7 rounded-2xl text-lg font-bold shadow-lg shadow-accent/20" onClick={handleSubmit} disabled={!question.trim()}>Ask Mentors</Button>
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
