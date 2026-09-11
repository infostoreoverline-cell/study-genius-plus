import { GoogleGenAI } from '@google/genai';

async function runSpike() {
  // We just instantiate the client and ensure we can form a request, without a real key
  try {
    const ai = new GoogleGenAI({ apiKey: 'dummy_key' });
    console.log('SDK Instantiated successfully');
    
    // Create a dummy payload
    const payload = {
      model: 'gemini-3.5-flash-lite',
      contents: 'Hello world'
    };
    
    console.log('Payload structure verified:', payload);
  } catch (e) {
    console.error('Error in SDK:', e);
  }
}

runSpike();
