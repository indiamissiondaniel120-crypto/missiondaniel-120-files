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
const TOTAL_LIMIT = INACTIVITY_LIMIT + (COUNTDOWN_LIMIT * 1000)

export function InactivityMonitor() {
  const { user, logout } = useAuth()
  const db = useFirestore()
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(COUNTDOWN_LIMIT)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const wentHiddenAtRef = useRef<number | null>(null)

  const handleLogout = async (reason: string = 'auto_logout', duration: number = 0) => {
    if (user && db) {
      addDoc(collection(db, 'students', user.id, 'activity'), {
        type: 'inactivity_logout',
        timestamp: serverTimestamp(),
        duration,
        metadata: { 
          reason,
          inactiveAt: new Date().toISOString()
        }
      })
    }
    logout()
    setShowWarning(false)
  }

  const resetTimer = () => {
    if (showWarning) return
    
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setShowWarning(true)
    }, INACTIVITY_LIMIT)
  }

  const handleResume = () => {
    setShowWarning(false)
    setCountdown(COUNTDOWN_LIMIT)
    resetTimer()
  }

  useEffect(() => {
    if (!user || user.role !== 'student') return

    const events = ['mousedown', 'keydown', 'touchstart', 'mousemove']
    const listener = () => resetTimer()

    events.forEach(event => window.addEventListener(event, listener))
    resetTimer()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wentHiddenAtRef.current = Date.now()
      } else {
        if (wentHiddenAtRef.current) {
          const awayDurationMs = Date.now() - wentHiddenAtRef.current
          const awayDurationSec = Math.floor(awayDurationMs / 1000)
          
          if (awayDurationMs >= TOTAL_LIMIT) {
            handleLogout('tab_away_timeout', awayDurationSec)
          } else {
            // Log the "away" duration so admin knows exactly how much time was spent in background
            if (awayDurationSec > 5 && db && user) {
              addDoc(collection(db, 'students', user.id, 'activity'), {
                type: 'tab_away',
                timestamp: serverTimestamp(),
                duration: awayDurationSec,
                metadata: { returnTimestamp: new Date().toISOString() }
              })
            }
            resetTimer()
          }
          wentHiddenAtRef.current = null
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      events.forEach(event => window.removeEventListener(event, listener))
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [user, showWarning, db])

  // Countdown logic
  useEffect(() => {
    if (showWarning) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!)
            handleLogout('inactivity_countdown_reached', INACTIVITY_LIMIT / 1000)
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

  if (!user || user.role !== 'student') return null

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
