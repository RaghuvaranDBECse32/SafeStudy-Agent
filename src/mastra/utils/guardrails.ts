export interface GuardrailResult {
  isSafe: boolean;
  reason: string;
}

export async function validateAnswer(text: string): Promise<GuardrailResult> {
  const apiKey = process.env.ENKRYPTAI_API_KEY;

  if (!apiKey || apiKey === 'your_enkryptai_api_key_here') {
    console.log('[Enkrypt AI Mock] No ENKRYPTAI_API_KEY detected. Using local mock safety guardrails.');
    return runMockGuardrail(text);
  }

  try {
    console.log('[Enkrypt AI] Sending response to Enkrypt AI Guardrails for verification...');
    const response = await fetch('https://api.enkryptai.com/guardrails/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        text,
        detectors: {
          toxicity: { enabled: true },
          nsfw: { enabled: true },
          injection_attack: { enabled: true },
          policy_violation: { enabled: true },
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Enkrypt AI] API returned status ${response.status}: ${errText}. Falling back to mock guardrails.`);
      return runMockGuardrail(text);
    }

    const data: any = await response.json();
    console.log('[Enkrypt AI] Response received:', JSON.stringify(data));

    // Analyze the Enkrypt AI response structure
    // If any detectors triggered issues in summary or if compliance mapping indicates issues
    const summary = data.summary || {};
    const details = data.details || {};

    const toxicityViolated = Array.isArray(summary.toxicity) && summary.toxicity.length > 0;
    const nsfwViolated = summary.nsfw === 1 || (typeof summary.nsfw === 'number' && summary.nsfw > 0);
    const injectionViolated = summary.injection_attack === 1 || (typeof summary.injection_attack === 'number' && summary.injection_attack > 0);
    const policyViolated = summary.policy_violation === 1 || (typeof summary.policy_violation === 'number' && summary.policy_violation > 0);

    if (toxicityViolated || nsfwViolated || injectionViolated || policyViolated) {
      const violations: string[] = [];
      if (toxicityViolated) violations.push(`Toxicity (${summary.toxicity.join(', ')})`);
      if (nsfwViolated) violations.push('NSFW content');
      if (injectionViolated) violations.push('Prompt Injection attempt');
      if (policyViolated) violations.push('Policy Violation');

      return {
        isSafe: false,
        reason: `Enkrypt AI flagged: ${violations.join(', ')}`,
      };
    }

    return {
      isSafe: true,
      reason: 'Approved by Enkrypt AI Guardrails.',
    };
  } catch (error) {
    console.error('[Enkrypt AI] Error connecting to Enkrypt AI. Falling back to local mock:', error);
    return runMockGuardrail(text);
  }
}

function runMockGuardrail(text: string): GuardrailResult {
  const lowerText = text.toLowerCase();

  // Define some common test strings to trigger safety checks for the hackathon MVP
  const blockWords = [
    'bypass instructions',
    'ignore previous instructions',
    'ignore all rules',
    'system prompt',
    'cheat sheet',
    'hack the exam',
    'generate answer key',
    'steal answers',
    'toxic_test_phrase',
    'injection_test_phrase'
  ];

  for (const word of blockWords) {
    if (lowerText.includes(word)) {
      return {
        isSafe: false,
        reason: `Local Guardrail Mock Flagged: Unsafe keywords or injection indicators detected ("${word}").`,
      };
    }
  }

  // Basic check for extreme toxicity / swear words simulation
  if (lowerText.includes('hate') && (lowerText.includes('kill') || lowerText.includes('destroy'))) {
    return {
      isSafe: false,
      reason: 'Local Guardrail Mock Flagged: High risk or abusive sentiment detected.',
    };
  }

  return {
    isSafe: true,
    reason: 'Approved by local mock safety guardrails.',
  };
}
