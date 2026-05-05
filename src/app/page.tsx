'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AuthProvider, useAuth } from '@/components/auth-wrapper';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { STUDY_MATERIALS } from '@/lib/mock-data';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AICompanion } from '@/components/ai-companion';
import { Badge } from '@/components/ui/badge';
import { StudentManagement } from '@/components/student-management';
import { InactivityMonitor } from '@/components/inactivity-monitor';
import { ChatInterface } from '@/components/chat-interface';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  LogOut,
  Home,
  BookOpen,
  PlayCircle,
  ChevronRight,
  GraduationCap,
  Users,
  FileText,
  MessageSquare,
  Youtube,
} from 'lucide-react';
import Image from 'next/image';
import { FirebaseClientProvider, useFirestore, useCollection, useDoc } from '@/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  doc,
  onSnapshot,
} from 'firebase/firestore';

function getYouTubeEmbedUrl(url: string) {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11)
    ? `https://www.youtube.com/embed/${match[2]}`
    : url;
}

function StudentListWithUnread({
  students,
  mentorId,
  onSelect,
  selectedStudent,
}: {
  students: any[];
  mentorId: string;
  onSelect: (s: any) => void;
  selectedStudent: any;
}) {
  return (
    <div className="space-y-2">
      {students.map((student) => (
        <StudentListItem
          key={student.id}
          student={student}
          mentorId={mentorId}
          onSelect={onSelect}
          isSelected={selectedStudent?.id === student.id}
        />
      ))}
    </div>
  );
}

