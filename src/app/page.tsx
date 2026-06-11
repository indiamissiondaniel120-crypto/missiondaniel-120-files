'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AuthProvider, useAuth } from '@/components/auth-wrapper';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from '@/components/ui/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AICompanion } from '@/components/ai-companion';
import { Badge } from '@/components/ui/badge';
import { StudentManagement, ActivityViewer } from '@/components/student-management';
import { InactivityMonitor } from '@/components/inactivity-monitor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Home, BookOpen, PlayCircle, ChevronRight, GraduationCap, Users, FileText, Sparkles, ShieldCheck, Search, Edit2, Loader2, UserRound, ArrowLeft, Pencil, Lightbulb, ListChecks, MessageSquare, Send, Trash2, Clock, CheckCircle2, Globe, Video, MonitorPlay, Menu } from 'lucide-react';
import Image from 'next/image';
import { FirebaseClientProvider, useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { LiveClassInterface } from '@/components/live-class';

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
      <div className="absolute top-10 md:top-20 left-4 md:left-10 text-primary/10 floating-graphic" style={{ animationDelay: '0s' }}>
        <GraduationCap className="w-16 h-16 md:w-[120px] md:h-[120px]" />
      </div>
      <div className="absolute top-20 md:top-40 right-4 md:right-20 text-accent/10 floating-graphic" style={{ animationDelay: '1s' }}>
        <BookOpen className="w-14 h-14 md:w-[100px] md:h-[100px]" />
      </div>
      <div className="absolute bottom-10 md:bottom-20 left-1/4 text-primary/5 floating-graphic" style={{ animationDelay: '2s' }}>
        <Lightbulb className="w-20 h-20 md:w-[150px] md:h-[150px]" />
      </div>
      <div className="absolute top-1/2 right-1/4 text-accent/5 floating-graphic" style={{ animationDelay: '3.5s' }}>
        <Sparkles className="w-16 h-16 md:w-[130px] md:h-[130px]" />
      </div>
      <div className="absolute bottom-20 md:bottom-40 right-4 md:right-10 text-primary/10 floating-graphic" style={{ animationDelay: '4.5s' }}>
        <Pencil className="w-12 h-12 md:w-[90px] md:h-[90px]" />
      </div>
      <div className="absolute bottom-0 right-0 w-full h-1/3 bg-primary/5 -skew-y-3 origin-bottom-right" />
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-6 text-center space-y-8 md:space-y-12 relative overflow-hidden">
      <DecorativeGraphics />
      
      <div className="max-w-3xl space-y-4 md:space-y-6 z-10">
        <div className="mx-auto w-16 h-16 md:w-24 md:h-24 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl mb-4 md:mb-8 transform hover:scale-110 transition-transform duration-500">
          <GraduationCap className="w-10 h-10 md:w-12 md:h-12" />
        </div>
        <h1 className="text-4xl md:text-8xl font-black text-primary tracking-tighter drop-shadow-sm">DANIEL 120</h1>
        <div className="min-h-[60px] md:h-24 flex flex-col items-center justify-center">
          <p className="text-base md:text-3xl font-medium text-foreground/80 italic px-2 animate-in fade-in slide-in-from-bottom-2 duration-1000">
            {quote ? `"${quote}"` : "..."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 w-full max-w-6xl z-10 px-2 md:px-4">
        <Card className="group hover:border-primary/50 transition-all cursor-pointer shadow-2xl overflow-hidden rounded-[1.5rem] md:rounded-[2.5rem] bg-white/60 backdrop-blur-md" onClick={() => onSelect('login')}>
          <div className="h-1.5 md:h-2 bg-primary group-hover:h-3 transition-all" />
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-xl md:text-2xl font-bold">Daniel 120</CardTitle>
            <CardDescription className="text-xs md:text-sm">Official Portal for Students & Mentors</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0"><Button className="w-full bg-primary py-4 md:py-7 rounded-xl md:rounded-2xl group-hover:scale-[1.02] transition-transform text-base md:text-lg shadow-lg">Click to Login</Button></CardContent>
        </Card>

        <Card className="group hover:border-accent/50 transition-all cursor-pointer shadow-2xl overflow-hidden rounded-[1.5rem] md:rounded-[2.5rem] bg-white/60 backdrop-blur-md" onClick={() => onSelect('public-register')}>
          <div className="h-1.5 md:h-2 bg-accent group-hover:h-3 transition-all" />
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-xl md:text-2xl font-bold">Students Corner</CardTitle>
            <CardDescription className="text-xs md:text-sm">Uplifting education for every child.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0"><Button className="w-full bg-accent py-4 md:py-7 rounded-xl md:rounded-2xl group-hover:scale-[1.02] transition-transform text-base md:text-lg shadow-lg">Click to Open</Button></CardContent>
        </Card>

        <Card className="group hover:border-indigo-400/50 transition-all cursor-pointer shadow-2xl overflow-hidden rounded-[1.5rem] md:rounded-[2.5rem] opacity-80 md:opacity-70 grayscale md:hover:grayscale-0 hover:opacity-100 bg-white/60 backdrop-blur-md">
          <div className="h-1.5 md:h-2 bg-indigo-400 group-hover:h-3 transition-all" />
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-xl md:text-2xl font-bold">Muskhan</CardTitle>
            <CardDescription className="text-xs md:text-sm">Supportive community access.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0"><Button variant="outline" className="w-full py-4 md:py-7 rounded-xl md:rounded-2xl text-base md:text-lg">Click to Login</Button></CardContent>
        </Card>
      </div>

      <Button variant="ghost" className="text-muted-foreground hover:text-primary mt-6 md:mt-12 gap-2 z-10 bg-white/50 backdrop-blur-sm rounded-xl" onClick={() => onSelect('admin-login')}>
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-6 relative overflow-hidden">
      <DecorativeGraphics />
      <Card className="w-full max-w-md shadow-2xl z-10 rounded-[1.5rem] md:rounded-[2.5rem] border-none bg-white/80 backdrop-blur-lg">
        <CardHeader className="text-center space-y-4 p-6 md:p-8">
          <div className={`mx-auto w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-white shadow-lg ${mode === 'admin' ? 'bg-accent' : 'bg-primary'}`}>
            {mode === 'admin' ? <ShieldCheck size={28} /> : <UserRound size={28} />}
          </div>
          <CardTitle className="text-xl md:text-2xl font-bold">{mode === 'admin' ? 'Management Login' : 'Daniel 120 Login'}</CardTitle>
          <CardDescription className="text-xs md:text-sm">Please enter your credentials to continue.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8 pt-0">
          <form onSubmit={handleLogin} className="space-y-4 md:space-y-6">
            {mode === 'standard' && (
              <Tabs value={loginType} onValueChange={(v: any) => setLoginType(v)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-xl md:rounded-2xl bg-muted p-1 h-10 md:h-12">
                  <TabsTrigger value="student" className="rounded-lg md:rounded-xl font-bold text-xs md:text-sm">Student</TabsTrigger>
                  <TabsTrigger value="mentor" className="rounded-lg md:rounded-xl font-bold text-xs md:text-sm">Mentor</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground ml-1">ID / Username</Label>
                <Input value={form.id} className="rounded-xl md:rounded-2xl h-12 md:h-14 bg-white/50 border-muted" onChange={e => setForm({...form, id: e.target.value})} placeholder="Enter your ID" />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Password</Label>
                <Input type="password" value={form.password} className="rounded-xl md:rounded-2xl h-12 md:h-14 bg-white/50 border-muted" onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" />
              </div>
            </div>
            <Button type="submit" className={`w-full py-6 md:py-8 rounded-xl md:rounded-[1.5rem] text-base md:text-lg font-bold shadow-xl ${mode === 'admin' ? 'bg-accent' : 'bg-primary'}`} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
            </Button>
            <Button variant="ghost" className="w-full rounded-xl text-sm" onClick={onBack} type="button">
              <ArrowLeft size={16} className="mr-2" /> Back to Home
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function PrivateDoubtClearing({ user }: { user: any }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const doubtsQuery = useMemo(() => db ? query(collection(db, 'privateDoubts'), where('studentId', '==', user.id)) : null, [db, user.id]);
  const { data: rawDoubts } = useCollection(doubtsQuery);
  
  const myDoubts = useMemo(() => {
    if (!rawDoubts) return null;
    return [...rawDoubts].sort((a, b) => {
      const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
      const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    });
  }, [rawDoubts]);

  useEffect(() => {
    if (!myDoubts || !db) return;
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    myDoubts.forEach(doubt => {
      if (doubt.openedAt && doubt.openedAt.toDate) {
        const openedTime = doubt.openedAt.toDate().getTime();
        if (now - openedTime > twentyFourHours) {
          const docRef = doc(db, 'privateDoubts', doubt.id);
          deleteDoc(docRef).catch(async (serverError) => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
               path: docRef.path,
               operation: 'delete'
             }));
          });
        }
      }
    });
  }, [myDoubts, db]);

  const handleSubmit = () => {
    if (!db || !question.trim() || !user.mentorId) {
      if (!user.mentorId) toast({ variant: 'destructive', title: "No Mentor Assigned", description: "Please ask your administrator to assign a mentor." });
      return;
    }
    setLoading(true);
    const doubtsRef = collection(db, 'privateDoubts');
    const data = {
      studentId: user.id,
      studentName: user.name,
      mentorId: user.mentorId,
      question: question.trim(),
      status: 'open',
      createdAt: serverTimestamp()
    };

    addDoc(doubtsRef, data).then(() => {
      setQuestion('');
      toast({ title: "Doubt Sent", description: "Your assigned mentor has been notified." });
      setLoading(false);
    }).catch(async (serverError) => {
      setLoading(false);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: doubtsRef.path,
        operation: 'create',
        requestResourceData: data
      }));
    });
  };

  const markAsOpened = (doubt: any) => {
    if (doubt.status === 'answered' && !doubt.openedAt && db) {
      const docRef = doc(db, 'privateDoubts', doubt.id);
      updateDoc(docRef, { openedAt: serverTimestamp() }).catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'update'
        }));
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-[1.5rem] md:rounded-[2rem] border-none shadow-xl bg-white/60 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-primary/10 p-6 md:p-8">
          <CardTitle className="text-xl md:text-2xl font-black text-primary flex items-center gap-2">
            <MessageSquare className="text-accent" /> Ask My Mentor
          </CardTitle>
          <CardDescription className="font-bold text-xs md:text-sm">Private doubt clearance with your allocated mentor.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-4 md:space-y-6">
          <div className="space-y-2">
            <Label className="font-black text-[9px] uppercase tracking-widest text-muted-foreground ml-1">Your Question</Label>
            <Textarea 
              placeholder="What academic help do you need today?" 
              className="rounded-xl md:rounded-2xl min-h-[100px] md:min-h-[120px] bg-white border-muted font-medium p-4 md:p-6 text-sm md:text-base" 
              value={question}
              onChange={e => setQuestion(e.target.value)}
            />
          </div>
          <Button className="w-full py-6 md:py-8 rounded-xl md:rounded-2xl text-base md:text-lg font-black bg-primary shadow-xl shadow-primary/20" onClick={handleSubmit} disabled={loading || !question.trim()}>
            {loading ? <Loader2 className="animate-spin" /> : <><Send size={18} className="mr-2" /> Send to Mentor</>}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h4 className="font-black text-primary uppercase text-[10px] tracking-[0.2em] px-4">Doubt History</h4>
        <div className="grid gap-3">
          {myDoubts?.map(doubt => (
            <Dialog key={doubt.id} onOpenChange={(open) => open && markAsOpened(doubt)}>
              <DialogTrigger asChild>
                <Card className={`cursor-pointer transition-all hover:scale-[1.01] rounded-xl md:rounded-2xl border-none shadow-md ${doubt.status === 'answered' ? 'bg-green-50' : 'bg-white'}`}>
                  <CardContent className="p-4 md:p-6 flex items-center justify-between">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-bold text-xs md:text-sm truncate pr-2">{doubt.question}</span>
                      <span className="text-[9px] text-muted-foreground">{doubt.createdAt?.toDate?.()?.toLocaleString() || 'Syncing...'}</span>
                    </div>
                    <Badge className={`rounded-xl px-2 md:px-3 py-0.5 md:py-1 text-[9px] md:text-xs shrink-0 ${doubt.status === 'answered' ? 'bg-green-600' : 'bg-yellow-500'}`}>
                      {doubt.status === 'answered' ? 'Answered' : 'Pending'}
                    </Badge>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 max-w-xl w-[95vw]">
                <DialogHeader>
                  <DialogTitle className="text-xl md:text-2xl font-black text-primary">Doubt Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 md:space-y-6 py-4 md:py-6">
                  <div className="space-y-2">
                    <Label className="font-black text-[10px] uppercase text-muted-foreground">Your Question</Label>
                    <p className="p-3 md:p-4 bg-muted/20 rounded-xl font-medium text-sm md:text-base">{doubt.question}</p>
                  </div>
                  {doubt.answer && (
                    <div className="space-y-2">
                      <Label className="font-black text-[10px] uppercase text-green-600">Mentor's Response</Label>
                      <p className="p-4 md:p-6 bg-green-50 rounded-xl md:rounded-2xl font-bold text-base md:text-lg text-green-900 border border-green-200">{doubt.answer}</p>
                      <p className="text-[9px] md:text-[10px] text-green-600/60 font-bold italic">* This answer will be automatically removed 24 hours after opening.</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          ))}
          {myDoubts?.length === 0 && (
            <div className="text-center py-8 md:py-12 text-muted-foreground italic font-medium bg-white/40 rounded-2xl md:rounded-3xl border-2 border-dashed">No doubts posted yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function MentorDoubtClearing({ mentorId }: { mentorId: string }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [answeringDoubt, setAnsweringDoubt] = useState<any>(null);
  const [answer, setAnswer] = useState('');

  const doubtsQuery = useMemo(() => db ? query(collection(db, 'privateDoubts'), where('mentorId', '==', mentorId), where('status', '==', 'open')) : null, [db, mentorId]);
  const { data: rawDoubts } = useCollection(doubtsQuery);
  
  const pendingDoubts = useMemo(() => {
    if (!rawDoubts) return null;
    return [...rawDoubts].sort((a, b) => {
      const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
      const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    });
  }, [rawDoubts]);

  const handleSendAnswer = () => {
    if (!db || !answeringDoubt || !answer.trim()) return;
    const docRef = doc(db, 'privateDoubts', answeringDoubt.id);
    const data = {
      answer: answer.trim(),
      status: 'answered',
      answeredAt: serverTimestamp()
    };

    updateDoc(docRef, data).then(() => {
      setAnsweringDoubt(null);
      setAnswer('');
      toast({ title: "Answer Sent" });
    }).catch(async (serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data
      }));
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl md:text-2xl font-black text-primary flex items-center gap-2 px-2">
        <ListChecks className="text-accent" /> Assigned Student Doubts
      </h3>
      <div className="grid gap-4">
        {pendingDoubts?.map(doubt => (
          <Card key={doubt.id} className="border-none shadow-lg rounded-xl md:rounded-2xl bg-white/70 overflow-hidden">
            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] md:text-[10px] font-black">{doubt.studentName}</Badge>
                  <span className="text-[9px] md:text-[10px] text-muted-foreground">{doubt.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}</span>
                </div>
                <p className="font-bold text-base md:text-lg leading-tight">{doubt.question}</p>
              </div>
              <Dialog open={answeringDoubt?.id === doubt.id} onOpenChange={(open) => !open && setAnsweringDoubt(null)}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl h-12 md:h-14 px-6 md:px-8 bg-accent font-black text-sm md:text-lg" onClick={() => setAnsweringDoubt(doubt)}>Respond Now</Button>
                </DialogTrigger>
                <DialogContent className="rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 max-w-xl w-[95vw]">
                  <DialogHeader>
                    <DialogTitle className="text-xl md:text-2xl font-black">Provide Answer</DialogTitle>
                    <DialogDescription className="font-bold text-xs md:text-sm">Helping {doubt.studentName} understand.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 md:space-y-6 py-4 md:py-6">
                    <div className="p-3 md:p-4 bg-muted/20 rounded-xl">
                      <span className="text-[9px] md:text-[10px] font-black uppercase text-muted-foreground block mb-1">Question</span>
                      <p className="font-medium text-sm md:text-base">{doubt.question}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-black text-[10px] uppercase">Your Answer</Label>
                      <Textarea 
                        placeholder="Write your explanation here..." 
                        className="rounded-xl md:rounded-2xl min-h-[120px] md:min-h-[150px] bg-white border-muted font-medium p-4 text-sm md:text-base" 
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button className="w-full h-14 md:h-16 rounded-xl md:rounded-2xl text-base md:text-lg font-black bg-primary" onClick={handleSendAnswer} disabled={!answer.trim()}>Send Answer</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
        {pendingDoubts?.length === 0 && (
          <div className="text-center py-12 md:py-20 bg-muted/10 border-4 border-dashed rounded-[2rem] md:rounded-[3rem] flex flex-col items-center justify-center space-y-4">
            <CheckCircle2 className="text-green-500 h-10 w-10 md:h-12 md:w-12" />
            <p className="font-black text-xs md:text-sm text-muted-foreground italic">All assigned doubts cleared!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MentorPublicPool({ mentorId, mentorName }: { mentorId: string, mentorName: string }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [answeringDoubt, setAnsweringDoubt] = useState<any>(null);
  const [answer, setAnswer] = useState('');

  const doubtsQuery = useMemo(() => db ? query(collection(db, 'publicDoubts'), where('status', '==', 'open')) : null, [db]);
  const { data: rawDoubts } = useCollection(doubtsQuery);
  
  const poolDoubts = useMemo(() => {
    if (!rawDoubts) return null;
    return [...rawDoubts].sort((a, b) => {
      const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
      const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    });
  }, [rawDoubts]);

  const handleSendAnswer = () => {
    if (!db || !answeringDoubt || !answer.trim()) return;
    const docRef = doc(db, 'publicDoubts', answeringDoubt.id);
    const data = {
      answer: answer.trim(),
      status: 'answered',
      mentorId: mentorId,
      mentorName: mentorName,
      answeredAt: serverTimestamp()
    };

    updateDoc(docRef, data).then(() => {
      setAnsweringDoubt(null);
      setAnswer('');
      toast({ title: "Public Doubt Answered" });
    }).catch(async (serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data
      }));
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl md:text-2xl font-black text-accent flex items-center gap-2 px-2">
        <Globe className="text-accent" /> Students Corner (Public Pool)
      </h3>
      <div className="grid gap-4">
        {poolDoubts?.map(doubt => (
          <Card key={doubt.id} className="border-none shadow-lg rounded-xl md:rounded-2xl bg-accent/5 overflow-hidden border-l-4 border-accent">
            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[9px] md:text-[10px] font-black">{doubt.studentName} ({doubt.className})</Badge>
                  <span className="text-[9px] md:text-[10px] text-muted-foreground">{doubt.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}</span>
                </div>
                <p className="font-bold text-base md:text-lg leading-tight">{doubt.question}</p>
              </div>
              <Dialog open={answeringDoubt?.id === doubt.id} onOpenChange={(open) => !open && setAnsweringDoubt(null)}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl h-12 md:h-14 px-6 md:px-8 bg-accent font-black text-sm md:text-lg" onClick={() => setAnsweringDoubt(doubt)}>Respond to Public</Button>
                </DialogTrigger>
                <DialogContent className="rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 max-w-xl w-[95vw]">
                  <DialogHeader>
                    <DialogTitle className="text-xl md:text-2xl font-black text-accent">Public Response</DialogTitle>
                    <DialogDescription className="font-bold text-xs md:text-sm">Answering for {doubt.studentName}.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 md:space-y-6 py-4 md:py-6">
                    <div className="p-3 md:p-4 bg-muted/20 rounded-xl">
                      <span className="text-[9px] md:text-[10px] font-black uppercase text-muted-foreground block mb-1">Public Question</span>
                      <p className="font-medium text-sm md:text-base">{doubt.question}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-black text-[10px] uppercase">Your Answer</Label>
                      <Textarea 
                        placeholder="Write your explanation here..." 
                        className="rounded-xl md:rounded-2xl min-h-[120px] md:min-h-[150px] bg-white border-muted font-medium p-4 text-sm md:text-base" 
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button className="w-full h-14 md:h-16 rounded-xl md:rounded-2xl text-base md:text-lg font-black bg-accent" onClick={handleSendAnswer} disabled={!answer.trim()}>Post Answer</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
        {poolDoubts?.length === 0 && (
          <div className="text-center py-12 md:py-20 bg-accent/5 border-4 border-dashed border-accent/20 rounded-[2rem] md:rounded-[3rem] flex flex-col items-center justify-center space-y-4">
            <CheckCircle2 className="text-accent h-10 w-10 md:h-12 md:w-12" />
            <p className="font-black text-xs md:text-sm text-accent/60 italic">Students Corner is all clear!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MentorMyStudentsSummary({ mentorId, allMentors }: { mentorId: string, allMentors: any[] }) {
  const db = useFirestore();
  const studentsQuery = useMemo(() => db ? query(collection(db, 'students'), where('mentorId', '==', mentorId)) : null, [db]);
  const { data: myStudents } = useCollection(studentsQuery);

  if (!myStudents || myStudents.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold flex items-center gap-2 text-primary px-2"><Users className="text-accent" /> My Assigned Students</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {myStudents.map(student => (
          <Card key={student.id} className="border-primary/20 bg-primary/5 rounded-xl">
            <CardHeader className="p-4 md:p-6 pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-sm md:text-base flex items-center gap-2">
                    <UserRound size={16} className="text-primary" />
                    {student.name}
                  </CardTitle>
                  <CardDescription className="text-xs">Class: {student.class}</CardDescription>
                </div>
                <ActivityViewer student={student} mentors={allMentors} />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, logout, login } = useAuth();
  const { toast } = useToast();
  const db = useFirestore();
  
  const [view, setView] = useState<'landing' | 'login' | 'admin-login' | 'public-register' | 'dashboard'>(user ? 'dashboard' : 'landing');
  const [activeMenu, setActiveMenu] = useState<'home' | 'live' | 'admin'>('home');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [publicReg, setPublicReg] = useState({ name: '', classId: '' });

  const [activeMaterial, setActiveMaterial] = useState<any>(null);
  const materialStartTimeRef = useRef<number | null>(null);

  const isAdmin = user?.role === 'admin';
  const isMentor = user?.role === 'mentor';
  const isPublic = user?.role === 'public_student';
  const isStandardStudent = user?.role === 'student';

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
          addDoc(activityRef, data).catch(async (serverError) => {
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
  const mentorsQuery = useMemo(() => db ? collection(db, 'mentors') : null, [db]);
  
  const liveSessionsIndicatorQuery = useMemo(() => {
    if (!db || !user) return null;
    if (user.class) {
      return query(collection(db, 'liveSessions'), where('classId', '==', user.class));
    }
    return collection(db, 'liveSessions');
  }, [db, user]);

  const { data: allCourses } = useCollection(coursesQuery);
  const { data: allSubjects } = useCollection(subjectsQuery);
  const { data: allMaterials } = useCollection(materialsQuery);
  const { data: allMentors } = useCollection(mentorsQuery);
  const { data: activeLiveSessions } = useCollection(liveSessionsIndicatorQuery);

  const hasLiveSession = useMemo(() => (activeLiveSessions?.length || 0) > 0, [activeLiveSessions]);

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
    
    const normalizedName = publicReg.name.trim().toLowerCase().replace(/\s+/g, '-');
    const publicId = `PUBLIC-${normalizedName}`;
    const docRef = doc(db, 'students', publicId);
    
    const data = {
      id: publicId,
      name: publicReg.name.trim(),
      class: publicReg.classId,
      role: 'public_student',
      updatedAt: serverTimestamp() 
    };

    setDoc(docRef, data, { merge: true }).then(() => {
      login(publicId, '', 'student');
      toast({ title: "Welcome back!", description: `Logged in as ${publicReg.name}` });
    }).catch(async (serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'write',
        requestResourceData: data
      }));
    });
  };

  const navigateToHome = () => {
    setSelectedCourse(null);
    setSelectedSubject(null);
    setActiveMenu('home');
  };

  const handleLogout = async () => {
    if (user && db && user.role !== 'admin') {
      const collName = user.role.includes('student') ? 'students' : 'mentors';
      const activityRef = collection(db, collName, user.id, 'activity');
      const data = {
        type: 'logout',
        timestamp: serverTimestamp()
      };
      addDoc(activityRef, data).catch(async (serverError) => {
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

  const handleDeleteMaterial = () => {
    if (db && editingMaterial) {
      const docRef = doc(db, 'materials', editingMaterial.id);
      deleteDoc(docRef).then(() => {
        setEditingMaterial(null);
        toast({ title: "Deleted successfully" });
      }).catch(async (serverError) => {
         errorEmitter.emit('permission-error', new FirestorePermissionError({
           path: docRef.path,
           operation: 'delete'
         }));
      });
    }
  };

  if (view === 'landing' && !user) return <LandingPage onSelect={(v) => setView(v)} />;
  if (view === 'login' && !user) return <LoginScreen mode="standard" onBack={() => setView('landing')} />;
  if (view === 'admin-login' && !user) return <LoginScreen mode="admin" onBack={() => setView('landing')} />;
  
  if (view === 'public-register' && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 md:p-6 relative overflow-hidden">
        <DecorativeGraphics />
        <Card className="w-full max-w-md shadow-2xl z-10 rounded-[1.5rem] md:rounded-[2.5rem] border-none bg-white/80 backdrop-blur-lg">
          <CardHeader className="text-center space-y-4 p-6 md:p-8 pb-0">
            <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center shadow-inner">
              <Users size={28} />
            </div>
            <CardTitle className="text-xl md:text-2xl font-bold">Students Corner</CardTitle>
            <CardDescription className="text-xs md:text-sm">Enter your name and class to continue your learning.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="space-y-2">
              <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Your Name</Label>
              <Input placeholder="Enter your full name" className="rounded-xl md:rounded-2xl h-12 md:h-14 bg-white/50" value={publicReg.name} onChange={e => setPublicReg({...publicReg, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Select Class</Label>
              <Select onValueChange={v => setPublicReg({...publicReg, classId: v})} value={publicReg.classId}>
                <SelectTrigger className="rounded-xl md:rounded-2xl h-12 md:h-14 bg-white/50 text-xs md:text-sm"><SelectValue placeholder="Which class do you study in?" /></SelectTrigger>
                <SelectContent>{sortedCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-accent py-6 md:py-8 rounded-xl md:rounded-[1.5rem] text-base md:text-lg font-bold shadow-xl shadow-accent/20" onClick={handlePublicRegister} disabled={!publicReg.name || !publicReg.classId}>Open Learning Portal</Button>
            <Button variant="ghost" className="w-full rounded-xl text-sm" onClick={() => setView('landing')}>Back to Home</Button>
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
                <SidebarMenuButton isActive={activeMenu === 'home'} onClick={navigateToHome} className="py-8 rounded-2xl hover:bg-white/10 text-white font-bold mb-2">
                  <Home className="mr-2" /> Dashboard
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeMenu === 'live'} onClick={() => setActiveMenu('live')} className="py-8 rounded-2xl hover:bg-white/10 text-white font-bold mb-2 bg-accent/20 border border-accent/30 relative">
                  <Video className="mr-2 text-accent" /> 
                  <span>Live Classes</span>
                  {hasLiveSession && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              {(isAdmin || isMentor) && (
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={activeMenu === 'admin'} onClick={() => setActiveMenu('admin')} className="py-8 rounded-2xl bg-white/20 text-white font-black hover:bg-white/30 border border-white/20 mb-4">
                    <ListChecks className="mr-2" /> 
                    {isAdmin ? 'Management Panel' : 'Academic Overview'}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <div className="my-6 px-4 text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Curriculum Classes</div>
              {visibleCourses.map((course: any) => (
                <SidebarMenuItem key={course.id}>
                  <SidebarMenuButton isActive={selectedCourse?.id === course.id} onClick={() => { setSelectedCourse(course); setActiveMenu('home'); }} className="py-7 rounded-2xl hover:bg-white/10 text-white font-medium mb-1">
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

        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Mobile Sticky Header */}
          <header className="md:hidden flex items-center justify-between p-4 bg-primary text-white shadow-md z-50">
            <div className="flex items-center gap-2">
              <GraduationCap size={24} />
              <h1 className="text-xl font-black tracking-tighter">DANIEL 120</h1>
            </div>
            <SidebarTrigger />
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-background/50">
            <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 relative z-10">
              {activeMenu === 'live' ? (
                <LiveClassInterface />
              ) : activeMenu === 'admin' && (isAdmin || isMentor) ? (
                <StudentManagement />
              ) : !selectedCourse ? (
                <section className="space-y-8 md:space-y-12">
                  <div className={`rounded-[2rem] md:rounded-[3rem] p-8 md:p-16 text-white shadow-2xl relative overflow-hidden transition-all duration-700 ${isPublic ? 'bg-accent' : 'bg-primary'}`}>
                    <div className="relative z-10">
                      <h2 className="text-3xl md:text-7xl font-black mb-4 md:mb-6 leading-[1.1] tracking-tight">Uplifting Education,<br/>Shaping Futures</h2>
                      <p className="text-white/90 text-sm md:text-2xl font-medium max-w-2xl">Welcome, {user?.name}. {isPublic ? 'A special space for your learning journey.' : 'Your dedicated study command center.'}</p>
                    </div>
                    <div className="absolute top-0 right-0 w-40 md:w-80 h-40 md:h-80 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                    <Sparkles className="absolute top-4 right-4 md:top-10 md:right-20 text-white/20 animate-pulse w-16 h-16 md:w-[120px] md:h-[120px]" />
                  </div>

                  {isMentor && (
                    <div className="space-y-8 md:space-y-12">
                      <MentorMyStudentsSummary mentorId={user.id} allMentors={allMentors || []} />
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                        <MentorDoubtClearing mentorId={user.id} />
                        <MentorPublicPool mentorId={user.id} mentorName={user.name} />
                      </div>
                    </div>
                  )}

                  {(isStandardStudent || isPublic) && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
                      <div className="lg:col-span-2 space-y-6 md:space-y-8">
                         <section className="space-y-6 md:space-y-8">
                          <div className="flex items-center justify-between px-2">
                            <h3 className="text-2xl md:text-3xl font-black tracking-tight text-primary">Academic Core</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            {visibleCourses.map((course: any) => (
                              <Card key={course.id} className="cursor-pointer group hover:shadow-2xl transition-all duration-700 rounded-[2rem] md:rounded-[3rem] border-none shadow-xl overflow-hidden bg-white/70 backdrop-blur-sm" onClick={() => setSelectedCourse(course)}>
                                <div className="h-40 md:h-56 relative bg-muted overflow-hidden">
                                  <Image src={`https://picsum.photos/seed/${course.id}/600/400`} fill alt={course.name} className="object-cover group-hover:scale-110 transition-transform duration-1000" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent opacity-60" />
                                  <div className="absolute bottom-4 left-6 text-white font-black text-2xl md:text-3xl tracking-tighter">{course.name}</div>
                                </div>
                                <CardHeader className="p-6 md:p-8">
                                  <Button className={`w-full rounded-xl md:rounded-2xl py-6 md:py-8 font-black text-base md:text-lg transition-all shadow-lg ${isPublic ? 'bg-accent shadow-accent/20' : 'bg-primary shadow-primary/20'} group-hover:scale-[1.03]`}>Access Materials</Button>
                                </CardHeader>
                              </Card>
                            ))}
                          </div>
                        </section>
                      </div>
                      <div className="lg:col-span-1">
                        {isStandardStudent ? <PrivateDoubtClearing user={user} /> : (
                          <Card className="bg-white/60 backdrop-blur-md border-accent/20 rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden">
                            <div className="h-2 md:h-3 bg-accent" />
                            <CardHeader className="p-6 md:p-10">
                              <CardTitle className="text-accent flex items-center gap-3 md:gap-4 text-xl md:text-3xl font-black tracking-tighter"><Sparkles size={24} /> Students Corner</CardTitle>
                              <CardDescription className="text-foreground/70 font-bold text-xs md:text-base mt-1 md:mt-2">Post your doubt for our mentors to review.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 md:p-10 pt-0">
                              <PublicDoubtFlowSimple selectedClassName={user?.class || ''} />
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              ) : (
                <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="flex items-center gap-4 md:gap-6">
                    <Button variant="outline" size="icon" onClick={() => setSelectedCourse(null)} className="rounded-full h-10 w-10 md:h-14 md:w-14 border-primary/20 hover:bg-primary/10 shadow-lg shrink-0"><ChevronRight className="rotate-180" size={18} /></Button>
                    <div>
                      <h2 className={`text-2xl md:text-5xl font-black tracking-tighter ${isPublic ? 'text-accent' : 'text-primary'}`}>{selectedCourse.name}</h2>
                      <p className="text-[10px] md:text-base text-muted-foreground font-bold uppercase tracking-widest opacity-60">Select a subject for your session</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-10">
                    <div className="lg:col-span-1 space-y-4">
                      <h4 className="font-black text-muted-foreground uppercase text-[10px] md:text-[11px] tracking-[0.2em] px-2 mb-4 md:mb-6">Subject Catalog</h4>
                      <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible gap-3 pb-2 md:pb-0 scrollbar-hide">
                        {allSubjects?.filter(s => s.courseId === selectedCourse.id).map(subject => (
                          <Button 
                            key={subject.id} 
                            variant={selectedSubject?.id === subject.id ? 'default' : 'ghost'} 
                            className={`flex-shrink-0 md:flex-shrink-1 w-auto md:w-full justify-start rounded-xl md:rounded-[2rem] px-4 md:px-8 py-6 md:py-10 text-sm md:text-xl font-black transition-all duration-300 ${selectedSubject?.id === subject.id ? (isPublic ? 'bg-accent text-white shadow-xl' : 'bg-primary text-white shadow-xl') : 'hover:bg-white bg-white/40 border border-transparent hover:border-primary/20'}`}
                            onClick={() => setSelectedSubject(subject)}
                          >
                            <div className={`mr-3 md:mr-6 p-2 md:p-3 rounded-xl md:rounded-2xl shadow-sm ${selectedSubject?.id === subject.id ? 'bg-white/20' : 'bg-muted'}`}>
                              <BookOpen className="h-4 w-4 md:h-6 md:w-6" />
                            </div>
                            {subject.name}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6 md:space-y-8">
                      {selectedSubject ? (
                        <Tabs defaultValue="videos" className="bg-white/60 backdrop-blur-md p-4 md:p-8 rounded-[2rem] md:rounded-[3.5rem] shadow-2xl border border-white/40">
                          <TabsList className="grid w-full grid-cols-2 mb-6 md:mb-10 bg-muted/30 p-1 md:p-2 rounded-2xl md:rounded-3xl h-12 md:h-16">
                            <TabsTrigger value="videos" className="rounded-xl md:rounded-2xl text-xs md:text-xl font-black data-[state=active]:bg-white data-[state=active]:shadow-lg"><PlayCircle className="mr-1.5 md:mr-3 h-4 w-4 md:h-[22px] md:w-[22px]" /> Videos</TabsTrigger>
                            <TabsTrigger value="notes" className="rounded-xl md:rounded-2xl text-xs md:text-xl font-black data-[state=active]:bg-white data-[state=active]:shadow-lg"><FileText className="mr-1.5 md:mr-3 h-4 w-4 md:h-[22px] md:w-[22px]" /> Notes</TabsTrigger>
                          </TabsList>
                          <TabsContent value="videos" className="space-y-6 md:space-y-8">
                            {currentMaterials.filter(m => m.type === 'video').length === 0 && (
                              <div className="text-center py-12 md:py-20 text-muted-foreground font-bold italic bg-muted/20 rounded-[2rem] md:rounded-[3rem] border-4 border-dashed">No videos yet.</div>
                            )}
                            {currentMaterials.filter(m => m.type === 'video').map(v => (
                              <Card key={v.id} className="overflow-hidden border-none shadow-2xl rounded-[1.5rem] md:rounded-[3rem] group relative hover:-translate-y-1 transition-all duration-500" onMouseEnter={() => setActiveMaterial(v)} onMouseLeave={() => setActiveMaterial(null)}>
                                <div className="aspect-video relative bg-black shadow-inner">
                                  <iframe src={getYouTubeEmbedUrl(v.url)} className="absolute inset-0 w-full h-full" allowFullScreen />
                                </div>
                                <CardHeader className="p-4 md:p-8 bg-white/80">
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                      <Badge variant="outline" className="mb-2 rounded-lg px-2 py-0.5 bg-primary/10 text-primary border-primary/20 font-black tracking-widest uppercase text-[8px] md:text-[10px]">Ch {v.chapter}</Badge>
                                      <CardTitle className="text-base md:text-2xl font-black tracking-tight truncate">{v.title}</CardTitle>
                                    </div>
                                    {isAdmin && (
                                      <Button variant="ghost" size="icon" onClick={() => setEditingMaterial(v)} className="h-10 w-10 text-muted-foreground hover:bg-muted rounded-xl">
                                        <Edit2 size={16} />
                                      </Button>
                                    )}
                                  </div>
                                </CardHeader>
                              </Card>
                            ))}
                          </TabsContent>
                          <TabsContent value="notes" className="space-y-4 md:space-y-6">
                             {currentMaterials.filter(m => m.type === 'pdf').length === 0 && (
                              <div className="text-center py-12 md:py-20 text-muted-foreground font-bold italic bg-muted/20 rounded-[2rem] md:rounded-[3rem] border-4 border-dashed">No notes yet.</div>
                            )}
                             {currentMaterials.filter(m => m.type === 'pdf').map(n => (
                              <Card key={n.id} className="hover:bg-white/80 transition-all rounded-xl md:rounded-[2.5rem] border-muted/40 border-2 bg-muted/10 group" onMouseEnter={() => setActiveMaterial(n)} onMouseLeave={() => setActiveMaterial(null)}>
                                <CardContent className="p-4 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                  <div className="flex items-center gap-4 md:gap-6">
                                    <div className="p-3 bg-primary/10 text-primary rounded-xl md:rounded-3xl shadow-sm group-hover:scale-110 transition-transform"><FileText className="h-6 w-6 md:h-8 md:w-8" /></div>
                                    <div className="min-w-0">
                                      <span className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] text-primary/60 mb-0.5 md:mb-1 block">Chapter {n.chapter}</span>
                                      <div className="font-black text-base md:text-2xl tracking-tight truncate">{n.title}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 w-full md:w-auto">
                                    {isAdmin && (
                                      <Button variant="ghost" size="icon" onClick={() => setEditingMaterial(n)} className="h-10 w-10 text-muted-foreground rounded-xl">
                                        <Edit2 size={16} />
                                      </Button>
                                    )}
                                    <Button size="lg" onClick={() => window.open(n.url, '_blank')} className="flex-1 md:flex-none rounded-xl h-12 md:h-14 md:px-10 font-black text-sm md:text-lg bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all">Open Notes</Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </TabsContent>
                        </Tabs>
                      ) : <div className="text-center py-20 md:py-40 border-4 md:border-8 border-dashed rounded-[2rem] md:rounded-[4rem] bg-white/20 border-primary/10 flex flex-col items-center justify-center space-y-4 md:space-y-6">
                          <div className="p-6 md:p-8 bg-primary/10 text-primary rounded-full shadow-inner animate-bounce"><BookOpen size={48} className="md:w-16 md:h-16" /></div>
                          <p className="text-lg md:text-2xl font-black text-primary/40 tracking-tight px-4">Select a subject to open the curriculum.</p>
                        </div>}
                    </div>

                    <div className="lg:col-span-1">
                      {!isPublic ? (
                        <Card className="bg-white/60 backdrop-blur-md border-primary/20 rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden p-2">
                          <AICompanion />
                        </Card>
                      ) : (
                        <Card className="bg-white/60 backdrop-blur-md border-accent/20 rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden">
                          <div className="h-2 md:h-3 bg-accent" />
                          <CardHeader className="p-6 md:p-10">
                            <CardTitle className="text-accent flex items-center gap-3 md:gap-4 text-xl md:text-3xl font-black tracking-tighter"><Sparkles size={24} /> Students Corner</CardTitle>
                            <CardDescription className="text-foreground/70 font-bold text-xs md:text-base mt-1 md:mt-2">Post your doubt for our mentors to review.</CardDescription>
                          </CardHeader>
                          <CardContent className="p-6 md:p-10 pt-0">
                            <PublicDoubtFlowSimple selectedClassName={selectedCourse?.name || ''} />
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
      </div>

      <Dialog open={!!editingMaterial} onOpenChange={() => setEditingMaterial(null)}>
        <DialogContent className="rounded-[2rem] p-6 md:p-10 max-w-lg border-none bg-white/95 backdrop-blur-xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-2xl md:text-3xl font-black tracking-tighter text-primary">Edit Material</DialogTitle>
            <DialogDescription className="font-bold text-xs md:text-sm">Modify the title or link for this resource.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 md:space-y-8 py-4 md:py-8">
            <div className="space-y-2 md:space-y-3">
              <Label className="font-black text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Material Title</Label>
              <Input className="rounded-xl h-12 md:h-14 bg-muted/30 border-none font-bold text-base md:text-lg" value={editingMaterial?.title || ''} onChange={e => setEditingMaterial({...editingMaterial, title: e.target.value})} />
            </div>
            <div className="space-y-2 md:space-y-3">
              <Label className="font-black text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Resource URL</Label>
              <Input className="rounded-xl h-12 md:h-14 bg-muted/30 border-none font-medium text-sm" value={editingMaterial?.url || ''} onChange={e => setEditingMaterial({...editingMaterial, url: e.target.value})} />
            </div>
          </div>
          <DialogFooter className="p-0 flex flex-col gap-2">
            <Button className="w-full h-14 md:h-16 rounded-2xl md:rounded-3xl text-base md:text-xl font-black bg-primary shadow-2xl shadow-primary/30" onClick={() => {
              if (db && editingMaterial) {
                const docRef = doc(db, 'materials', editingMaterial.id);
                const updateData = { ...editingMaterial };
                updateDoc(docRef, updateData).then(() => {
                  setEditingMaterial(null);
                  toast({ title: "Updated successfully" });
                }).catch(async (serverError) => {
                   errorEmitter.emit('permission-error', new FirestorePermissionError({
                     path: docRef.path,
                     operation: 'update',
                     requestResourceData: updateData
                   }));
                });
              }
            }}>Save Changes</Button>
            <Button variant="destructive" className="w-full h-12 md:h-14 rounded-2xl font-black" onClick={handleDeleteMaterial}>
              <Trash2 size={18} className="mr-2" /> Delete Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

function PublicDoubtFlowSimple({ selectedClassName }: { selectedClassName: string }) {
  const { user } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const doubtsQuery = useMemo(() => db && user ? query(collection(db, 'publicDoubts'), where('studentId', '==', user.id)) : null, [db, user?.id]);
  const { data: rawDoubts } = useCollection(doubtsQuery);
  
  const myPublicDoubts = useMemo(() => {
    if (!rawDoubts) return null;
    return [...rawDoubts].sort((a, b) => {
      const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
      const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    });
  }, [rawDoubts]);

  useEffect(() => {
    if (!myPublicDoubts) return;
    const answered = myPublicDoubts.filter(d => d.status === 'answered' && !d.openedAt);
    if (answered.length > 0) {
      toast({
        title: "Mentor Answered!",
        description: `Your academic doubt has been cleared.`,
        className: "bg-green-600 text-white"
      });
    }
  }, [myPublicDoubts?.length]);

  useEffect(() => {
    if (!myPublicDoubts || !db) return;
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    myPublicDoubts.forEach(doubt => {
      if (doubt.openedAt && doubt.openedAt.toDate) {
        const openedTime = doubt.openedAt.toDate().getTime();
        if (now - openedTime > twentyFourHours) {
          const docRef = doc(db, 'publicDoubts', doubt.id);
          deleteDoc(docRef).catch(async (serverError) => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
               path: docRef.path,
               operation: 'delete'
             }));
          });
        }
      }
    });
  }, [myPublicDoubts, db]);

  const handleSubmit = async () => {
    if (!db || !question.trim() || !user) return;
    setLoading(true);
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
    addDoc(doubtsRef, data).then(() => {
      toast({ title: "Doubt Posted", description: "Your doubt is now in the public pool for mentors." });
      setQuestion('');
      setLoading(false);
    }).catch(async (serverError) => {
      setLoading(false);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: doubtsRef.path,
        operation: 'create',
        requestResourceData: data
      }));
    });
  };

  const markAsOpened = (doubt: any) => {
    if (doubt.status === 'answered' && !doubt.openedAt && db) {
      const docRef = doc(db, 'publicDoubts', doubt.id);
      updateDoc(docRef, { openedAt: serverTimestamp() }).catch(async (serverError) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: docRef.path,
          operation: 'update'
        }));
      });
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="space-y-2 md:space-y-3">
        <Label className="font-black text-[10px] md:text-[11px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Academic Question</Label>
        <Input placeholder="E.g. Help me understand gravity?" className="rounded-xl md:rounded-2xl h-14 md:h-16 bg-white border-muted font-medium text-base md:text-lg px-4 md:px-6" value={question} onChange={e => setQuestion(e.target.value)} />
      </div>
      <Button className="w-full bg-accent h-14 md:h-16 rounded-xl md:rounded-[1.5rem] text-lg md:text-xl font-black shadow-xl shadow-accent/20 hover:scale-[1.02] transition-transform" onClick={handleSubmit} disabled={loading || !question.trim()}>
        {loading ? <Loader2 className="animate-spin" /> : "Submit Doubt"}
      </Button>

      <div className="space-y-4 md:pt-4">
        <h4 className="font-black text-accent uppercase text-[10px] md:text-xs tracking-[0.2em]">My Corner Doubts</h4>
        <div className="grid gap-3">
          {myPublicDoubts?.map(doubt => (
            <Dialog key={doubt.id} onOpenChange={(open) => open && markAsOpened(doubt)}>
              <DialogTrigger asChild>
                <Card className={`cursor-pointer transition-all hover:shadow-lg rounded-xl md:rounded-2xl border-none shadow-sm ${doubt.status === 'answered' ? 'bg-green-50' : 'bg-white'}`}>
                  <CardContent className="p-3 md:p-4 flex items-center justify-between gap-3 md:gap-4">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-bold text-[11px] md:text-xs truncate">{doubt.question}</span>
                      <span className="text-[8px] md:text-[9px] text-muted-foreground uppercase font-black">{doubt.createdAt?.toDate?.()?.toLocaleString() || 'Syncing...'}</span>
                    </div>
                    <Badge className={`rounded-lg px-1.5 md:px-2 py-0.5 text-[8px] md:text-[9px] shrink-0 ${doubt.status === 'answered' ? 'bg-green-600' : 'bg-yellow-500'}`}>
                      {doubt.status === 'answered' ? 'Answered' : 'Pending'}
                    </Badge>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-10 max-w-xl w-[95vw]">
                <DialogHeader>
                  <DialogTitle className="text-xl md:text-2xl font-black text-accent">Public Corner Detail</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 md:space-y-6 py-4 md:py-6">
                  <div className="space-y-2">
                    <Label className="font-black text-[10px] uppercase text-muted-foreground">Your Question</Label>
                    <p className="p-3 md:p-4 bg-muted/20 rounded-xl font-medium text-sm md:text-base">{doubt.question}</p>
                  </div>
                  {doubt.answer && (
                    <div className="space-y-2">
                      <Label className="font-black text-[10px] uppercase text-green-600">Mentor's Public Response</Label>
                      <p className="p-4 md:p-6 bg-green-50 rounded-xl md:rounded-2xl font-bold text-base md:text-lg text-green-900 border border-green-200">{doubt.answer}</p>
                      <div className="flex justify-between items-center text-[9px] md:text-[10px] text-green-600/60 font-bold italic">
                        <span>By {doubt.mentorName || 'a Mentor'}</span>
                        <span>* Auto-deletes 24h later.</span>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          ))}
          {myPublicDoubts?.length === 0 && (
            <div className="text-center py-6 text-muted-foreground italic font-medium">No public doubts posted.</div>
          )}
        </div>
      </div>
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
