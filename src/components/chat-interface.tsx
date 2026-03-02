
"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useFirestore, useCollection } from '@/firebase'
import { collection, addDoc, serverTimestamp, query, orderBy, limit, doc, updateDoc, where, getDocs, writeBatch, onSnapshot } from 'firebase/firestore'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Send, User, ShieldAlert } from 'lucide-react'
import { errorEmitter } from '@/firebase/error-emitter'
import { FirestorePermissionError } from '@/firebase/errors'

interface ChatInterfaceProps {
  chatId: string
  currentUser: { id: string, name: string, role: string }
  otherUserName: string
  readonly?: boolean
}

export function ChatInterface({ chatId, currentUser, otherUserName, readonly = false }: ChatInterfaceProps) {
  const db = useFirestore()
  const [message, setMessage] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const messagesQuery = useMemo(() => {
    if (!db || !chatId) return null
    return query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    )
  }, [db, chatId])

  const { data: messages } = useCollection(messagesQuery)

  // Mark incoming messages as read
  useEffect(() => {
    if (!db || !messages || readonly) return

    const unreadMessages = messages.filter((msg: any) => msg.senderId !== currentUser.id && msg.read === false)
    if (unreadMessages.length > 0) {
      const batch = writeBatch(db)
      unreadMessages.forEach((msg: any) => {
        const msgRef = doc(db, 'chats', chatId, 'messages', msg.id)
        batch.update(msgRef, { read: true })
      })
      batch.commit().catch(e => console.error("Error updating read status:", e))
    }
  }, [db, messages, currentUser.id, chatId, readonly])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !message.trim() || readonly) return

    const data = {
      senderId: currentUser.id,
      senderName: currentUser.name,
      text: message.trim(),
      timestamp: serverTimestamp(),
      read: false
    }

    const messagesRef = collection(db, 'chats', chatId, 'messages')
    
    addDoc(messagesRef, data)
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: messagesRef.path,
          operation: 'create',
          requestResourceData: data
        }))
      })

    setMessage('')
  }

  return (
    <Card className={`flex flex-col h-[500px] border-accent/20 shadow-xl rounded-2xl overflow-hidden ${readonly ? 'bg-muted/30' : ''}`}>
      <CardHeader className="py-4 border-b bg-background flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-3">
          <div className="bg-accent/10 p-2 rounded-lg">
            <MessageSquare className="text-accent h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold">{readonly ? 'Chat Monitor' : otherUserName}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {readonly ? 'Safety Review' : 'Online Chat'}
            </span>
          </div>
        </CardTitle>
        {readonly && (
          <Badge variant="destructive" className="gap-1 px-2 py-1">
            <ShieldAlert size={12} /> Monitor
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0 bg-muted/10">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {messages?.map((msg: any, i: number) => {
              const isMe = msg.senderId === currentUser.id
              return (
                <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${
                    isMe ? 'bg-accent text-white rounded-tr-none' : 'bg-white text-foreground rounded-tl-none border'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] opacity-70 block">
                        {msg.timestamp?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1 font-medium">
                    {msg.senderName}
                  </span>
                </div>
              )
            })}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </CardContent>
      {!readonly && (
        <CardFooter className="p-4 border-t bg-background">
          <form onSubmit={handleSendMessage} className="flex w-full gap-2">
            <Input 
              placeholder="Type your message..." 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 rounded-xl bg-muted/50 border-none"
            />
            <Button type="submit" size="icon" className="bg-accent rounded-xl w-12 h-10" disabled={!message.trim()}>
              <Send size={18} />
            </Button>
          </form>
        </CardFooter>
      )}
    </Card>
  )
}
