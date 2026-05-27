"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '@/components/auth-wrapper'
import { useFirestore, useCollection } from '@/firebase'
import { collection, addDoc, serverTimestamp, deleteDoc, doc, query, where, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
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
      // Random interval between 3 and 12 minutes
      const min = 3 * 60 * 1000;
      const max = 12 * 60 * 1000;
      const delay = Math.floor(Math.random() * (max - min + 1)) + min;

      timeoutId = setTimeout(() => {
        const collName = user.role.includes('student') ? 'students' : 'mentors';
        const activityRef = collection(db, collName, user.id, 'activity');
        const activityData = {
          type: 'live_attendance_pulse',
          timestamp: serverTimestamp(),
          metadata: {
            title: activeRoom.title,
            sessionId: activeRoom.historyId || activeRoom.id || activeRoom.roomName,
            subjectName: activeRoom.subjectName,
            className: activeRoom.className,
            role: user.role
          }
        };

        addDoc(activityRef, activityData).catch(async (serverError) => {
           errorEmitter.emit('permission-error', new FirestorePermissionError({
             path: activityRef.path,
             operation: 'create',
             requestResourceData: activityData
           }));
        });

        const centralLogRef = collection(db, 'liveAttendanceLogs');
        const centralLogData = {
          sessionId: activeRoom.historyId || activeRoom.id,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          timestamp: serverTimestamp()
        };
        addDoc(centralLogRef, centralLogData).catch(async (serverError) => {
           errorEmitter.emit('permission-error', new FirestorePermissionError({
             path: centralLogRef.path,
             operation: 'create',
             requestResourceData: centralLogData
           }));
        });

        scheduleAttendanceMark();
      }, delay);
    };

    scheduleAttendanceMark();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeRoom?.id, activeRoom?.historyId, user?.id, user?.role, db]);

  const coursesQuery = useMemo(() => db ? collection(db, 'courses') : null, [db]);
  const subjectsQuery = useMemo(() => db ? collection(db, 'subjects') : null, [db]);
  const { data: allCourses } = useCollection(coursesQuery);
  const { data: allSubjects } = useCollection(subjectsQuery);

  const availableSubjects = useMemo(() => {
    if (!allSubjects || !selectedClassId) return [];
    return allSubjects.filter(s => s.courseId === selectedClassId);
  }, [allSubjects, selectedClassId]);

  const sessionsQuery = useMemo(() => {
    if (!db || !user) return null
    if (isMentor) return collection(db, 'liveSessions')
    if (user.class) return query(collection(db, 'liveSessions'), where('classId', '==', user.class))
    return collection(db, 'liveSessions')
  }, [db, user, isMentor])

  const { data: sessions } = useCollection(sessionsQuery)

  const handleStartClass = async () => {
    if (!db || !user || !sessionTitle.trim() || !selectedClassId || !selectedSubjectId) return
    setLoading(true)
    
    const selectedCourse = allCourses?.find(c => c.id === selectedClassId);
    const selectedSubject = allSubjects?.find(s => s.id === selectedSubjectId);

    const roomName = `D120-Live-${user.id}`
    const historyId = `HIST-${user.id}-${Date.now()}`;

    const sessionData = {
      title: sessionTitle.trim(),
      mentorId: user.id,
      mentorName: user.name,
      classId: selectedClassId,
      className: selectedCourse?.name || 'Unknown Class',
      subjectId: selectedSubjectId,
      subjectName: selectedSubject?.name || 'General Subject',
      roomName,
      historyId,
      createdAt: serverTimestamp()
    }

    const historyData = {
      ...sessionData,
      viewedByAdmin: false,
      status: 'active'
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'liveSessions', user.id), sessionData);
    batch.set(doc(db, 'liveClassHistory', historyId), historyData);

    batch.commit().then(() => {
      setActiveRoom({ ...sessionData, id: user.id })
      setLoading(false)
      toast({ title: "Live Class Started", description: `Broadcasting to ${selectedCourse?.name}` })
    }).catch(async (serverError) => {
      setLoading(false)
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'batch-live-start',
        operation: 'write'
      }))
    })
  }

  const handleEndClass = () => {
    if (!db || !activeRoom) return
    
    const batch = writeBatch(db);
    batch.delete(doc(db, 'liveSessions', activeRoom.id));
    if (activeRoom.historyId) {
      batch.update(doc(db, 'liveClassHistory', activeRoom.historyId), {
        endedAt: serverTimestamp(),
        status: 'ended'
      });
    }

    batch.commit().then(() => {
      setActiveRoom(null)
      toast({ title: "Class Ended", description: "The live session has been closed." })
    }).catch(async (serverError) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'batch-live-end',
        operation: 'write'
      }))
    })
  }

  if (activeRoom) {
    const jitsiUrl = `https://8x8.vc/${JAAS_APP_ID}/${activeRoom.roomName}#config.prejoinPageEnabled=false&userInfo.displayName="${user?.name || 'Guest'}"&config.startWithAudioMuted=false&config.startWithVideoMuted=false`;

    return (
      <div className="h-full flex flex-col space-y-4 md:space-y-6 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between px-2 gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[9px] md:text-xs">{activeRoom.className}</Badge>
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 text-[9px] md:text-xs">{activeRoom.subjectName}</Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1 text-[9px] md:text-xs"><Clock size={10} /> Auto-Attendance</Badge>
            </div>
            <h2 className="text-xl md:text-3xl font-black text-primary tracking-tighter flex items-center gap-2">
              <MonitorPlay className="text-accent shrink-0" size={24} /> <span className="truncate">{activeRoom.title}</span>
            </h2>
          </div>
          {isMentor && (
            <Button variant="destructive" onClick={handleEndClass} className="rounded-xl px-6 md:px-8 h-10 md:h-12 font-black w-full md:w-auto">
              End Session
            </Button>
          )}
        </div>
        
        <div className="flex-1 min-h-[400px] md:min-h-[600px] rounded-[1.5rem] md:rounded-[3rem] overflow-hidden border-4 md:border-8 border-white/50 shadow-2xl bg-black relative">
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
    <div className="space-y-8 md:space-y-12 py-4 md:py-10">
      <div className="text-center max-w-2xl mx-auto space-y-3 md:space-y-4 px-2">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
          <Video className="w-8 h-8 md:w-10 md:h-10" />
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-primary tracking-tighter">Live Education Portal</h2>
        <p className="text-sm md:text-lg text-muted-foreground font-medium italic">"Real-time wisdom, Shaping Futures through premium JaaS connection."</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
        {isMentor && (
          <Card className="rounded-[2rem] md:rounded-[3rem] border-none shadow-2xl bg-white/60 backdrop-blur-md overflow-hidden">
            <div className="h-2 md:h-3 bg-accent" />
            <CardHeader className="p-6 md:p-10 pb-4 md:pb-6">
              <CardTitle className="text-2xl md:text-3xl font-black text-primary flex items-center gap-3">
                <Sparkles className="text-accent" /> Host Daily Class
              </CardTitle>
              <CardDescription className="font-bold text-xs md:text-base">Select target audience and subject to begin.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 md:p-10 pt-0 space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Class Topic / Title</Label>
                  <Input 
                    placeholder="e.g. Daily Mathematics Session" 
                    className="rounded-xl md:rounded-2xl h-14 md:h-16 bg-white border-muted font-bold text-base md:text-lg" 
                    value={sessionTitle}
                    onChange={e => setSessionTitle(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Target Class</Label>
                    <Select onValueChange={setSelectedClassId} value={selectedClassId}>
                      <SelectTrigger className="rounded-xl md:rounded-2xl h-12 md:h-14 bg-white border-muted font-bold">
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {allCourses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Subject</Label>
                    <Select onValueChange={setSelectedSubjectId} value={selectedSubjectId} disabled={!selectedClassId}>
                      <SelectTrigger className="rounded-xl md:rounded-2xl h-12 md:h-14 bg-white border-muted font-bold">
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
                className="w-full h-14 md:h-16 rounded-xl md:rounded-[1.5rem] bg-accent text-lg md:text-xl font-black shadow-xl shadow-accent/20 hover:scale-[1.02] transition-transform"
                onClick={handleStartClass}
                disabled={loading || !sessionTitle.trim() || !selectedClassId || !selectedSubjectId}
              >
                {loading ? <Loader2 className="animate-spin" /> : "Start Live Session"}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <h3 className="text-xl md:text-2xl font-black text-primary px-4 flex items-center gap-2">
            <Users className="text-accent" /> {isMentor ? 'Active Campus Sessions' : 'Ongoing Classes'}
          </h3>
          <div className="grid gap-4 md:gap-6">
            {sessions?.map(session => (
              <Card key={session.id} className="rounded-[1.5rem] md:rounded-[2.5rem] border-none shadow-xl bg-white/80 overflow-hidden hover:-translate-y-1 transition-all duration-300">
                <CardContent className="p-6 md:p-8 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 md:gap-6 min-w-0">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-green-100 text-green-600 rounded-2xl md:rounded-3xl flex items-center justify-center animate-pulse shrink-0">
                      <MonitorPlay className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 overflow-x-auto scrollbar-hide">
                        <Badge className="bg-green-600 rounded-md text-[8px] md:text-[10px]">LIVE</Badge>
                        <Badge variant="outline" className="text-[8px] md:text-[10px] uppercase font-black shrink-0">{session.className}</Badge>
                        <Badge variant="outline" className="text-[8px] md:text-[10px] uppercase font-black shrink-0">{session.subjectName}</Badge>
                      </div>
                      <h4 className="text-lg md:text-2xl font-black tracking-tight truncate">{session.title}</h4>
                      <p className="text-xs md:text-sm font-bold text-muted-foreground truncate">Mentor: {session.mentorName}</p>
                    </div>
                  </div>
                  <Button 
                    className="rounded-xl md:rounded-2xl h-10 md:h-14 px-4 md:px-10 font-black text-xs md:text-lg bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 shrink-0"
                    onClick={() => setActiveRoom(session)}
                  >
                    Join
                  </Button>
                </CardContent>
              </Card>
            ))}
            {(!sessions || sessions.length === 0) && (
              <div className="text-center py-16 md:py-24 bg-white/40 border-4 border-dashed rounded-[2rem] md:rounded-[3rem] border-primary/10">
                <Video size={32} className="mx-auto text-muted-foreground/30 mb-2 md:mb-4 md:w-12 md:h-12" />
                <p className="font-black text-xs md:text-sm text-muted-foreground/60 italic px-4">
                  {isMentor ? 'No sessions active.' : `No classes for your grade right now.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
