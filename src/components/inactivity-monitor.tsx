
"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/components/auth-wrapper'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { useFirestore } from '@/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

const INACTIVITY_LIMIT = 120000 // 2 minutes
const COUNTDOWN_LIMIT = 5 // 5 seconds

export function InactivityMonitor() {
  const { user, logout } = useAuth()
  const db = useFirestore()
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(COUNTDOWN_LIMIT)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const resetTimer = () => {
    if (showWarning) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setShowWarning(true)
    }, INACTIVITY_LIMIT)
  }

  const handleLogout = async () => {
    if (user && db) {
      addDoc(collection(db, 'students', user.id, 'activity'), {
        type: 'inactivity_logout',
        timestamp: serverTimestamp(),
        metadata: { reason: 'auto_logout' }
      })
    }
    logout()
    setShowWarning(false)
  }

  const handleResume = () => {
    setShowWarning(false)
    setCountdown(COUNTDOWN_LIMIT)
    resetTimer()
  }

  useEffect(() => {
    if (!user) return

    const events = ['mousedown', 'keydown', 'touchstart', 'mousemove']
    events.forEach(event => window.addEventListener(event, resetTimer))
    resetTimer()

    return () => {
      events.forEach(event => window.removeEventListener(event, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [user, showWarning])

  useEffect(() => {
    if (showWarning) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!)
            handleLogout()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
      setCountdown(COUNTDOWN_LIMIT)
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [showWarning])

  if (!user) return null

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you still there?</AlertDialogTitle>
          <AlertDialogDescription>
            You have been inactive for a while. You will be logged out in {countdown} seconds to keep your session secure.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Progress value={(countdown / COUNTDOWN_LIMIT) * 100} className="h-2" />
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleResume} className="w-full sm:w-auto">
            Resume Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
