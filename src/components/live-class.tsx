
"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/components/auth-wrapper'
import { useFirestore, useCollection } from '@/firebase'
import { collection, addDoc, serverTimestamp, deleteDoc, doc, query, where } from 'firebase/firestore'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Video, Users, LogOut, ShieldCheck, Loader2, MonitorPlay, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

export function LiveClassInterface() {
  const { user } = useAuth()
  const db = useFirestore()
  const { toast } = useToast()
  const [sessionTitle, setSessionTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeRoom, setActiveRoom] = useState<any>(null)

  const isMentor = user?.role === 'mentor'
  const isAdmin = user?.role === 'admin'
  const isStudent = user?.role === 'student' || user?.role === 'public_student'

  // Sessions query: Filter by mentor if student is assigned, otherwise show all active
  const sessionsQuery = useMemo(() => {
    if (!db) return null
    if (user?.mentorId) {
      return query(collection(db, 'liveSessions'), where('mentorId', '==', user.mentorId))
    }
    return collection(db, 'liveSessions')
  }, [db, user?.mentorId])

  const { data: sessions } = useCollection(sessionsQuery)

  const handleStartClass = async () => {
    if (!db || !user || !sessionTitle.trim()) return
    setLoading(true)
    
    // Generate a unique room name
    const roomName = `D120-${user.id}-${Date.now()}`
    const sessionData = {
      title: sessionTitle.trim(),
      mentorId: user.id,
      mentorName: user.name,
      roomName,
      createdAt: serverTimestamp()
    }

    const collRef = collection(db, 'liveSessions')
    addDoc(collRef, sessionData).then((docRef) => {
      setActiveRoom({ ...sessionData, id: docRef.id })
      setLoading(false)
      toast({ title: "Live Class Started", description: "You are now hosting a video session." })
    }).catch(async (serverError) => {
      setLoading(false)
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: collRef.path,
        operation: 'create',
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
    return (
      <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-700">
        <div className="flex items-center justify-between px-4">
          <div>
            <h2 className="text-3xl font-black text-primary tracking-tighter flex items-center gap-2">
              <MonitorPlay className="text-accent" /> {activeRoom.title}
            </h2>
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Live Interactive Session</p>
          </div>
          {isMentor && (
            <Button variant="destructive" onClick={handleEndClass} className="rounded-xl px-8 h-12 font-black">
              End Class for Everyone
            </Button>
          )}
        </div>
        
        <div className="flex-1 min-h-[600px] rounded-[3rem] overflow-hidden border-8 border-white/50 shadow-2xl bg-black relative">
          <iframe
            src={`https://meet.jit.si/${activeRoom.roomName}#config.prejoinPageEnabled=false&interfaceConfig.TOOLBAR_BUTTONS=["microphone","camera","closedcaptions","desktop","fullscreen","fodeviceselection","hangup","profile","chat","recording","livestreaming","etherpad","sharedvideo","settings","raisehand","videoquality","filmstrip","invite","feedback","stats","shortcuts","tileview","videobackgroundblur","download","help","mute-everyone","security"]`}
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
        <h2 className="text-5xl font-black text-primary tracking-tighter">Daily Live Classes</h2>
        <p className="text-lg text-muted-foreground font-medium italic">"Connecting Minds, Shaping Futures through live interaction."</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {isMentor && (
          <Card className="rounded-[3rem] border-none shadow-2xl bg-white/60 backdrop-blur-md overflow-hidden">
            <div className="h-3 bg-accent" />
            <CardHeader className="p-10 pb-6">
              <CardTitle className="text-3xl font-black text-primary flex items-center gap-3">
                <Sparkles className="text-accent" /> Start a New Class
              </CardTitle>
              <CardDescription className="font-bold text-base">Host a live video conference for your students.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-0 space-y-8">
              <div className="space-y-2">
                <Label className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-1">Class Topic / Title</Label>
                <Input 
                  placeholder="e.g. Mathematics Chapter 5 - Algebra" 
                  className="rounded-2xl h-16 bg-white border-muted font-bold text-lg" 
                  value={sessionTitle}
                  onChange={e => setSessionTitle(e.target.value)}
                />
              </div>
              <Button 
                className="w-full h-16 rounded-[1.5rem] bg-accent text-xl font-black shadow-xl shadow-accent/20 hover:scale-[1.02] transition-transform"
                onClick={handleStartClass}
                disabled={loading || !sessionTitle.trim()}
              >
                {loading ? <Loader2 className="animate-spin" /> : "Go Live Now"}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <h3 className="text-2xl font-black text-primary px-4 flex items-center gap-2">
            <Users className="text-accent" /> Active Sessions
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
                      <Badge className="bg-green-600 mb-1 rounded-lg">LIVE NOW</Badge>
                      <h4 className="text-2xl font-black tracking-tight">{session.title}</h4>
                      <p className="text-sm font-bold text-muted-foreground">Hosted by {session.mentorName}</p>
                    </div>
                  </div>
                  <Button 
                    className="rounded-2xl h-14 px-10 font-black text-lg bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20"
                    onClick={() => setActiveRoom(session)}
                  >
                    Join Class
                  </Button>
                </CardContent>
              </Card>
            ))}
            {(!sessions || sessions.length === 0) && (
              <div className="text-center py-24 bg-white/40 border-4 border-dashed rounded-[3rem] border-primary/10">
                <Video size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                <p className="font-black text-muted-foreground/60 italic">No live classes scheduled right now.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
