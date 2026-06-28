export async function POST() {
  return Response.json(
    {
      error:
        "Server-side import is disabled. This Cloudflare-only build imports Excel in the browser and stores data in localStorage.",
    },
    { status: 410 },
  );
}
