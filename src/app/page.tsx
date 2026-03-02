
"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { AuthProvider, useAuth } from '@/components/auth-wrapper'
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar'
import { COURSES, STUDY_MATERIALS, Course, Material } from '@/lib/mock-data'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { AICompanion } from '@/components/ai-companion'
import { Badge } from '@/components/ui/badge'
import { StudentManagement } from '@/components/student-management'
import { InactivityMonitor } from '@/components/inactivity-monitor'
import { ChatInterface } from '@/components/chat-interface'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  LogOut, 
  Home, 
  BookOpen, 
  PlayCircle, 
  ChevronRight, 
  GraduationCap, 
  Search,
  Download,
  FileText,
  Users,
  MapPin,
  School,
  Clock,
  IdCard,
  XCircle,
  UserRound,
  MessageSquare
} from 'lucide-react'
import Image from 'next/image'
import { FirebaseClientProvider, useFirestore, useCollection, useDoc } from '@/firebase'
import { collection, addDoc, serverTimestamp, query, where, orderBy, doc } from 'firebase/firestore'

function Dashboard() {
  const { user, logout } = useAuth()
  const db = useFirestore()
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [activeMaterial, setActiveMaterial] = useState<Material | null>(null)
  const [selectedChatStudent, setSelectedChatStudent] = useState<any>(null)
  
  const viewStartTime = useRef<number | null>(null)

  const isAdmin = user?.role === 'admin'
  const isMentor = user?.role === 'mentor'

  const visibleCourses = useMemo(() => {
    if (isAdmin || isMentor) return COURSES
    if (!user?.class) return []
    return COURSES.filter(c => c.id === user.class)
  }, [isAdmin, isMentor, user?.class])

  const courseMaterials = selectedCourse 
    ? STUDY_MATERIALS.filter(m => m.courseId === selectedCourse.id) 
    : []
  
  const notes = courseMaterials.filter(m => m.type === 'pdf')
  const videos = courseMaterials.filter(m => m.type === 'video')

  // Activities for students
  const activityQuery = useMemo(() => {
    if (!db || !user?.id || user.role !== 'student') return null
    return query(collection(db, 'students', user.id, 'activity'), orderBy('timestamp', 'desc'))
  }, [db, user?.id, user?.role])

  // Mentors can see their students
  const mentorStudentsQuery = useMemo(() => {
    if (!db || !user?.id || user.role !== 'mentor') return null
    return query(collection(db, 'students'), where('mentorId', '==', user.id))
  }, [db, user?.id, user?.role])

  const { data: activities } = useCollection(activityQuery)
  const { data: myStudents } = useCollection(mentorStudentsQuery)

  // Mentor name for student chat
  const mentorRef = useMemo(() => {
    if (!db || !user?.mentorId) return null
    return doc(db, 'mentors', user.mentorId)
  }, [db, user?.mentorId])
  const { data: myMentorData } = useDoc(mentorRef)

  const totalUsageSeconds = useMemo(() => {
    if (!activities) return 0
    return activities.reduce((acc, curr: any) => acc + (Number(curr.duration) || 0), 0)
  }, [activities])

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    if (hours > 0) return `${hours}h ${minutes}m ${remainingSeconds}s`
    if (minutes > 0) return `${minutes}m ${remainingSeconds}s`
    return `${remainingSeconds}s`
  }

  const navigateToHome = () => {
    if (activeMaterial) handleCloseMaterial()
    setSelectedCourse(null)
    setShowAdminPanel(false)
    setSelectedChatStudent(null)
  }

  const navigateToAdmin = () => {
    if (activeMaterial) handleCloseMaterial()
    setSelectedCourse(null)
    setShowAdminPanel(true)
    setSelectedChatStudent(null)
  }

  const handleSelectCourse = (course: Course) => {
    if (isAdmin || isMentor || course.id === user?.class) {
      if (activeMaterial) handleCloseMaterial()
      setSelectedCourse(course)
      setShowAdminPanel(false)
      setSelectedChatStudent(null)
    }
  }

  const logContentActivity = (material: Material, type: 'pdf_view' | 'video_view', duration: number) => {
    if (!user || !db || user.role !== 'student') return
    if (duration < 1) return

    addDoc(collection(db, 'students', user.id, 'activity'), {
      type,
      timestamp: serverTimestamp(),
      duration: Math.max(0, duration),
      metadata: { title: material.title, courseId: material.courseId }
    })
  }

  const handleOpenMaterial = (material: Material) => {
    if (activeMaterial) handleCloseMaterial()
    setActiveMaterial(material)
    viewStartTime.current = Date.now()
    if (material.type === 'pdf' && material.url !== '#') window.open(material.url, '_blank')
  }

  const handleCloseMaterial = () => {
    if (activeMaterial && viewStartTime.current) {
      const duration = Math.floor((Date.now() - viewStartTime.current) / 1000)
      logContentActivity(activeMaterial, activeMaterial.type === 'pdf' ? 'pdf_view' : 'video_view', duration)
      setActiveMaterial(null)
      viewStartTime.current = null
    }
  }

  useEffect(() => {
    return () => { if (viewStartTime.current) handleCloseMaterial() }
  }, [])

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
                  <Home className="mr-2" /> Home Dashboard
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={showAdminPanel} onClick={navigateToAdmin} className="py-6 rounded-xl text-accent hover:bg-accent/10 data-[active=true]:bg-accent/20">
                    <Users className="mr-2" /> Management Panel
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <div className="my-4 px-3 text-xs font-semibold text-white/50 uppercase tracking-widest">
                Courses
              </div>
              {visibleCourses.map(course => (
                <SidebarMenuItem key={course.id}>
                  <SidebarMenuButton isActive={selectedCourse?.id === course.id} onClick={() => handleSelectCourse(course)} className="py-6 rounded-xl hover:bg-white/10">
                    <BookOpen className="mr-2 h-4 w-4" /> {course.name}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-6">
            <div className={`p-4 rounded-xl mb-4 ${isMentor ? 'bg-orange-500/20' : 'bg-white/10'}`}>
              <p className="text-sm font-medium text-white/90">Hello, {user?.name}</p>
              <p className="text-xs text-white/60 capitalize">{user?.role}</p>
            </div>
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
              <>
                <section>
                  <div className={`${isAdmin ? 'bg-accent' : isMentor ? 'bg-orange-500' : 'bg-primary'} rounded-3xl p-10 text-white relative overflow-hidden shadow-xl`}>
                    <div className="relative z-10 max-w-xl">
                      <h2 className="text-4xl font-bold mb-4">Welcome back, {user?.name}!</h2>
                      <p className="text-white/80 text-lg mb-8 leading-relaxed">
                        {isAdmin ? 'Manage students and mentors to ensure a high standard of education.' : 
                         isMentor ? 'Monitor your assigned students and guide them to academic success.' :
                         'The vision of DANIEL 120 is to uplift every student. Study hard and stay humble.'}
                      </p>
                      
                      {user?.role === 'student' && (
                        <div className="grid grid-cols-2 gap-4 mb-8">
                          <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                            <p className="text-xs text-white/60 uppercase tracking-wider font-bold mb-1">Total Usage</p>
                            <p className="text-xl font-bold">{formatDuration(totalUsageSeconds)}</p>
                          </div>
                          <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                            <p className="text-xs text-white/60 uppercase tracking-wider font-bold mb-1">Class</p>
                            <p className="text-xl font-bold capitalize">{user.class?.replace('-', ' ')}</p>
                          </div>
                          <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                            <p className="text-xs text-white/60 uppercase tracking-wider font-bold mb-1">School</p>
                            <p className="text-sm font-bold truncate">{user.schoolName || 'N/A'}</p>
                          </div>
                          <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                            <p className="text-xs text-white/60 uppercase tracking-wider font-bold mb-1">Location</p>
                            <p className="text-sm font-bold truncate">{user.location || 'N/A'}</p>
                          </div>
                        </div>
                      )}

                      {isMentor && (
                        <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md mb-8">
                          <p className="text-xs text-white/60 uppercase tracking-wider font-bold mb-2">My Students</p>
                          <div className="flex flex-wrap gap-2">
                            {myStudents?.map((s: any) => (
                              <Badge 
                                key={s.id} 
                                variant="secondary" 
                                className={`cursor-pointer border-none ${selectedChatStudent?.id === s.id ? 'bg-white text-primary' : 'bg-white/20 text-white'}`}
                                onClick={() => setSelectedChatStudent(s)}
                              >
                                {s.name}
                              </Badge>
                            )) || <span className="text-sm">No students assigned yet.</span>}
                          </div>
                        </div>
                      )}

                      <Button className="bg-white text-primary hover:bg-white/90 rounded-full px-8 py-6 text-lg" onClick={isAdmin ? navigateToAdmin : undefined}>
                        {isAdmin ? 'Manage Database' : 'Start Learning'}
                      </Button>
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <section className="space-y-6">
                      <h3 className="text-2xl font-bold text-primary">
                        {isAdmin || isMentor ? 'All Course Materials' : 'Your Registered Course'}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {visibleCourses.map(course => (
                          <Card key={course.id} className="group hover:shadow-2xl transition-all border-none cursor-pointer overflow-hidden rounded-2xl" onClick={() => handleSelectCourse(course)}>
                            <div className="h-40 relative">
                              <Image src={course.image} alt={course.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              <div className="absolute bottom-4 left-4 text-white"><h4 className="text-xl font-bold">{course.name}</h4></div>
                            </div>
                            <CardContent className="p-5">
                              <p className="text-muted-foreground text-sm line-clamp-2">{course.description}</p>
                              <Button variant="link" className="p-0 text-accent font-bold mt-4">Access Now <ChevronRight size={16} /></Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </section>
                  </div>

                  <div className="space-y-6">
                    {isMentor && selectedChatStudent && (
                      <ChatInterface 
                        chatId={`${selectedChatStudent.id}_${user.id}`} 
                        currentUser={{ id: user.id, name: user.name, role: user.role }} 
                        otherUserName={selectedChatStudent.name}
                      />
                    )}
                    {!isMentor && !user?.mentorId && user?.role !== 'admin' && (
                      <Card className="p-6 bg-muted">
                        <p className="text-sm text-center text-muted-foreground italic">No mentor assigned yet.</p>
                      </Card>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={navigateToHome} className="rounded-full h-12 w-12"><ChevronRight className="rotate-180" /></Button>
                    <h2 className="text-4xl font-bold text-primary">{selectedCourse.name}</h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <Tabs defaultValue="notes">
                      <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
                        <TabsTrigger value="notes"><FileText size={18} className="mr-2" /> PDF Notes</TabsTrigger>
                        <TabsTrigger value="videos"><PlayCircle size={18} className="mr-2" /> Video Classes</TabsTrigger>
                      </TabsList>
                      <TabsContent value="notes" className="space-y-4">
                        {notes.map(note => (
                          <Card key={note.id} className={activeMaterial?.id === note.id ? 'border-accent bg-accent/5' : ''}>
                            <CardContent className="flex items-center justify-between p-4">
                              <div className="flex items-center gap-4">
                                <FileText size={24} className="text-red-500" />
                                <div><h5 className="font-bold">{note.title}</h5><p className="text-xs text-muted-foreground">PDF Document</p></div>
                              </div>
                              <Button size="sm" variant={activeMaterial?.id === note.id ? 'outline' : 'ghost'} onClick={() => activeMaterial?.id === note.id ? handleCloseMaterial() : handleOpenMaterial(note)}>
                                {activeMaterial?.id === note.id ? 'Stop Reading' : 'Read Now'}
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </TabsContent>
                      <TabsContent value="videos" className="space-y-6">
                        {videos.map(video => (
                          <Card key={video.id} className="overflow-hidden border-none shadow-lg">
                            <div className="aspect-video relative bg-black">
                              <video className="w-full h-full" controls poster={video.thumbnail} onPlay={() => handleOpenMaterial(video)} onPause={handleCloseMaterial}>
                                <source src={video.url} type="video/mp4" />
                              </video>
                            </div>
                            <CardContent className="p-4 flex justify-between items-center">
                              <h5 className="font-bold text-lg">{video.title}</h5>
                              {activeMaterial?.id === video.id && <Badge className="bg-accent animate-pulse">Tracking Session</Badge>}
                            </CardContent>
                          </Card>
                        ))}
                      </TabsContent>
                    </Tabs>
                  </div>
                  <div className="space-y-6"><AICompanion /></div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Floating Chat for Students */}
      {user?.role === 'student' && user.mentorId && (
        <div className="fixed bottom-6 right-6 z-50">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" className="h-14 w-14 rounded-full shadow-2xl bg-accent hover:bg-accent/90">
                <MessageSquare className="h-6 w-6" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0 mr-6 mb-2 border-none shadow-2xl rounded-2xl overflow-hidden" align="end">
              <ChatInterface 
                chatId={`${user.id}_${user.mentorId}`} 
                currentUser={{ id: user.id, name: user.name, role: user.role }} 
                otherUserName={myMentorData?.name || 'Mentor'}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </SidebarProvider>
  )
}

export default function HomeApp() {
  return (
    <FirebaseClientProvider>
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    </FirebaseClientProvider>
  )
}
