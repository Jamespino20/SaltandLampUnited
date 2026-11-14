import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { logAudit, AUDIT_ACTIONS } from "@/lib/audit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function leaderModel(): any {
  return (prisma as unknown as Record<string, unknown>).leader as never;
}

export async function GET() {
  try {
    const model = leaderModel();
    if (!model || typeof model.findMany !== "function") {
      return NextResponse.json({ success: true, data: [] });
    }
    const leaders = await model.findMany({
      orderBy: [{ section: "asc" }, { order: "asc" }],
    });
    return NextResponse.json({ success: true, data: leaders });
  } catch {
    // prisma model Leader may not exist yet — return empty array
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(request: Request) {
  const authResult = await requireSession();
  if (authResult instanceof NextResponse) return authResult;

  const permError = await requirePermission(authResult.session, "groups:create");
  if (permError) return permError;

  try {
    const body = await request.json();
    const { name, role, description, imageUrl, section, order } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }
    if (!role) {
      return NextResponse.json(
        { success: false, error: "Role is required" },
        { status: 400 }
      );
    }
    if (!section || (section !== "organization" && section !== "circle")) {
      return NextResponse.json(
        { success: false, error: "Section must be 'organization' or 'circle'" },
        { status: 400 }
      );
    }

    const leader = await leaderModel().create({
      data: {
        name,
        role,
        description: description ?? null,
        imageUrl: imageUrl ?? null,
        section,
        order: order !== undefined && order !== null && order !== "" ? Number(order) : 0,
      },
    });

    await logAudit(
      authResult.session,
      {
        action: AUDIT_ACTIONS.CREATE,
        targetTable: "leader",
        targetId: leader.id,
      },
      request
    );

    return NextResponse.json({ success: true, data: leader }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to create leader" },
      { status: 500 }
    );
  }
}
