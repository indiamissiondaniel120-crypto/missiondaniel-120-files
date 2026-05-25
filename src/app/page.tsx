'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AuthProvider, useAuth } from '@/components/auth-wrapper';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { STUDY_MATERIALS } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AICompanion } from '@/components/ai-companion';
import { Badge } from '@/components/ui/badge';
import { StudentManagement } from '@/components/student-management';
import { InactivityMonitor } from '@/components/inactivity-monitor';
import { ChatInterface } from '@/components/chat-interface';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Home, BookOpen, PlayCircle, ChevronRight, GraduationCap, Users, FileText, MessageSquare, Youtube, Edit2, Sparkles, BookHeart, ShieldCheck, HeartHandshake, Search, Send, Clock, UserRound } from 'lucide-react';
import Image from 'next/image';
import { FirebaseClientProvider, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';

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

/**
 * Public Doubts Pool for Mentors
 */
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
      <h3 className="text-xl font-bold flex items-center gap-2"><HeartHandshake className="text-accent" /> Public Doubts</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Assigned to Me ({myAssigned.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {myAssigned.map(d => (
              <div key={d.id} className="p-3 border rounded-xl bg-accent/5">
                <p className="font-bold text-sm">{d.studentName} ({d.className})</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.question}</p>
                <div className="mt-2"><ChatInterface chatId={`public_${d.id}`} currentUser={{ id: mentorId, name: 'Mentor', role: 'mentor' }} otherUserName={d.studentName} /></div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Available in Pool ({unassigned.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {unassigned.map(d => (
              <div key={d.id} className="p-3 border rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">{d.studentName}</p>
                  <p className="text-xs text-muted-foreground">{d.className}</p>
                </div>
                <Button size="sm" onClick={() => handleClaim(d.id)}>Claim & Reply</Button>
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
    // Pick a random quote on mount to avoid hydration mismatch
    const randomIdx = Math.floor(Math.random() * allQuotes.length);
    setQuote(allQuotes[randomIdx]);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-12">
      <div className="max-w-3xl space-y-6">
        <div className="mx-auto w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl mb-8">
          <GraduationCap size={48} />
        </div>
        <h1 className="text-6xl font-black text-primary tracking-tighter">DANIEL 120</h1>
        <div className="h-24 flex flex-col items-center justify-center">
          <p className="text-2xl font-medium text-foreground/80 italic animate-in fade-in slide-in-from-bottom-2 duration-1000">
            {quote ? `"${quote}"` : "..."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
        <Card className="group hover:border-primary/50 transition-all cursor-pointer shadow-xl overflow-hidden" onClick={() => onSelect('login')}>
          <div className="h-2 bg-primary" />
          <CardHeader>
            <CardTitle className="text-2xl">Daniel 120</CardTitle>
            <CardDescription>Official Portal for Students & Mentors</CardDescription>
          </CardHeader>
          <CardContent><Button className="w-full bg-primary py-6 rounded-2xl group-hover:scale-105 transition-transform">Click to Login</Button></CardContent>
        </Card>

        <Card className="group hover:border-accent/50 transition-all cursor-pointer shadow-xl overflow-hidden" onClick={() => onSelect('public-register')}>
          <div className="h-2 bg-accent" />
          <CardHeader>
            <CardTitle className="text-2xl">Students Corner</CardTitle>
            <CardDescription>Uplifting education for every child.</CardDescription>
          </CardHeader>
          <CardContent><Button className="w-full bg-accent py-6 rounded-2xl group-hover:scale-105 transition-transform">Click to Open</Button></CardContent>
        </Card>

        <Card className="group hover:border-orange-500/50 transition-all cursor-pointer shadow-xl overflow-hidden opacity-60 grayscale hover:grayscale-0">
          <div className="h-2 bg-orange-500" />
          <CardHeader>
            <CardTitle className="text-2xl">Muskhan</CardTitle>
            <CardDescription>Supportive community access.</CardDescription>
          </CardHeader>
          <CardContent><Button variant="outline" className="w-full py-6 rounded-2xl">Click to Login</Button></CardContent>
        </Card>
      </div>

      <Button variant="ghost" className="text-muted-foreground hover:text-primary mt-12 gap-2" onClick={() => onSelect('admin-login')}>
        <ShieldCheck size={18} /> Management Login
      </Button>
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
  const [activeMaterial, setActiveMaterial] = useState<any | null>(null);
  const [selectedChatStudent, setSelectedChatStudent] = useState<any>(null);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [publicReg, setPublicReg] = useState({ name: '', classId: '' });

  const isAdmin = user?.role === 'admin';
  const isMentor = user?.role === 'mentor';
  const isPublic = user?.role === 'public_student';

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
    // Auto login
    login(publicId, '', 'student');
    setView('dashboard');
  };

  const navigateToHome = () => {
    setSelectedCourse(null);
    setSelectedSubject(null);
    setShowAdminPanel(false);
    setSelectedChatStudent(null);
  };

  if (!user && view === 'landing') return <LandingPage onSelect={(v) => setView(v)} />;
  
  if (!user && view === 'public-register') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-6">
        <Card className="w-full max-w-md shadow-2xl border-accent/20">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center">
              <Users size={32} />
            </div>
            <CardTitle className="text-2xl font-bold">Students Corner</CardTitle>
            <CardDescription>Register your name to access free education.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Your Name</Label><Input placeholder="Enter your full name" value={publicReg.name} onChange={e => setPublicReg({...publicReg, name: e.target.value})} /></div>
            <div className="space-y-2"><Label>Select Class</Label>
              <Select onValueChange={v => setPublicReg({...publicReg, classId: v})} value={publicReg.classId}>
                <SelectTrigger><SelectValue placeholder="Which class do you study in?" /></SelectTrigger>
                <SelectContent>{sortedCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-accent py-6 rounded-2xl" onClick={handlePublicRegister} disabled={!publicReg.name || !publicReg.classId}>Open Learning Portal</Button>
            <Button variant="ghost" className="w-full" onClick={() => setView('landing')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback to login screen if not logged in and not public
  if (!user) return <AuthProvider><div /></AuthProvider>;

  return (
    <SidebarProvider>
      <InactivityMonitor />
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar className="border-r-0 shadow-2xl">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3 text-white">
              <div className="bg-white/20 p-2 rounded-lg"><GraduationCap size={32} /></div>
              <h1 className="text-2xl font-bold tracking-tight">DANIEL 120</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={!selectedCourse && !showAdminPanel} onClick={navigateToHome} className="py-6 rounded-xl hover:bg-white/10">
                  <Home className="mr-2" /> Dashboard
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={showAdminPanel} onClick={() => setShowAdminPanel(true)} className="py-6 rounded-xl text-accent hover:bg-accent/10">
                    <Users className="mr-2" /> Management Panel
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <div className="my-4 px-3 text-xs font-semibold text-white/50 uppercase tracking-widest">Classes</div>
              {visibleCourses.map((course: any) => (
                <SidebarMenuItem key={course.id}>
                  <SidebarMenuButton isActive={selectedCourse?.id === course.id} onClick={() => setSelectedCourse(course)} className="py-6 rounded-xl hover:bg-white/10">
                    <BookOpen className="mr-2 h-4 w-4" /> {course.name}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-6">
            <Button variant="ghost" className="w-full justify-start text-white/80 hover:text-white" onClick={() => { logout(); setView('landing'); }}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {showAdminPanel ? (
              <StudentManagement />
            ) : !selectedCourse ? (
              <section className="space-y-8">
                <div className={`rounded-3xl p-10 text-white shadow-xl ${isPublic ? 'bg-accent' : 'bg-primary'}`}>
                  <h2 className="text-4xl font-bold mb-4">Uplifting Education, Shaping Futures</h2>
                  <p className="text-white/80 text-lg">Welcome, {user?.name}. {isPublic ? 'A gift of knowledge for you.' : 'Your dedicated study space.'}</p>
                </div>

                {isMentor && <PublicDoubtsQueue mentorId={user.id} />}

                <section className="space-y-4">
                  <h3 className={`text-2xl font-bold ${isPublic ? 'text-accent' : 'text-primary'}`}>Study Area</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {visibleCourses.map((course: any) => (
                      <Card key={course.id} className="cursor-pointer hover:shadow-xl transition-all" onClick={() => setSelectedCourse(course)}>
                        <div className="h-32 relative bg-muted"><Image src={`https://picsum.photos/seed/${course.id}/400/200`} fill alt={course.name} className="object-cover rounded-t-lg" /></div>
                        <CardHeader className="p-4"><CardTitle className="text-lg">{course.name}</CardTitle></CardHeader>
                      </Card>
                    ))}
                  </div>
                </section>
              </section>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" onClick={() => setSelectedCourse(null)} className="rounded-full"><ChevronRight className="rotate-180" /></Button>
                  <h2 className={`text-3xl font-bold ${isPublic ? 'text-accent' : 'text-primary'}`}>{selectedCourse.name}</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-1 space-y-4">
                    <h4 className="font-bold text-muted-foreground uppercase text-xs tracking-widest px-2">Subjects</h4>
                    <div className="space-y-2">
                      {allSubjects?.filter(s => s.courseId === selectedCourse.id).map(subject => (
                        <Button 
                          key={subject.id} 
                          variant={selectedSubject?.id === subject.id ? 'secondary' : 'ghost'} 
                          className="w-full justify-start rounded-xl px-4 py-6"
                          onClick={() => setSelectedSubject(subject)}
                        >
                          <BookOpen className="mr-3 h-4 w-4" /> {subject.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-6">
                    {selectedSubject ? (
                      <Tabs defaultValue="videos">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                          <TabsTrigger value="videos"><PlayCircle size={16} className="mr-2" /> Videos</TabsTrigger>
                          <TabsTrigger value="notes"><FileText size={16} className="mr-2" /> Notes</TabsTrigger>
                        </TabsList>
                        <TabsContent value="videos" className="space-y-4">
                          {currentMaterials.filter(m => m.type === 'video').map(v => (
                            <Card key={v.id} className="overflow-hidden border-none shadow-lg rounded-2xl group relative">
                              <div className="aspect-video relative bg-black">
                                <iframe src={getYouTubeEmbedUrl(v.url)} className="absolute inset-0 w-full h-full" allowFullScreen />
                              </div>
                              <CardHeader className="p-4 bg-card">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-sm font-bold">{v.title} - Ch {v.chapter}</CardTitle>
                                  {isAdmin && (
                                    <Button variant="ghost" size="icon" onClick={() => setEditingMaterial(v)} className="h-8 w-8 text-muted-foreground">
                                      <Edit2 size={14} />
                                    </Button>
                                  )}
                                </div>
                              </CardHeader>
                            </Card>
                          ))}
                        </TabsContent>
                        <TabsContent value="notes" className="space-y-2">
                           {currentMaterials.filter(m => m.type === 'pdf').map(n => (
                            <Card key={n.id} className="hover:bg-muted/30 transition-colors">
                              <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <FileText className="text-blue-500 h-4 w-4" /> 
                                  <span className="font-bold">{n.title} (Ch {n.chapter})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isAdmin && (
                                    <Button variant="ghost" size="icon" onClick={() => setEditingMaterial(n)} className="h-8 w-8 text-muted-foreground">
                                      <Edit2 size={14} />
                                    </Button>
                                  )}
                                  <Button size="sm" onClick={() => window.open(n.url, '_blank')} className="rounded-xl px-4">Open</Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </TabsContent>
                      </Tabs>
                    ) : <div className="text-center py-20 border-2 border-dashed rounded-3xl">Select a subject to start learning.</div>}
                  </div>

                  <div className="lg:col-span-1">
                    {!isPublic ? <AICompanion /> : (
                      <Card className="bg-accent/5 border-accent/20">
                        <CardHeader>
                          <CardTitle className="text-accent flex items-center gap-2"><Sparkles /> Student Voice</CardTitle>
                          <CardDescription>Ask our mentors anything about your studies.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <PublicDoubtForm studentName={user.name} className={selectedCourse.name} />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input 
                value={editingMaterial?.title || ''} 
                onChange={e => setEditingMaterial({...editingMaterial, title: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input 
                value={editingMaterial?.url || ''} 
                onChange={e => setEditingMaterial({...editingMaterial, url: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={async () => {
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

function PublicDoubtForm({ studentName, className }: { studentName: string, className: string }) {
  const db = useFirestore();
  const [question, setQuestion] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!db || !question.trim()) return;
    await addDoc(collection(db, 'publicDoubts'), {
      studentName,
      className,
      question: question.trim(),
      status: 'open',
      mentorId: null,
      createdAt: serverTimestamp()
    });
    setSent(true);
    setQuestion('');
  };

  if (sent) return <div className="text-center p-4 bg-green-50 text-green-700 rounded-xl">Thank you! A mentor will respond to you soon.</div>;

  return (
    <div className="space-y-4">
      <Input placeholder="What is your doubt?" value={question} onChange={e => setQuestion(e.target.value)} />
      <Button className="w-full bg-accent" onClick={handleSubmit} disabled={!question.trim()}>Ask Mentors</Button>
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
