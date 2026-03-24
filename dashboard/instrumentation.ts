export async function register() {
  // Only run on the server, not during build
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/memory/scheduler");
    try {
      await startScheduler();
    } catch (err) {
      console.error("[Instrumentation] Failed to start scheduler:", err);
    }
  }
}
