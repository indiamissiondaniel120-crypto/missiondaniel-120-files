"use client"

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sparkles, BookOpen, ListChecks, MessageSquare, Loader2, Send, RotateCcw } from 'lucide-react'
import { explainCourseConcept } from '@/ai/flows/ai-course-concept-explainer'
import { summarizeStudyMaterial } from '@/ai/flows/ai-study-material-summarizer'
import { generatePracticeQuestions } from '@/ai/flows/ai-practice-question-generator'
import { solveStudentDoubt } from '@/ai/flows/ai-doubt-solver'

export function AICompanion() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [input, setInput] = useState('')

  const handleAskDoubt = async () => {
    if (!input) return
    setLoading(true)
    try {
      const res = await solveStudentDoubt({ question: input })
      setResult({ type: 'doubt', ...res })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

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

  const resetResult = () => {
    setResult(null)
    setInput('')
  }

  return (
    <Card className="border-accent/20 bg-accent/5 backdrop-blur-sm shadow-xl rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Sparkles className="text-accent" />
          AI Study Companion
        </CardTitle>
        <CardDescription>Get instant help from Gemini with your academic doubts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input 
            placeholder="Ask a question or enter a topic..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="bg-background rounded-xl border-accent/20"
            onKeyDown={(e) => e.key === 'Enter' && handleAskDoubt()}
          />
          <Button 
            size="icon" 
            className="rounded-xl shrink-0 bg-accent" 
            onClick={handleAskDoubt} 
            disabled={loading || !input}
          >
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Send size={18} />}
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" onClick={handleExplain} disabled={loading || !input} className="flex gap-1 text-[10px] md:text-xs">
            <BookOpen size={14} /> Explain
          </Button>
          <Button variant="outline" size="sm" onClick={handleSummarize} disabled={loading || !input} className="flex gap-1 text-[10px] md:text-xs">
            <MessageSquare size={14} /> Summarize
          </Button>
          <Button variant="outline" size="sm" onClick={handleQuestions} disabled={loading || !input} className="flex gap-1 text-[10px] md:text-xs">
            <ListChecks size={14} /> Practice
          </Button>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center p-8 space-y-2">
            <Loader2 className="animate-spin text-primary h-10 w-10" />
            <p className="text-sm text-muted-foreground animate-pulse font-medium">Gemini is thinking...</p>
          </div>
        )}

        {result && !loading && (
          <div className="mt-4 p-5 rounded-2xl bg-background border border-accent/10 animate-in fade-in slide-in-from-top-2 shadow-sm relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-accent"
              onClick={resetResult}
            >
              <RotateCcw size={14} />
            </Button>

            {result.type === 'doubt' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-bold text-primary flex items-center gap-2">
                    <Sparkles size={16} className="text-accent" /> Answer:
                  </h4>
                  <p className="text-sm leading-relaxed text-foreground/90">{result.answer}</p>
                </div>
                {result.keyTakeaways && result.keyTakeaways.length > 0 && (
                  <div className="pt-3 border-t">
                    <h5 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">Key Takeaways:</h5>
                    <ul className="space-y-1.5">
                      {result.keyTakeaways.map((point: string, i: number) => (
                        <li key={i} className="text-sm flex gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {result.type === 'explanation' && (
              <div className="space-y-4">
                <h4 className="font-bold text-primary">Simplified Explanation:</h4>
                <p className="text-sm leading-relaxed">{result.explanation}</p>
                <div className="space-y-2">
                  <h5 className="text-[10px] font-bold text-accent uppercase tracking-widest">Illustrative Examples:</h5>
                  {result.examples.map((ex: string, i: number) => (
                    <div key={i} className="text-sm bg-accent/5 p-3 rounded-xl italic border border-accent/10 border-dashed">
                      "{ex}"
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.type === 'summary' && (
              <div className="space-y-3">
                <h4 className="font-bold text-primary">Core Summary:</h4>
                <p className="text-sm leading-relaxed bg-muted/30 p-4 rounded-xl">{result.summary}</p>
              </div>
            )}

            {result.type === 'questions' && (
              <div className="space-y-4">
                <h4 className="font-bold text-primary">Practice Exercises:</h4>
                <div className="space-y-4">
                  {result.practiceQuestions.map((q: any, i: number) => (
                    <div key={i} className="space-y-2 border-b pb-4 last:border-0 last:pb-0">
                      <p className="text-sm font-semibold">{i+1}. {q.question}</p>
                      {q.options && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {q.options.map((opt: string, j: number) => (
                            <div key={j} className="text-[11px] bg-muted/50 p-2 rounded-lg border border-transparent hover:border-accent/20 transition-colors">
                              {opt}
                            </div>
                          ))}
                        </div>
                      )}
                      <details className="text-xs cursor-pointer group mt-2">
                        <summary className="text-accent font-bold hover:underline list-none flex items-center gap-1">
                          <span className="group-open:hidden">View Correct Answer</span>
                          <span className="hidden group-open:inline">Hide Answer</span>
                        </summary>
                        <div className="p-3 mt-2 bg-accent/5 border border-accent/20 border-dashed rounded-xl font-medium text-accent">
                          {q.correctAnswer}
                        </div>
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
