export async function GET(request: Request) {
  return Response.json({ caught: true, url: request.url });
}