export default async (request, context) => {
  const response = await context.next()
  if (response.status !== 404) return response
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'no-cache')
  return new Response(response.body, { status: 404, statusText: response.statusText, headers })
}

export const config = { path: '/assets/*' }
