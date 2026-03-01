'use server';
/**
 * @fileOverview An AI agent that summarizes study materials (PDF text or video transcripts).
 *
 * - summarizeStudyMaterial - A function that generates a concise summary of provided text content.
 * - StudyMaterialSummarizerInput - The input type for the summarizeStudyMaterial function.
 * - StudyMaterialSummarizerOutput - The return type for the summarizeStudyMaterial function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const StudyMaterialSummarizerInputSchema = z.object({
  content: z
    .string()
    .describe('The text content from either a PDF document or a video lecture transcript.'),
  summaryLength: z
    .enum(['short', 'medium', 'long'])
    .default('medium')
    .describe('The desired length of the summary. Can be short, medium, or long.'),
});
export type StudyMaterialSummarizerInput = z.infer<typeof StudyMaterialSummarizerInputSchema>;

const StudyMaterialSummarizerOutputSchema = z.object({
  summary: z.string().describe('The concise summary of the provided study material.'),
});
export type StudyMaterialSummarizerOutput = z.infer<typeof StudyMaterialSummarizerOutputSchema>;

export async function summarizeStudyMaterial(
  input: StudyMaterialSummarizerInput
): Promise<StudyMaterialSummarizerOutput> {
  return aiStudyMaterialSummarizerFlow(input);
}

const summarizePrompt = ai.definePrompt({
  name: 'summarizeStudyMaterialPrompt',
  input: { schema: StudyMaterialSummarizerInputSchema },
  output: { schema: StudyMaterialSummarizerOutputSchema },
  prompt: `Please provide a {{{summaryLength}}} summary of the following study material.\n\nStudy Material Content:\n{{{content}}}\n\nSummary:`,
});

const aiStudyMaterialSummarizerFlow = ai.defineFlow(
  {
    name: 'aiStudyMaterialSummarizerFlow',
    inputSchema: StudyMaterialSummarizerInputSchema,
    outputSchema: StudyMaterialSummarizerOutputSchema,
  },
  async (input) => {
    if (!input.content || input.content.trim() === '') {
      throw new Error('No content provided for summarization.');
    }

    const { output } = await summarizePrompt(input);
    return output!;
  }
);
