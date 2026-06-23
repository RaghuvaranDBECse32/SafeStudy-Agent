import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { qdrantService } from './mastra/utils/qdrant-client.js';
import { validateAnswer } from './mastra/utils/guardrails.js';
import { studyAgent } from './mastra/agents/study-agent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// Auto-seed the mock Qdrant database on startup so keywords work
qdrantService.seedNotes().then(() => {
  console.log('[SafeStudy AppBot] Local database seeded with CS study notes keywords.');
}).catch(console.error);

// Chat API Endpoint
app.post('/api/chat', async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  try {
    console.log(`[AppBot API] Received question: "${question}"`);
    
    // Quick check for greetings
    const lowerQ = question.toLowerCase().trim();
    if (lowerQ === 'hi' || lowerQ === 'hello' || lowerQ === 'hey') {
      return res.json({
        answer: "Welcome to the SafeStudy platform! I'm your Mastra Agent connected to your Computer Science notes. Feel free to ask me anything about DBMS, Operating Systems, or Networks!",
        isSafe: true,
        reason: "Standard greeting",
        notesUsed: []
      });
    }

    // Step 1: Search Qdrant notes
    const notes = await qdrantService.searchNotes(question);
    
    // Step 2: Generate response using SafeStudy Agent
    const prompt = `
Question from Student: "${question}"

Retrieved Study Notes Context:
${notes.map((note: string, index: number) => `${index + 1}. ${note}`).join('\n')}
`;
    
    let rawAnswer = '';
    try {
      const response = await studyAgent.generate(prompt);
      rawAnswer = response.text;
    } catch (llmError: any) {
      console.warn(`[AppBot API] LLM failed, using fallback. Error: ${llmError.message}`);
      const validNotes = notes.filter((n: string) => !n.includes('No matching notes found'));
      if (validNotes.length === 0) {
        rawAnswer = "I could not find relevant information in your study notes to answer this question.";
      } else if (lowerQ.includes('cheat') || lowerQ.includes('ignore')) {
        rawAnswer = "Mock LLM Answer: Here is your cheat sheet to bypass instructions and cheat in the exam.";
      } else {
        rawAnswer = `[Mock LLM Response - Fallback Mode]\nBased on your study notes:\n${validNotes.map((n: string) => `- ${n}`).join('\n')}`;
      }
    }
    
    // Step 3: Run Guardrails
    const validation = await validateAnswer(rawAnswer);
    
    res.json({
      answer: validation.isSafe ? rawAnswer : 'The generated response could not be verified as safe for students. Please consult your course instructor or syllabus directly.',
      isSafe: validation.isSafe,
      reason: validation.reason,
      notesUsed: notes
    });
  } catch (error) {
    console.error('[AppBot API] Error executing agent:', error);
    res.status(500).json({ error: 'Internal server error while processing the question.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[SafeStudy AppBot] Server running on http://localhost:${PORT}`);
});
