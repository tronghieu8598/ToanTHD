import {handleApi} from '../../../lib/api';
export const dynamic='force-dynamic';
export const GET=handleApi;
export const POST=handleApi;
export async function HEAD(request: Request) {
  if (new URL(request.url).pathname === '/api/teacher/library/file') {
    const response = await handleApi(request);
    return new Response(null, {status: response.status, headers: response.headers});
  }
  const response = await handleApi(new Request(request, {method: 'GET'}));
  return new Response(null, {status: response.status, headers: response.headers});
}
