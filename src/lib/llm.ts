export type LlmMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type LlmOptions = {
  temperature?: number;
  maxTokens?: number;
  model?: string;
};

const getProvider = () => {
  const groqKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
  const openrouterKey = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;
  if (groqKey) return { provider: 'groq' as const, apiKey: groqKey };
  if (openrouterKey) return { provider: 'openrouter' as const, apiKey: openrouterKey };
  return { provider: null as const, apiKey: undefined };
};

export const generateWithLlama = async (messages: LlmMessage[], options: LlmOptions = {}): Promise<string> => {
  const { provider, apiKey } = getProvider();
  if (!provider || !apiKey) {
    console.warn('No LLM API key found. Set VITE_GROQ_API_KEY or VITE_OPENROUTER_API_KEY');
    return "I'm here to help with Loadshare logistics. Ask me about orders, riders, or hubs.";
  }

  const temperature = options.temperature ?? 0.2;
  const maxTokens = options.maxTokens ?? 512;

  if (provider === 'groq') {
    const model = options.model ?? 'llama-3.1-70b-versatile';
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages
      })
    });
    if (!resp.ok) {
      console.error('Groq API error', await resp.text());
      throw new Error('LLM request failed');
    }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  // openrouter
  const model = options.model ?? 'meta-llama/llama-3.1-70b-instruct';
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Loadshare Assistant'
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages
    })
  });
  if (!resp.ok) {
    console.error('OpenRouter API error', await resp.text());
    throw new Error('LLM request failed');
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? '';
};
