/**
 * Next.js Instrumentation
 * This file runs once when the server starts
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Subscribe to job progress updates from Python worker
    const { subscribeToJobProgress } = await import('./lib/job-progress');
    subscribeToJobProgress();
    
    console.log('[Instrumentation] Job progress listener registered');
  }
}


