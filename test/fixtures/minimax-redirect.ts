// Loaded into the real engine by tests (node --import): its MiniMax requests (engine/asset_reel.mjs m3Request, an https.request to
// api.minimax.io) go to the fake server at FAKE_MINIMAX_URL (fake-minimax.ts); any other https request or fetch throws, so a test
// run never reaches a real service or spends anything.
import http from 'node:http';
import https from 'node:https';

const fake = process.env['FAKE_MINIMAX_URL'];
if (fake === undefined) throw new Error('FAKE_MINIMAX_URL is not set');
const target: string = fake;

const request = (
  url: string | URL,
  options: http.RequestOptions,
  callback?: (res: http.IncomingMessage) => void,
): http.ClientRequest => {
  if (!String(url).startsWith('https://api.minimax.io/'))
    throw new Error(`no network in tests: ${String(url)}`);
  return http.request(target, options, callback);
};
Object.defineProperty(https, 'request', { value: request });
Object.defineProperty(globalThis, 'fetch', {
  value: (input: unknown) => Promise.reject(new Error(`no network in tests: ${String(input)}`)),
});
