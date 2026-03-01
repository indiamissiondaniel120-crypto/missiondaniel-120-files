
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
  const lastActiveRef = useRef<number>(Date.now())
  const wentHiddenAtRef = useRef<number | null>(null)

  const handleLogout = async (reason: string = 'auto_logout') => {
    if (user && db) {
      addDoc(collection(db, 'students', user.id, 'activity'), {
        type: 'inactivity_logout',
        timestamp: serverTimestamp(),
        metadata: { 
          reason,
          inactiveAt: wentHiddenAtRef.current ? new Date(wentHiddenAtRef.current).toISOString() : new Date().toISOString()
        }
      })
    }
    logout()
    setShowWarning(false)
  }

  const resetTimer = () => {
    lastActiveRef.current = Date.now()
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

  // Handle standard user interactions
  useEffect(() => {
    if (!user) return

    const events = ['mousedown', 'keydown', 'touchstart', 'mousemove']
    const listener = () => resetTimer()

    events.forEach(event => window.addEventListener(event, listener))
    resetTimer()

    // Visibility Change Detection (Tab switching/App switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wentHiddenAtRef.current = Date.now()
        // When they leave, we still want the timer to run
        // But if they are gone for > TOTAL_LIMIT, we log them out when they return or via interval
      } else {
        // Returned to tab
        if (wentHiddenAtRef.current) {
          const awayDuration = Date.now() - wentHiddenAtRef.current
          if (awayDuration >= TOTAL_LIMIT) {
            handleLogout('tab_away_timeout')
          } else {
            // Log the "came back" event if needed, or just reset
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
  }, [user, showWarning])

  // Countdown logic for the warning dialog
  useEffect(() => {
    if (showWarning) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!)
            handleLogout('inactivity_countdown_reached')
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
