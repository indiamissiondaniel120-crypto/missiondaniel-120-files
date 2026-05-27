
"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '@/components/auth-wrapper'
import { useFirestore, useCollection } from '@/firebase'
import { collection, addDoc, serverTimestamp, deleteDoc, doc, query, where, setDoc } from 'firebase/firestore'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Video, Users, LogOut, ShieldCheck, Loader2, MonitorPlay, Sparkles, BookOpen, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

const JAAS_APP_ID = "vpaas-magic-cookie-eaa27e99549144e1b4568825bd32cee1";

export function LiveClassInterface() {
  const { user } = useAuth()
  const db = useFirestore()
  const { toast } = useToast()
  
  const [sessionTitle, setSessionTitle] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeRoom, setActiveRoom] = useState<any>(null)

  const isMentor = user?.role === 'mentor'
  
  // Attendance Pulse Timer Logic
  useEffect(() => {
    if (!activeRoom || !user || !db) return;

    let timeoutId: NodeJS.Timeout;

    const scheduleAttendanceMark = () => {
      // Random interval between 3 and 12 minutes (averaging roughly 7.5 mins, within the requested ~10 min range)
      // 3 mins = 180,000ms, 12 mins = 720,000ms
      const min = 3 * 60 * 1000;
      const max = 12 * 60 * 1000;
      const delay = Math.floor(Math.random() * (max - min + 1)) + min;

      timeoutId = setTimeout(() => {
        const collName = user.role.includes('student') ? 'students' : 'mentors';
        const activityRef = collection(db, collName, user.id, 'activity');
        const data = {
          type: 'live_attendance_pulse',
          timestamp: serverTimestamp(),
          metadata: {
            title: activeRoom.title, // Map to 'title' so it shows in the ActivityViewer
            sessionId: activeRoom.id || activeRoom.roomName,
            subjectName: activeRoom.subjectName,
            className: activeRoom.className,
            role: user.role
          }
        };

        addDoc(activityRef, data).catch(async (serverError) => {
           errorEmitter.emit('permission-error', new FirestorePermissionError({
             path: activityRef.path,
             operation: 'create',
             requestResourceData: data
           }));
        });

        // Recursively schedule next mark
        scheduleAttendanceMark();
      }, delay);
    };

    // Start the cycle
    scheduleAttendanceMark();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeRoom?.id, activeRoom?.roomName, user?.id, user?.role, db]);

  // Fetch curriculum for mentor selection
  const coursesQuery = useMemo(() => db ? collection(db, 'courses') : null, [db]);
  const subjectsQuery = useMemo(() => db ? collection(db, 'subjects') : null, [db]);
  const { data: allCourses } = useCollection(coursesQuery);
  const { data: allSubjects } = useCollection(subjectsQuery);

  // Filtered subjects for the mentor's selection form
  const availableSubjects = useMemo(() => {
    if (!allSubjects || !selectedClassId) return [];
    return allSubjects.filter(s => s.courseId === selectedClassId);
  }, [allSubjects, selectedClassId]);

  // Sessions query: Students only see sessions for their class
  const sessionsQuery = useMemo(() => {
    if (!db || !user) return null
    if (isMentor) {
      // Mentors see all sessions for monitoring
      return collection(db, 'liveSessions')
    }
    // Students (Standard and Public) see sessions for THEIR class
    if (user.class) {
      return query(collection(db, 'liveSessions'), where('classId', '==', user.class))
    }
    return collection(db, 'liveSessions')
  }, [db, user, isMentor])

  const { data: sessions } = useCollection(sessionsQuery)

  const handleStartClass = async () => {
    if (!db || !user || !sessionTitle.trim() || !selectedClassId || !selectedSubjectId) return
    setLoading(true)
    
    const selectedCourse = allCourses?.find(c => c.id === selectedClassId);
    const selectedSubject = allSubjects?.find(s => s.id === selectedSubjectId);

    const roomName = `D120-Live-${user.id}`
    const sessionData = {
      title: sessionTitle.trim(),
      mentorId: user.id,
      mentorName: user.name,
      classId: selectedClassId,
      className: selectedCourse?.name || 'Unknown Class',
      subjectId: selectedSubjectId,
      subjectName: selectedSubject?.name || 'General Subject',
      roomName,
      createdAt: serverTimestamp()
    }

    const docRef = doc(db, 'liveSessions', user.id);
    
    setDoc(docRef, sessionData).then(() => {
      setActiveRoom({ ...sessionData, id: user.id })
      setLoading(false)
      toast({ title: "Live Class Started", description: `Broadcasting to ${selectedCourse?.name}` })
    }).catch(async (serverError) => {
      setLoading(false)
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'write',
        requestResourceData: sessionData
      }))
    })
  }

  const handleEndClass = () => {
    if (!db || !activeRoom) return
    const docRef = doc(db, 'liveSessions', activeRoom.id)
    deleteDoc(docRef).then(() => {
      setActiveRoom(null)
      toast({ title: "Class Ended", description: "The live session has been closed." })
    }).catch(async (serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete'
      }))
    })
  }

  if (activeRoom) {
    const jitsiUrl = `https://8x8.vc/${JAAS_APP_ID}/${activeRoom.roomName}#config.prejoinPageEnabled=false&userInfo.displayName="${user?.name || 'Guest'}"&config.startWithAudioMuted=false&config.startWithVideoMuted=false`;

    return (
      <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-700">
        <div className="flex items-center justify-between px-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">{activeRoom.className}</Badge>
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">{activeRoom.subjectName}</Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1"><Clock size={12} /> Auto-Attendance Active</Badge>
            </div>
            <h2 className="text-3xl font-black text-primary tracking-tighter flex items-center gap-2">
              <MonitorPlay className="text-accent" /> {activeRoom.title}
            </h2>
          </div>
          {isMentor && (
            <Button variant="destructive" onClick={handleEndClass} className="rounded-xl px-8 h-12 font-black">
              End Session
            </Button>
          )}
        </div>
        
        <div className="flex-1 min-h-[600px] rounded-[3rem] overflow-hidden border-8 border-white/50 shadow-2xl bg-black relative">
          <iframe
            src={jitsiUrl}
            allow="camera; microphone; display-capture; autoplay; clipboard-write"
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12 py-10">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <div className="w-20 h-20 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-6">
          <Video size={40} />
        </div>
        <h2 className="text-5xl font-black text-primary tracking-tighter">Live Education Portal</h2>
        <p className="text-lg text-muted-foreground font-medium italic">"Real-time wisdom, Shaping Futures through premium JaaS connection."</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {isMentor && (
          <Card className="rounded-[3rem] border-none shadow-2xl bg-white/60 backdrop-blur-md overflow-hidden">
            <div className="h-3 bg-accent" />
            <CardHeader className="p-10 pb-6">
              <CardTitle className="text-3xl font-black text-primary flex items-center gap-3">
                <Sparkles className="text-accent" /> Host Daily Class
              </CardTitle>
              <CardDescription className="font-bold text-base">Select your target audience and subject to begin.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-0 space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Class Topic / Title</Label>
                  <Input 
                    placeholder="e.g. Daily Mathematics Session" 
                    className="rounded-2xl h-16 bg-white border-muted font-bold text-lg" 
                    value={sessionTitle}
                    onChange={e => setSessionTitle(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Target Class</Label>
                    <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                      <SelectTrigger className="rounded-2xl h-14 bg-white border-muted font-bold">
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {allCourses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Subject</Label>
                    <Select onValueChange={setSelectedSubjectId} value={selectedSubjectId} disabled={!selectedClassId}>
                      <SelectTrigger className="rounded-2xl h-14 bg-white border-muted font-bold">
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Button 
                className="w-full h-16 rounded-[1.5rem] bg-accent text-xl font-black shadow-xl shadow-accent/20 hover:scale-[1.02] transition-transform"
                onClick={handleStartClass}
                disabled={loading || !sessionTitle.trim() || !selectedClassId || !selectedSubjectId}
              >
                {loading ? <Loader2 className="animate-spin" /> : "Start Live Session"}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <h3 className="text-2xl font-black text-primary px-4 flex items-center gap-2">
            <Users className="text-accent" /> {isMentor ? 'Active Campus Sessions' : 'Ongoing Classes for You'}
          </h3>
          <div className="grid gap-6">
            {sessions?.map(session => (
              <Card key={session.id} className="rounded-[2.5rem] border-none shadow-xl bg-white/80 overflow-hidden hover:-translate-y-1 transition-all duration-300">
                <CardContent className="p-8 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center animate-pulse">
                      <MonitorPlay size={32} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-green-600 rounded-lg">LIVE</Badge>
                        <Badge variant="outline" className="text-[10px] uppercase font-black">{session.className}</Badge>
                        <Badge variant="outline" className="text-[10px] uppercase font-black">{session.subjectName}</Badge>
                      </div>
                      <h4 className="text-2xl font-black tracking-tight">{session.title}</h4>
                      <p className="text-sm font-bold text-muted-foreground">Mentor: {session.mentorName}</p>
                    </div>
                  </div>
                  <Button 
                    className="rounded-2xl h-14 px-10 font-black text-lg bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
                    onClick={() => setActiveRoom(session)}
                  >
                    Join Now
                  </Button>
                </CardContent>
              </Card>
            ))}
            {(!sessions || sessions.length === 0) && (
              <div className="text-center py-24 bg-white/40 border-4 border-dashed rounded-[3rem] border-primary/10">
                <Video size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                <p className="font-black text-muted-foreground/60 italic">
                  {isMentor ? 'No sessions currently active.' : `No live classes scheduled for your class right now.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
