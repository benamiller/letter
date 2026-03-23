// Helper: call a SvelteKit route handler and convert thrown HttpErrors to Response-like objects
export async function callHandler(fn: (event: any) => Promise<Response>, event: any): Promise<Response> {
  try {
    return await fn(event);
  } catch (e: any) {
    if (e?.status && e?.body) {
      return new Response(JSON.stringify(e.body), {
        status: e.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    throw e;
  }
}
