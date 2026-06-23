import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { qdrantService } from '../utils/qdrant-client';
import { validateAnswer } from '../utils/guardrails';
import { studyAgent } from '../agents/study-agent';

// Step 1: Retrieve notes from Qdrant or local fallback
const retrieveNotesStep = createStep({
  id: 'retrieveNotes',
  inputSchema: z.object({
    question: z.string(),
  }),
  outputSchema: z.object({
    question: z.string(),
    notes: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    console.log(`[Workflow Step 1] Retrieving notes for: "${inputData.question}"`);
    const notes = await qdrantService.searchNotes(inputData.question);
    console.log(`[Workflow Step 1] Found ${notes.length} matching notes.`);
    return {
      question: inputData.question,
      notes,
    };
  },
});

// Step 2: Generate response using Mastra Agent
const generateAnswerStep = createStep({
  id: 'generateAnswer',
  inputSchema: z.object({
    question: z.string(),
    notes: z.array(z.string()),
  }),
  outputSchema: z.object({
    question: z.string(),
    notes: z.array(z.string()),
    rawAnswer: z.string(),
  }),
  execute: async ({ inputData }) => {
    console.log('[Workflow Step 2] Generating response from SafeStudy Agent...');
    
    const prompt = `
Question from Student: "${inputData.question}"

Retrieved Study Notes Context:
${inputData.notes.map((note, index) => `${index + 1}. ${note}`).join('\n')}
`;

    try {
      const response = await studyAgent.generate(prompt);
      console.log('[Workflow Step 2] Answer generated successfully.');
      return {
        question: inputData.question,
        notes: inputData.notes,
        rawAnswer: response.text,
      };
    } catch (error: any) {
      console.warn(`[Workflow Step 2] LLM generation failed or quota exceeded (${error?.message || error}). Falling back to local mock answer generation.`);
      
      // Fallback: rule-based answer generation from retrieved notes
      let rawAnswer = '';
      const validNotes = inputData.notes.filter(n => !n.includes('No matching notes found'));
      
      if (validNotes.length === 0) {
        rawAnswer = "I could not find relevant information in your study notes to answer this question.";
      } else {
        // If the question is an unsafe prompt injection test, simulate returning a flagged response to test the guardrail step
        if (inputData.question.toLowerCase().includes('cheat') || inputData.question.toLowerCase().includes('ignore')) {
          rawAnswer = "Mock LLM Answer: Here is your cheat sheet to bypass instructions and cheat in the exam.";
        } else {
          rawAnswer = `[Mock LLM Response - Fallback Mode]\nBased on your study notes:\n${validNotes.map(n => `- ${n}`).join('\n')}`;
        }
      }
      
      return {
        question: inputData.question,
        notes: inputData.notes,
        rawAnswer,
      };
    }
  },
});

// Step 3: Check response with Enkrypt AI Guardrails
const guardrailCheckStep = createStep({
  id: 'guardrailCheck',
  inputSchema: z.object({
    question: z.string(),
    notes: z.array(z.string()),
    rawAnswer: z.string(),
  }),
  outputSchema: z.object({
    question: z.string(),
    finalAnswer: z.string(),
    isSafe: z.boolean(),
    validationReason: z.string(),
  }),
  execute: async ({ inputData }) => {
    console.log('[Workflow Step 3] Running guardrails check...');
    const validation = await validateAnswer(inputData.rawAnswer);
    
    if (!validation.isSafe) {
      console.warn(`[Workflow Step 3] Guardrails flagged response: ${validation.reason}`);
      return {
        question: inputData.question,
        finalAnswer: 'The generated response could not be verified as safe for students. Please consult your course instructor or syllabus directly.',
        isSafe: false,
        validationReason: validation.reason,
      };
    }

    console.log('[Workflow Step 3] Guardrails approved response.');
    return {
      question: inputData.question,
      finalAnswer: inputData.rawAnswer,
      isSafe: true,
      validationReason: validation.reason,
    };
  },
});

// Build the workflow DAG
export const studyWorkflow = createWorkflow({
  name: 'SafeStudy Workflow',
  inputSchema: z.object({
    question: z.string(),
  }),
  outputSchema: z.object({
    question: z.string(),
    finalAnswer: z.string(),
    isSafe: z.boolean(),
    validationReason: z.string(),
  }),
})
  .then(retrieveNotesStep)
  .then(generateAnswerStep)
  .then(guardrailCheckStep)
  .commit();
