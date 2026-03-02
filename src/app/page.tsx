
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
  XCircle
} from 'lucide-react'
import Image from 'next/image'
import { FirebaseClientProvider, useFirestore, useCollection } from '@/firebase'
import { collection, addDoc, serverTimestamp, query, where, orderBy } from 'firebase/firestore'

function Dashboard() {
  const { user, logout } = useAuth()
  const db = useFirestore()
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [activeMaterial, setActiveMaterial] = useState<Material | null>(null)
  
  // Tracking Refs
  const viewStartTime = useRef<number | null>(null)

  const isAdmin = user?.role === 'admin'

  // Filter courses based on user registration
  const visibleCourses = useMemo(() => {
    if (isAdmin) return COURSES
    if (!user?.class) return []
    return COURSES.filter(c => c.id === user.class)
  }, [isAdmin, user?.class])

  const courseMaterials = selectedCourse 
    ? STUDY_MATERIALS.filter(m => m.courseId === selectedCourse.id) 
    : []
  
  const notes = courseMaterials.filter(m => m.type === 'pdf')
  const videos = courseMaterials.filter(m => m.type === 'video')

  // Fetch activity for total usage time
  const activityQuery = useMemo(() => {
    if (!db || !user?.id || isAdmin) return null
    return query(collection(db, 'students', user.id, 'activity'), orderBy('timestamp', 'desc'))
  }, [db, user?.id, isAdmin])

  const { data: activities } = useCollection(activityQuery)

  const totalUsageSeconds = useMemo(() => {
    if (!activities) return 0
    return activities.reduce((acc, curr: any) => {
      const duration = Number(curr.duration) || 0
      return acc + duration
    }, 0)
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
  }

  const navigateToAdmin = () => {
    if (activeMaterial) handleCloseMaterial()
    setSelectedCourse(null)
    setShowAdminPanel(true)
  }

  const handleSelectCourse = (course: Course) => {
    if (isAdmin || course.id === user?.class) {
      if (activeMaterial) handleCloseMaterial()
      setSelectedCourse(course)
      setShowAdminPanel(false)
    }
  }

  // Activity Tracking Helpers
  const logContentActivity = (material: Material, type: 'pdf_view' | 'video_view', duration: number) => {
    if (!user || !db || user.role === 'admin') return
    if (duration < 1) return // Don't log sessions shorter than 1 second

    addDoc(collection(db, 'students', user.id, 'activity'), {
      type,
      timestamp: serverTimestamp(),
      duration: Math.max(0, duration),
      metadata: { 
        title: material.title, 
        courseId: material.courseId 
      }
    })
  }

  const handleOpenMaterial = (material: Material) => {
    if (activeMaterial) {
      handleCloseMaterial()
    }
    setActiveMaterial(material)
    viewStartTime.current = Date.now()
    
    // For PDFs, we open in a new tab but also show a "Stop Reading" button
    if (material.type === 'pdf' && typeof window !== 'undefined' && material.url !== '#') {
       window.open(material.url, '_blank')
    }
  }

  const handleCloseMaterial = () => {
    if (activeMaterial && viewStartTime.current) {
      const duration = Math.floor((Date.now() - viewStartTime.current) / 1000)
      const type = activeMaterial.type === 'pdf' ? 'pdf_view' : 'video_view'
      logContentActivity(activeMaterial, type, duration)
      setActiveMaterial(null)
      viewStartTime.current = null
    }
  }

  // Cleanup on unmount or navigation
  useEffect(() => {
    return () => {
      if (viewStartTime.current) handleCloseMaterial()
    }
  }, [])

  return (
    <SidebarProvider>
      <InactivityMonitor />
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar className="border-r-0 shadow-2xl">
          <SidebarHeader className="p-6">
            <div className="flex items-center gap-3 text-white">
              <div className="bg-white/20 p-2 rounded-lg">
                <GraduationCap size={32} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">DANIEL 120</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={!selectedCourse && !showAdminPanel} 
                  onClick={navigateToHome}
                  className="py-6 rounded-xl hover:bg-white/10"
                >
                  <Home className="mr-2" /> Home Dashboard
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={showAdminPanel} 
                    onClick={navigateToAdmin}
                    className="py-6 rounded-xl text-accent hover:bg-accent/10 data-[active=true]:bg-accent/20"
                  >
                    <Users className="mr-2" /> Manage Students
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <div className="my-4 px-3 text-xs font-semibold text-white/50 uppercase tracking-widest">
                {isAdmin ? 'All Courses' : 'My Registered Course'}
              </div>
              {visibleCourses.map(course => (
                <SidebarMenuItem key={course.id}>
                  <SidebarMenuButton 
                    isActive={selectedCourse?.id === course.id}
                    onClick={() => handleSelectCourse(course)}
                    className="py-6 rounded-xl hover:bg-white/10"
                  >
                    <BookOpen className="mr-2 h-4 w-4" /> {course.name}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-6">
            <div className="bg-white/10 p-4 rounded-xl mb-4">
              <p className="text-sm font-medium text-white/90">Hello, {user?.name}</p>
              <div className="flex items-center gap-2 mt-1">
                 <p className="text-xs text-white/60">{isAdmin ? 'Administrator' : 'Registered Student'}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-6xl mx-auto space-y-8">
            {showAdminPanel ? (
              <StudentManagement />
            ) : !selectedCourse ? (
              <>
                <section className="space-y-4">
                  <div className={`${isAdmin ? 'bg-accent' : 'bg-primary'} rounded-3xl p-10 text-white relative overflow-hidden shadow-xl shadow-primary/20`}>
                    <div className="relative z-10 max-w-xl">
                      <h2 className="text-4xl font-bold mb-4">
                        {isAdmin ? 'Admin Portal' : `Welcome back, ${user?.name}!`}
                      </h2>
                      <p className="text-white/80 text-lg mb-8 leading-relaxed">
                        {isAdmin 
                          ? 'You have administrative access to manage the DANIEL 120 educational platform.'
                          : 'The vision of DANIEL 120 is to uplift every student. Like Daniel, strive to be the most respected and wise among your peers.'}
                      </p>
                      
                      {!isAdmin && (
                        <div className="grid grid-cols-2 gap-4 mb-8">
                          <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                            <p className="text-xs text-white/60 uppercase tracking-wider font-bold mb-1 flex items-center gap-1">
                              <IdCard size={12} /> Student ID
                            </p>
                            <p className="text-xl font-bold">{user?.id}</p>
                          </div>
                          <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                            <p className="text-xs text-white/60 uppercase tracking-wider font-bold mb-1 flex items-center gap-1">
                              <Clock size={12} /> Total Usage
                            </p>
                            <p className="text-xl font-bold">{formatDuration(totalUsageSeconds)}</p>
                          </div>
                          {user?.schoolName && (
                            <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                              <p className="text-xs text-white/60 uppercase tracking-wider font-bold mb-1 flex items-center gap-1">
                                <School size={12} /> School
                              </p>
                              <p className="text-sm font-medium line-clamp-1">{user.schoolName}</p>
                            </div>
                          )}
                          {user?.location && (
                            <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                              <p className="text-xs text-white/60 uppercase tracking-wider font-bold mb-1 flex items-center gap-1">
                                <MapPin size={12} /> Location
                              </p>
                              <p className="text-sm font-medium line-clamp-1">{user.location}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <Button 
                        className={`${isAdmin ? 'bg-primary' : 'bg-accent'} hover:opacity-90 text-white rounded-full px-8 py-6 text-lg`}
                        onClick={isAdmin ? navigateToAdmin : undefined}
                      >
                        {isAdmin ? 'Register Students' : 'Continue Learning'}
                      </Button>
                    </div>
                    <div className="absolute top-0 right-0 w-1/3 h-full opacity-20 pointer-events-none">
                       <Image 
                        src="https://picsum.photos/seed/daniel120-hero/1200/600"
                        alt="Education"
                        fill
                        className="object-cover"
                        data-ai-hint="student studying"
                       />
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-primary">
                      {isAdmin ? 'All Available Courses' : 'Your Registered Course'}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleCourses.map(course => (
                      <Card 
                        key={course.id} 
                        className="group hover:shadow-2xl transition-all duration-300 border-none cursor-pointer overflow-hidden rounded-2xl"
                        onClick={() => handleSelectCourse(course)}
                      >
                        <div className="h-40 relative">
                          <Image 
                            src={course.image}
                            alt={course.name}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                            data-ai-hint="education course"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute bottom-4 left-4 text-white">
                            <h4 className="text-xl font-bold">{course.name}</h4>
                          </div>
                        </div>
                        <CardContent className="p-5">
                          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                            {course.description}
                          </p>
                          <Button variant="link" className="p-0 text-accent font-bold group-hover:gap-2 transition-all">
                            Access Materials <ChevronRight size={16} />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                    {!isAdmin && visibleCourses.length === 0 && (
                      <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed">
                        <p className="text-muted-foreground">You are not registered for any courses yet. Please contact the administrator.</p>
                      </div>
                    )}
                  </div>
                </section>
              </>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={navigateToHome}
                      className="rounded-full h-12 w-12"
                    >
                      <ChevronRight className="rotate-180" />
                    </Button>
                    <div>
                      <h2 className="text-4xl font-bold text-primary">{selectedCourse.name}</h2>
                      <p className="text-muted-foreground">{selectedCourse.description}</p>
                    </div>
                  </div>
                  {activeMaterial && (
                    <Button 
                      variant="destructive" 
                      onClick={handleCloseMaterial}
                      className="animate-pulse"
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Stop Tracking: {activeMaterial.title}
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <Tabs defaultValue="notes" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-8 h-12 bg-white rounded-xl shadow-sm border border-border">
                        <TabsTrigger value="notes" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
                          <FileText size={18} className="mr-2" /> PDF Notes
                        </TabsTrigger>
                        <TabsTrigger value="videos" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
                          <PlayCircle size={18} className="mr-2" /> Video Classes
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="notes" className="space-y-4">
                        {notes.length > 0 ? (
                          notes.map(note => (
                            <Card key={note.id} className={`hover:border-accent transition-colors ${activeMaterial?.id === note.id ? 'border-accent bg-accent/5' : ''}`}>
                              <CardContent className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-4">
                                  <div className="bg-red-50 p-3 rounded-lg text-red-600">
                                    <FileText size={24} />
                                  </div>
                                  <div>
                                    <h5 className="font-bold">{note.title}</h5>
                                    <p className="text-xs text-muted-foreground">PDF Document • 2.4 MB</p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {activeMaterial?.id === note.id ? (
                                    <Button size="sm" variant="outline" className="text-accent border-accent" onClick={handleCloseMaterial}>
                                      Stop Reading
                                    </Button>
                                  ) : (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="text-primary hover:text-accent hover:bg-accent/5 flex gap-2"
                                      onClick={() => handleOpenMaterial(note)}
                                    >
                                      Read Now <Download size={20} />
                                    </Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        ) : (
                          <div className="text-center py-20 bg-white rounded-3xl border border-dashed">
                            <p className="text-muted-foreground">No notes available for this section yet.</p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="videos" className="space-y-6">
                        {videos.length > 0 ? (
                          <div className="grid grid-cols-1 gap-6">
                            {videos.map(video => (
                              <Card key={video.id} className={`overflow-hidden border-none shadow-lg ${activeMaterial?.id === video.id ? 'ring-2 ring-accent' : ''}`}>
                                <div className="aspect-video relative bg-black">
                                  <video 
                                    className="w-full h-full" 
                                    controls 
                                    poster={video.thumbnail}
                                    onPlay={() => handleOpenMaterial(video)}
                                    onPause={handleCloseMaterial}
                                    onEnded={handleCloseMaterial}
                                  >
                                    <source src={video.url} type="video/mp4" />
                                    Your browser does not support the video tag.
                                  </video>
                                </div>
                                <CardContent className="p-4 flex justify-between items-center">
                                  <div>
                                    <h5 className="font-bold text-lg">{video.title}</h5>
                                    <p className="text-sm text-muted-foreground">Uploaded by DANIEL 120 Instructor</p>
                                  </div>
                                  {activeMaterial?.id === video.id && (
                                    <Badge variant="outline" className="text-accent border-accent animate-pulse">
                                      Currently Playing
                                    </Badge>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-20 bg-white rounded-3xl border border-dashed">
                            <p className="text-muted-foreground">Video lectures will be uploaded soon.</p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>

                  <div className="space-y-6">
                    <AICompanion />
                    <Card className="bg-primary text-white p-6 rounded-2xl shadow-lg">
                      <CardTitle className="mb-2 text-xl">Quick Tip</CardTitle>
                      <p className="text-white/80 text-sm leading-relaxed">
                        "The fear of the Lord is the beginning of wisdom, and knowledge of the Holy One is understanding."
                        Study hard, stay humble, and success will follow. Usage time is updated whenever you stop viewing a material.
                      </p>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
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
