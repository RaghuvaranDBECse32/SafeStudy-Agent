import { Agent } from '@mastra/core/agent';
import { google } from '@ai-sdk/google';
import { searchNotesTool } from '../tools/search-notes';

export const studyAgent = new Agent({
  id: 'study-agent',
  name: 'SafeStudy Agent',
  instructions: `
You are a helpful and concise computer science study learning assistant.

Your workflow:
1. When asked a CS question by the student, call the searchNotesTool to retrieve relevant course study notes.
2. Formulate your response strictly using the facts contained within the retrieved study notes.
3. If the retrieved notes do not contain information related to the user's question, clearly state: "I could not find relevant information in your study notes to answer this question."
4. Always keep your response clear, helpful, and concise.
`,
  model: google('gemini-2.0-flash'),
  tools: { searchNotesTool },
});