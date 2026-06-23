import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { SEED_DATASET } from '../utils/qdrant-client';

export const searchNotesTool = createTool({
  id: 'search-notes',
  description: 'Search computer science study notes from the database',
  inputSchema: z.object({
    query: z.string().describe('Search query or question asked by the student'),
  }),
  outputSchema: z.object({
    results: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    console.log(`[searchNotesTool] Searching notes for: "${context.query}"`);
    const lowerQuery = context.query.toLowerCase();

    // Keyword-match against the built-in study notes dataset
    const matched = SEED_DATASET.filter((note) => {
      const words = lowerQuery.split(/\s+/).filter(w => w.length > 2);
      if (words.length === 0) return note.content.toLowerCase().includes(lowerQuery);
      return words.some(
        (word) =>
          note.content.toLowerCase().includes(word) ||
          note.topic.toLowerCase().includes(word)
      );
    });

    const results = matched.map((n) => `[Topic: ${n.topic}] ${n.content}`);
    console.log(`[searchNotesTool] Found ${results.length} matching notes.`);
    return {
      results: results.length ? results : ['No matching notes found for your query.'],
    };
  },
});