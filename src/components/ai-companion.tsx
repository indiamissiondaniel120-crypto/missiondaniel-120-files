"use client"

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Sparkles, BookOpen, ListChecks, MessageSquare, Loader2 } from 'lucide-react'
import { explainCourseConcept } from '@/ai/flows/ai-course-concept-explainer'
import { summarizeStudyMaterial } from '@/ai/flows/ai-study-material-summarizer'
import { generatePracticeQuestions } from '@/ai/flows/ai-practice-question-generator'

export function AICompanion() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [input, setInput] = useState('')

  const handleExplain = async () => {
    if (!input) return
    setLoading(true)
    try {
      const res = await explainCourseConcept({ concept: input })
      setResult({ type: 'explanation', ...res })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSummarize = async () => {
    if (!input) return
    setLoading(true)
    try {
      const res = await summarizeStudyMaterial({ content: input, summaryLength: 'medium' })
      setResult({ type: 'summary', ...res })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleQuestions = async () => {
    if (!input) return
    setLoading(true)
    try {
      const res = await generatePracticeQuestions({ topic: input, numberOfQuestions: 3 })
      setResult({ type: 'questions', ...res })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-accent/20 bg-accent/5 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Sparkles className="text-accent" />
          AI Study Companion
        </CardTitle>
        <CardDescription>Ask for explanations, summaries, or practice questions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input 
            placeholder="What are you studying today?" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="bg-background"
          />
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={handleExplain} disabled={loading || !input} className="flex gap-1">
            <BookOpen size={16} /> Explain
          </Button>
          <Button variant="outline" size="sm" onClick={handleSummarize} disabled={loading || !input} className="flex gap-1">
            <MessageSquare size={16} /> Summarize
          </Button>
          <Button variant="outline" size="sm" onClick={handleQuestions} disabled={loading || !input} className="flex gap-1">
            <ListChecks size={16} /> Practice
          </Button>
        </div>

        {loading && (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-primary h-8 w-8" />
          </div>
        )}

        {result && !loading && (
          <div className="mt-4 p-4 rounded-lg bg-background border animate-in fade-in slide-in-from-top-2">
            {result.type === 'explanation' && (
              <div className="space-y-3">
                <h4 className="font-bold text-primary">Explanation:</h4>
                <p className="text-sm leading-relaxed">{result.explanation}</p>
                <div className="space-y-1">
                  <h5 className="text-xs font-semibold text-accent uppercase tracking-wider">Examples:</h5>
                  {result.examples.map((ex: string, i: number) => (
                    <div key={i} className="text-sm bg-accent/5 p-2 rounded italic">"{ex}"</div>
                  ))}
                </div>
              </div>
            )}
            {result.type === 'summary' && (
              <div className="space-y-3">
                <h4 className="font-bold text-primary">Summary:</h4>
                <p className="text-sm leading-relaxed">{result.summary}</p>
              </div>
            )}
            {result.type === 'questions' && (
              <div className="space-y-3">
                <h4 className="font-bold text-primary">Practice Questions:</h4>
                <div className="space-y-4">
                  {result.practiceQuestions.map((q: any, i: number) => (
                    <div key={i} className="space-y-2 border-b pb-2 last:border-0">
                      <p className="text-sm font-medium">{i+1}. {q.question}</p>
                      {q.options && (
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {q.options.map((opt: string, j: number) => (
                            <div key={j} className="text-xs bg-muted p-2 rounded">{opt}</div>
                          ))}
                        </div>
                      )}
                      <details className="text-xs cursor-pointer text-accent font-semibold">
                        <summary>Show Correct Answer</summary>
                        <div className="p-2 mt-1 bg-accent/10 rounded">{q.correctAnswer}</div>
                      </details>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
