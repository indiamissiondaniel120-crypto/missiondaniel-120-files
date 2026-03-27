'use server';
/**
 * @fileOverview A general-purpose AI academic assistant to solve student doubts.
 *
 * - solveStudentDoubt - A function that handles answering academic questions.
 * - AIDoubtSolverInput - The input type for the solveStudentDoubt function.
 * - AIDoubtSolverOutput - The return type for the solveStudentDoubt function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AIDoubtSolverInputSchema = z.object({
  question: z.string().describe('The academic question or doubt the student has.'),
  context: z.string().optional().describe('Optional: Relevant context or subject area.'),
});
export type AIDoubtSolverInput = z.infer<typeof AIDoubtSolverInputSchema>;

const AIDoubtSolverOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the student\'s doubt.'),
  keyTakeaways: z.array(z.string()).optional().describe('A few key points or summaries related to the answer.'),
});
export type AIDoubtSolverOutput = z.infer<typeof AIDoubtSolverOutputSchema>;

export async function solveStudentDoubt(input: AIDoubtSolverInput): Promise<AIDoubtSolverOutput> {
  return aiDoubtSolverFlow(input);
}

const doubtPrompt = ai.definePrompt({
  name: 'aiDoubtSolverPrompt',
  input: { schema: AIDoubtSolverInputSchema },
  output: { schema: AIDoubtSolverOutputSchema },
  prompt: `You are an expert academic tutor for the DANIEL 120 education platform. 
The vision of DANIEL 120 is "Uplifting Education, Shaping Futures".

A student has a doubt: 
"""
{{{question}}}
"""

{{#if context}}
Additional Context:
"""
{{{context}}}
"""
{{/if}}

Please provide a clear, encouraging, and accurate answer to the student's question. 
Break down complex steps if it's a problem-solving question. 
Finish with a few key takeaways to help them remember the concept.`,
});

const aiDoubtSolverFlow = ai.defineFlow(
  {
    name: 'aiDoubtSolverFlow',
    inputSchema: AIDoubtSolverInputSchema,
    outputSchema: AIDoubtSolverOutputSchema,
  },
  async (input) => {
    const { output } = await doubtPrompt(input);
    if (!output) throw new Error('Failed to generate answer.');
    return output;
  }
);
