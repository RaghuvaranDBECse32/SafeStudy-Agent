import { Mastra } from '@mastra/core';
import { studyAgent } from './agents/study-agent';
import { studyWorkflow } from './workflows/study-workflow';

export const mastra = new Mastra({
  agents: { studyAgent },
  workflows: { studyWorkflow },
});