function StudentListItem({
  student,
  mentorId,
  onSelect,
  isSelected,
}: {
  student: any;
  mentorId: string;
  onSelect: (s: any) => void;
  isSelected: boolean;
}) {
  const db = useFirestore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!db || !student.id || !mentorId) return;

    const chatId = `${student.id}_${mentorId}`;
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      where('senderId', '==', student.id),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [db, student.id, mentorId]);

  return (
    <Button
      variant={isSelected ? 'secondary' : 'ghost'}
      className="w-full justify-between items-center group relative overflow-hidden h-12 px-4 rounded-xl"
      onClick={() => onSelect(student)}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-2 h-2 rounded-full ${isSelected ? 'bg-primary' : 'bg-transparent'}`}
        />
        <span className="font-medium">{student.name}</span>
      </div>
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="ml-2 h-5 min-w-5 flex items-center justify-center rounded-full p-0 text-[10px]"
        >
          {unreadCount}
        </Badge>
      )}
    </Button>
  );
}

function Dashboard() {
  const { user, logout } = useAuth();
  const db = useFirestore();
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [activeMaterial, setActiveMaterial] = useState<any | null>(null);
  const [selectedChatStudent, setSelectedChatStudent] = useState<any>(null);

  const viewStartTime = useRef<number | null>(null);

  const isAdmin = user?.role === 'admin';
  const isMentor = user?.role === 'mentor';

  // Fetch all data from Firestore
  const coursesQuery = useMemo(() => db ? collection(db, 'courses') : null, [db]);
  const subjectsQuery = useMemo(() => db ? collection(db, 'subjects') : null, [db]);
  const materialsQuery = useMemo(() => db ? collection(db, 'materials') : null, [db]);

  const { data: allCourses } = useCollection(coursesQuery);
  const { data: allSubjects } = useCollection(subjectsQuery);
  const { data: allMaterials } = useCollection(materialsQuery);

  const visibleCourses = useMemo(() => {
    if (!allCourses) return [];
    if (isAdmin || isMentor) return allCourses;
    if (!user?.class) return [];
    return allCourses.filter((c: any) => c.id === user.class);
  }, [isAdmin, isMentor, user?.class, allCourses]);

  // Combine Mock Data and Firestore Data for materials
  const currentMaterials = useMemo(() => {
    if (!selectedSubject || !selectedCourse) return [];
    
    // Merge mock and real data
    const combined = [
      ...STUDY_MATERIALS.filter(m => m.courseId === selectedCourse.id && m.title.toLowerCase().includes(selectedSubject.name.toLowerCase())),
      ...(allMaterials || []).filter(m => m.courseId === selectedCourse.id && m.subjectId === selectedSubject.id)
    ];

    return combined;
  }, [selectedCourse, selectedSubject, allMaterials]);

  const notes = currentMaterials.filter((m) => m.type === 'pdf');
  const videos = currentMaterials.filter((m) => m.type === 'video');

  const activityQuery = useMemo(() => {
    if (!db || !user?.id || user.role !== 'student') return null;
    return query(collection(db, 'students', user.id, 'activity'), orderBy('timestamp', 'desc'));
  }, [db, user?.id, user?.role]);

  const { data: activities } = useCollection(activityQuery);

  const mentorStudentsQuery = useMemo(() => {
    if (!db || !user?.id || user.role !== 'mentor') return null;
    return query(collection(db, 'students'), where('mentorId', '==', user.id));
  }, [db, user?.id, user?.role]);

  const { data: myStudents } = useCollection(mentorStudentsQuery);

  const mentorRef = useMemo(() => {
    if (!db || !user?.mentorId) return null;
    return doc(db, 'mentors', user.mentorId);
  }, [db, user?.mentorId]);
  const { data: myMentorData } = useDoc(mentorRef);

  const totalUsageSeconds = useMemo(() => {
    if (!activities) return 0;
    return activities.reduce((acc, curr: any) => {
      if (curr.type === 'pdf_view' || curr.type === 'video_view') {
        return acc + (Number(curr.duration) || 0);
      }
      return acc;
    }, 0);
  }, [activities]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return hours > 0 ? `${hours}h ${minutes}m ${s}s` : `${minutes}m ${s}s`;
  };

  const navigateToHome = () => {
    setSelectedCourse(null);
    setSelectedSubject(null);
    setShowAdminPanel(false);
    setSelectedChatStudent(null);
  };

  const handleSelectCourse = (course: any) => {
    setSelectedCourse(course);
    setSelectedSubject(null);
    setShowAdminPanel(false);
  };

  const logContentActivity = (material: any, type: 'pdf_view' | 'video_view', duration: number) => {
    if (!user || !db || user.role !== 'student' || duration < 1) return;
    addDoc(collection(db, 'students', user.id, 'activity'), {
      type,
      timestamp: serverTimestamp(),
      duration: Math.max(0, duration),
      metadata: { title: material.title, courseId: material.courseId, materialId: material.id },
    });
  };

  const handleOpenMaterial = (material: any) => {
    if (activeMaterial) handleCloseMaterial();
    setActiveMaterial(material);
    viewStartTime.current = Date.now();
    if (material.type === 'pdf' && material.url !== '#' && material.url.startsWith('http')) {
      window.open(material.url, '_blank');
    }
  };

  const handleCloseMaterial = () => {
    if (activeMaterial && viewStartTime.current) {
      const duration = Math.floor((Date.now() - viewStartTime.current) / 1000);
      logContentActivity(activeMaterial, activeMaterial.type === 'pdf' ? 'pdf_view' : 'video_view', duration);
      setActiveMaterial(null);
      viewStartTime.current = null;
    }
  };

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
                  <SidebarMenuButton isActive={selectedCourse?.id === course.id} onClick={() => handleSelectCourse(course)} className="py-6 rounded-xl hover:bg-white/10">
                    <BookOpen className="mr-2 h-4 w-4" /> {course.name}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-6">
            <Button variant="ghost" className="w-full justify-start text-white/80 hover:text-white" onClick={logout}>
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
                <div className="bg-primary rounded-3xl p-10 text-white shadow-xl">
                  <h2 className="text-4xl font-bold mb-4">Uplifting Education, Shaping Futures</h2>
                  <p className="text-white/80 text-lg">Welcome, {user?.name}. Your dedicated space for learning.</p>
                  {user?.role === 'student' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                      <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                        <p className="text-xs uppercase tracking-wider opacity-60">Study Time</p>
                        <p className="text-xl font-bold">{formatDuration(totalUsageSeconds)}</p>
                      </div>
                      <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                        <p className="text-xs uppercase tracking-wider opacity-60">My Mentor</p>
                        <p className="text-xl font-bold truncate">{myMentorData?.name || 'N/A'}</p>
                      </div>
                    </div>
                  )}
                </div>

                {isMentor && (
                   <section className="space-y-4">
                    <h3 className="text-2xl font-bold text-primary flex items-center gap-2"><Users /> My Students</h3>
                    <Card><CardContent className="p-4">
                      <StudentListWithUnread students={myStudents || []} mentorId={user.id} onSelect={setSelectedChatStudent} selectedStudent={selectedChatStudent} />
                    </CardContent></Card>
                  </section>
                )}

                <section className="space-y-4">
                  <h3 className="text-2xl font-bold text-primary">Your Classes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {visibleCourses.map((course: any) => (
                      <Card key={course.id} className="cursor-pointer hover:shadow-xl transition-all" onClick={() => handleSelectCourse(course)}>
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
                  <h2 className="text-3xl font-bold text-primary">{selectedCourse.name}</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-1 space-y-4">
                    <h4 className="font-bold text-muted-foreground uppercase text-xs tracking-widest px-2">Select Subject</h4>
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
                      {(!allSubjects || allSubjects.filter(s => s.courseId === selectedCourse.id).length === 0) && (
                        <p className="text-xs text-muted-foreground px-2 italic">No subjects added yet.</p>
                      )}
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
                          {videos.map(v => {
                            const isYoutube = v.url.includes('youtube.com') || v.url.includes('youtu.be');
                            return (
                              <Card key={v.id} className="overflow-hidden">
                                <div className="aspect-video relative bg-black">
                                  {isYoutube ? (
                                    <iframe 
                                      src={getYouTubeEmbedUrl(v.url)}
                                      className="w-full h-full border-none"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                      onLoad={() => handleOpenMaterial(v)}
                                    />
                                  ) : (
                                    <video controls className="w-full h-full" onPlay={() => handleOpenMaterial(v)} onPause={handleCloseMaterial}>
                                      <source src={v.url} />
                                    </video>
                                  )}
                                </div>
                                <CardHeader className="p-4 flex flex-row items-center justify-between">
                                  <CardTitle className="text-sm">{v.title}</CardTitle>
                                  {isYoutube && (
                                    <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                                      <Youtube className="h-3 w-3 text-red-600" /> YouTube
                                    </Badge>
                                  )}
                                </CardHeader>
                              </Card>
                            )
                          })}
                          {videos.length === 0 && <p className="text-center py-12 text-muted-foreground">No videos available.</p>}
                        </TabsContent>
                        <TabsContent value="notes" className="space-y-2">
                           {notes.map(n => (
                            <Card key={n.id}>
                              <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3"><FileText className="text-blue-500" /> <span className="font-bold">{n.title}</span></div>
                                <Button size="sm" onClick={() => handleOpenMaterial(n)}>Open</Button>
                              </CardContent>
                            </Card>
                          ))}
                          {notes.length === 0 && <p className="text-center py-12 text-muted-foreground">No notes available.</p>}
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/20 rounded-3xl border border-dashed">
                        <BookOpen size={48} className="mb-4 opacity-20" />
                        <p>Select a subject to view materials.</p>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-1"><AICompanion /></div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {user?.role === 'student' && user.mentorId && (
        <div className="fixed bottom-6 right-6 z-50">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" className="h-14 w-14 rounded-full shadow-2xl bg-accent hover:bg-accent/90 relative">
                <MessageSquare size={24} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0 border-none shadow-2xl" align="end">
              <ChatInterface chatId={`${user.id}_${user.mentorId}`} currentUser={{ id: user.id, name: user.name, role: user.role }} otherUserName={myMentorData?.name || 'Mentor'} />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </SidebarProvider>
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
