export async function GET() {
  try {
    const { auth } = await import("../../../lib/auth");
    return Response.json({ loaded: true, hasAuth: !!auth });
  } catch (err: any) {
    return Response.json(
      { loaded: false, error: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}