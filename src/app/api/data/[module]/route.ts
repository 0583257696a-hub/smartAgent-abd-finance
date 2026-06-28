import {
  createD1Row,
  deleteD1Row,
  importD1Rows,
  listD1Rows,
  resolvePublicConfig,
  updateD1Row,
} from "@/lib/d1";
import type { OpsRecord } from "@/lib/modules";

type RouteContext = {
  params: Promise<{ module: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { module } = await context.params;
  const config = resolvePublicConfig(module);
  if (!config) return Response.json({ error: "Unsupported module" }, { status: 404 });

  const rows = await listD1Rows(config, request);
  if (!rows) return Response.json({ error: "D1 binding OPS_DB is not configured" }, { status: 503 });

  return Response.json({ rows });
}

export async function POST(request: Request, context: RouteContext) {
  const { module } = await context.params;
  const config = resolvePublicConfig(module);
  if (!config) return Response.json({ error: "Unsupported module" }, { status: 404 });

  const body = (await request.json()) as { record?: OpsRecord; records?: OpsRecord[] };

  if (Array.isArray(body.records)) {
    const summary = await importD1Rows(config, body.records, request);
    if (!summary) return Response.json({ error: "D1 binding OPS_DB is not configured" }, { status: 503 });
    return Response.json(summary);
  }

  const row = await createD1Row(config, body.record ?? {}, request);
  if (!row) return Response.json({ error: "D1 binding OPS_DB is not configured" }, { status: 503 });

  return Response.json({ row });
}

export async function PUT(request: Request, context: RouteContext) {
  const { module } = await context.params;
  const config = resolvePublicConfig(module);
  if (!config) return Response.json({ error: "Unsupported module" }, { status: 404 });

  const body = (await request.json()) as { id?: string; record?: OpsRecord };
  if (!body.id) return Response.json({ error: "Missing id" }, { status: 400 });

  const row = await updateD1Row(config, body.id, body.record ?? {}, request);
  if (!row) return Response.json({ error: "D1 binding OPS_DB is not configured" }, { status: 503 });

  return Response.json({ row });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { module } = await context.params;
  const config = resolvePublicConfig(module);
  if (!config) return Response.json({ error: "Unsupported module" }, { status: 404 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const deleted = await deleteD1Row(config, id);
  if (!deleted) return Response.json({ error: "D1 binding OPS_DB is not configured" }, { status: 503 });

  return Response.json({ ok: true });
}
