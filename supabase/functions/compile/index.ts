import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

const allowedOrigins = (Deno.env.get('APP_ORIGINS') ?? Deno.env.get('APP_ORIGIN') ?? '')
  .split(',').map(origin => origin.trim()).filter(Boolean);
const endpoint = 'https://api.onlinecompiler.io/api/run-code-sync/';
const encoder = new TextEncoder();
const maxRequestBytes = 400_000;
const maxStreamLength = 50_000;

type ProviderResult = {
  output: string;
  error: string;
  exit_code: number;
  truncated: boolean;
};

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin');
  const allowedOrigin = origin && allowedOrigins.includes(origin);
  const cors = {
    ...(allowedOrigin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  const respond = (body: object, status = 200) => Response.json(body, {
    status,
    headers: { ...cors, 'Cache-Control': 'no-store' },
  });

  if (origin && !allowedOrigin) return respond({ error: 'Origin not permitted.' }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return respond({ error: 'Use POST.' }, 405);

  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return respond({ error: 'Sign in to run code.' }, 401);

  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: 'Bearer ' + token } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data: { user }, error: authError } = await client.auth.getUser(token);
  if (authError || !user || user.is_anonymous) return respond({ error: 'Sign in to run code.' }, 401);

  const key = Deno.env.get('COMPILER_API_KEY');
  if (!key) return respond({ error: 'Live execution needs an OnlineCompiler API key. You can still edit and download your code.' }, 503);

  if (Number(request.headers.get('content-length')) > maxRequestBytes) {
    return respond({ error: 'Request too large.' }, 413);
  }

  let payload: { code?: unknown; stdin?: unknown } | null;
  try {
    const reader = request.body?.getReader();
    const decoder = new TextDecoder();
    let raw = '';
    let bytes = 0;
    if (reader) {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxRequestBytes) {
          await reader.cancel();
          return respond({ error: 'Request too large.' }, 413);
        }
        raw += decoder.decode(value, { stream: true });
      }
    }
    payload = JSON.parse(raw + decoder.decode());
  } catch {
    return respond({ error: 'Invalid JSON request.' }, 400);
  }

  const { code, stdin = '' } = payload ?? {};
  if (typeof code !== 'string' || !code.trim() || encoder.encode(code).byteLength > 50_000 ||
      typeof stdin !== 'string' || encoder.encode(stdin).byteLength > 10_000) {
    return respond({ error: 'Provide up to 50 KB of C++ code and 10 KB of input.' }, 400);
  }

  const { data: allowed, error: limitError } = await client.rpc('claim_compiler_run');
  if (limitError) return respond({ error: 'The execution service is temporarily unavailable.' }, 503);
  if (!allowed) return respond({ error: 'You have reached 10 runs this minute. Try again shortly.' }, 429);

  try {
    const provider = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ compiler: 'g++-15', code, input: stdin, time_limit: 5 }),
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    if (provider.status === 429) return respond({ error: 'OnlineCompiler is busy. Try again shortly.' }, 503);
    if (!provider.ok) return respond({ error: 'OnlineCompiler rejected the request. Try again shortly.' }, 502);

    const result: ProviderResult = await provider.json();
    if (typeof result?.output !== 'string' || typeof result.error !== 'string' || !Number.isInteger(result.exit_code)) {
      return respond({ error: 'OnlineCompiler returned an unexpected response.' }, 502);
    }

    const output = [result.output.slice(0, maxStreamLength), result.error.slice(0, maxStreamLength)];
    if (result.exit_code === 124) output.push('Program timed out.');
    else if (result.exit_code !== 0) output.push('Program exited with code ' + result.exit_code + '.');
    if (result.truncated || result.output.length > maxStreamLength || result.error.length > maxStreamLength) {
      output.push('Output was truncated.');
    }
    return respond({ output: output.filter(Boolean).join('\n') });
  } catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError'
      ? 'OnlineCompiler did not respond in time. Try again shortly.'
      : 'Could not reach OnlineCompiler. Try again shortly.';
    return respond({ error: message }, 502);
  }
});
