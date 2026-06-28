const OLLAMA_ENDPOINT = 'http://127.0.0.1:3456';

class OllamaAPI {
  async getRecommendations(reference, type, platforms, genre, yearMin, ratingMin, candidates) {
    const response = await fetch(`${OLLAMA_ENDPOINT}/api/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference,
        type,
        platforms,
        genre,
        yearMin,
        ratingMin,
        candidates,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Error de conexión' }));
      const msg = err.error || `HTTP ${response.status}`;
      if (response.status === 500 && msg.includes('Ollama')) {
        throw new Error(msg);
      }
      throw new Error(msg);
    }

    return response.json();
  }

  async health() {
    try {
      const response = await fetch(`${OLLAMA_ENDPOINT}/health`, { signal: AbortSignal.timeout(3000) });
      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    }
  }
}

export const ollamaAPI = new OllamaAPI();
