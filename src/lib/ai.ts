export interface AIProvider {
  id: string;
  name: string;
  defaultModel: string;
  defaultBaseURL: string;
  apiFormat: 'anthropic' | 'openai';
}

export const PROVIDERS: AIProvider[] = [
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    defaultModel: 'claude-sonnet-4-6',
    defaultBaseURL: '',
    apiFormat: 'anthropic',
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT)',
    defaultModel: 'gpt-4o',
    defaultBaseURL: 'https://api.openai.com/v1',
    apiFormat: 'openai',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    defaultBaseURL: 'https://api.deepseek.com/v1',
    apiFormat: 'openai',
  },
  {
    id: 'qwen',
    name: '通义千问 (Qwen)',
    defaultModel: 'qwen-plus',
    defaultBaseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiFormat: 'openai',
  },
  {
    id: 'zhipu',
    name: '智谱 (GLM)',
    defaultModel: 'glm-4-flash',
    defaultBaseURL: 'https://open.bigmodel.cn/api/paas/v4',
    apiFormat: 'openai',
  },
  {
    id: 'moonshot',
    name: 'Moonshot (Kimi)',
    defaultModel: 'moonshot-v1-8k',
    defaultBaseURL: 'https://api.moonshot.cn/v1',
    apiFormat: 'openai',
  },
  {
    id: 'custom',
    name: '自定义接口',
    defaultModel: '',
    defaultBaseURL: '',
    apiFormat: 'openai',
  },
];

export interface AIConfig {
  provider: string;
  apiKey: string;
  model: string;
  baseURL: string;
}

export function getAIConfig(): AIConfig {
  return {
    provider: localStorage.getItem('donelist_ai_provider') || 'anthropic',
    apiKey: localStorage.getItem('donelist_ai_key') || '',
    model: localStorage.getItem('donelist_ai_model') || '',
    baseURL: localStorage.getItem('donelist_ai_base_url') || '',
  };
}

export function saveAIConfig(config: AIConfig) {
  localStorage.setItem('donelist_ai_provider', config.provider);
  if (config.apiKey) localStorage.setItem('donelist_ai_key', config.apiKey);
  else localStorage.removeItem('donelist_ai_key');
  localStorage.setItem('donelist_ai_model', config.model);
  localStorage.setItem('donelist_ai_base_url', config.baseURL);
}

/** Get the effective config with defaults from provider definition */
export function getEffectiveConfig(): AIConfig {
  const config = getAIConfig();
  const provider = PROVIDERS.find((p) => p.id === config.provider);
  return {
    ...config,
    model: config.model || provider?.defaultModel || '',
    baseURL: config.baseURL || provider?.defaultBaseURL || '',
  };
}

/**
 * Stream a chat completion. Returns an async generator of text deltas.
 * Handles both Anthropic native and OpenAI-compatible formats.
 */
export async function* streamChat(
  systemPrompt: string,
  userMessage: string,
  onError?: (err: string) => void,
): AsyncGenerator<string> {
  const config = getEffectiveConfig();
  if (!config.apiKey) {
    onError?.('请先在设置页面配置 API Key');
    return;
  }

  if (config.provider === 'anthropic') {
    // Use Anthropic SDK for native streaming
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: config.apiKey, dangerouslyAllowBrowser: true });
    const stream = client.messages.stream({
      model: config.model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  } else {
    // OpenAI-compatible API format
    const baseURL = config.baseURL.replace(/\/$/, '');
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 2048,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `API 错误 (${response.status})`;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.error?.message || errMsg;
      } catch {}
      onError?.(errMsg);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) { onError?.('无法读取响应流'); return; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {}
      }
    }
  }
}
