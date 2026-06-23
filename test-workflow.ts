import 'dotenv/config';
import { studyWorkflow } from './src/mastra/workflows/study-workflow.js';

const run = async () => {
  try {
    const result = await studyWorkflow.execute({ triggerData: { question: "What is normalization in DBMS?" } });
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Workflow error:', err);
  }
};

run();
