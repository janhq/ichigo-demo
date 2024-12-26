import PQueue from 'p-queue';

export const queue = new PQueue({ concurrency: 1 });

export const fetchTTS = async (messageId: string, text: string) => {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      body: JSON.stringify({
        text: text,
        reference_id: messageId,
        normalize: true,
        format: 'wav',
        latency: 'balanced',
        max_new_tokens: 2048,
        chunk_length: 200,
        repetition_penalty: 1.5,
      }),
    });
    return await response.blob();
  } catch (error) {
    console.error('Error fetching TTS audio:', error);
    throw error;
  }
};
