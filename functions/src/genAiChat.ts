import * as functions from 'firebase-functions';
import { genkit } from '@firebase/extensions-genkit';

export const genAiChat = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const { message, context: chatContext } = data;

  try {
    // Initialize GenKit
    const ai = genkit.init();

    // Create a chat prompt
    const prompt = `
      You are a helpful AI assistant for a luxury yacht booking platform.
      Context: ${chatContext}
      User message: ${message}

      Please provide a helpful, professional response regarding yacht bookings,
      focusing on package details, availability, and booking modifications.
      Keep responses concise and relevant to yacht rentals and luxury experiences.
    `;

    // Generate response using GenKit
    const response = await ai.generateText({
      prompt,
      temperature: 0.7,
      maxTokens: 200,
    });

    return { response };
  } catch (error) {
    console.error('GenKit AI Error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to process AI request',
      error
    );
  }
});
