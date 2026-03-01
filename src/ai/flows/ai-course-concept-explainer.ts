'use server';
/**
 * @fileOverview An AI educational assistant to explain complex concepts from course materials.
 *
 * - explainCourseConcept - A function that handles explaining a course concept.
 * - AICourseConceptExplainerInput - The input type for the explainCourseConcept function.
 * - AICourseConceptExplainerOutput - The return type for the explainCourseConcept function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AICourseConceptExplainerInputSchema = z.object({
  concept: z.string().describe('The complex concept to be explained.'),
  courseMaterial: z
    .string()
    .optional()
    .describe('Optional: Relevant course material text for context.'),
});
export type AICourseConceptExplainerInput = z.infer<
  typeof AICourseConceptExplainerInputSchema
>;

const AICourseConceptExplainerOutputSchema = z.object({
  explanation: z
    .string()
    .describe(
      'A simplified explanation of the concept, breaking down complex ideas into understandable terms.'
    ),
  examples: z
    .array(z.string())
    .describe('An array of clear and relatable examples to illustrate the concept.'),
});
export type AICourseConceptExplainerOutput = z.infer<
  typeof AICourseConceptExplainerOutputSchema
>;

export async function explainCourseConcept(
  input: AICourseConceptExplainerInput
): Promise<AICourseConceptExplainerOutput> {
  return aiCourseConceptExplainerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiCourseConceptExplainerPrompt',
  input: {schema: AICourseConceptExplainerInputSchema},
  output: {schema: AICourseConceptExplainerOutputSchema},
  prompt: `You are an educational assistant. Your goal is to help students understand complex concepts by explaining them in simpler terms and providing clear examples.

Here is the concept the student wants to understand: {{{concept}}}

{{#if courseMaterial}}
Here is some additional course material for context:
"""
{{{courseMaterial}}}
"""
{{/if}}

Please provide a simplified explanation of the concept and then generate a list of 2-3 distinct, easy-to-understand examples. The explanation should avoid jargon where possible, or clearly define it.
`,
});

const aiCourseConceptExplainerFlow = ai.defineFlow(
  {
    name: 'aiCourseConceptExplainerFlow',
    inputSchema: AICourseConceptExplainerInputSchema,
    outputSchema: AICourseConceptExplainerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to get output from prompt.');
    }
    return output;
  }
);
