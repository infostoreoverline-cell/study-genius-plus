export class SimulatedProvider {
  async executeTask(kind: string, inputHash: string, onProgress: (msg: string) => void): Promise<{ success: boolean; result?: string; error?: string }> {
    onProgress(`Starting task of kind: ${kind}`);
    
    // Simulate some work
    await new Promise(res => setTimeout(res, 500));
    
    // Introduce random retryable error 20% of the time to test resilience
    if (Math.random() < 0.2) {
      onProgress('Simulated retryable error occurred');
      return { success: false, error: 'Provider overloaded (simulated 429)' };
    }

    onProgress(`Processing...`);
    await new Promise(res => setTimeout(res, 500));

    onProgress(`Task completed successfully.`);
    return { success: true, result: `Result for ${kind} with hash ${inputHash.substring(0, 8)}` };
  }
}
