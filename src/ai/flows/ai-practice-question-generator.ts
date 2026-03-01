'use server';
/**
 * @fileOverview This file implements a Genkit flow for generating practice questions.
 *
 * - generatePracticeQuestions - A function that handles the generation of practice questions.
 * - AIPracticeQuestionGeneratorInput - The input type for the generatePracticeQuestions function.
 * - AIPracticeQuestionGeneratorOutput - The return type for the generatePracticeQuestions function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AIPracticeQuestionGeneratorInputSchema = z.object({
  topic: z.string().describe('The specific topic or concept for which to generate practice questions.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium').describe('The desired difficulty level of the questions.'),
  numberOfQuestions: z.number().int().min(1).max(10).default(5).describe('The number of practice questions to generate (between 1 and 10).'),
  questionType: z.enum(['multiple choice', 'true/false', 'short answer']).default('multiple choice').describe('The type of questions to generate.'),
});
export type AIPracticeQuestionGeneratorInput = z.infer<typeof AIPracticeQuestionGeneratorInputSchema>;

const QuestionSchema = z.object({
  question: z.string().describe('The text of the practice question.'),
  options: z.array(z.string()).optional().describe('An array of possible answer options for multiple-choice or true/false questions. Omitted for short answer questions.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
});

const AIPracticeQuestionGeneratorOutputSchema = z.object({
  practiceQuestions: z.array(QuestionSchema).describe('A list of generated practice questions.'),
});
export type AIPracticeQuestionGeneratorOutput = z.infer<typeof AIPracticeQuestionGeneratorOutputSchema>;

export async function generatePracticeQuestions(input: AIPracticeQuestionGeneratorInput): Promise<AIPracticeQuestionGeneratorOutput> {
  return aiPracticeQuestionGeneratorFlow(input);
}

const aiPracticeQuestionGeneratorPrompt = ai.definePrompt({
  name: 'aiPracticeQuestionGeneratorPrompt',
  input: { schema: AIPracticeQuestionGeneratorInputSchema },
  output: { schema: AIPracticeQuestionGeneratorOutputSchema },
  prompt: `Generate {{{numberOfQuestions}}} {{{difficulty}}} {{{questionType}}} practice questions on the topic of "{{{topic}}}".

For 'multiple choice' questions, provide 4 options and indicate the 'correctAnswer'.
For 'true/false' questions, provide 'true' and 'false' as options and indicate the 'correctAnswer'.
For 'short answer' questions, only provide the 'question' and the 'correctAnswer', omitting the 'options' field.

Ensure the output is in a JSON format that strictly adheres to the provided schema definition.`,
});

const aiPracticeQuestionGeneratorFlow = ai.defineFlow(
  {
    name: 'aiPracticeQuestionGeneratorFlow',
    inputSchema: AIPracticeQuestionGeneratorInputSchema,
    outputSchema: AIPracticeQuestionGeneratorOutputSchema,
  },
  async (input) => {
    const { output } = await aiPracticeQuestionGeneratorPrompt(input);
    return output!;
  }
);
