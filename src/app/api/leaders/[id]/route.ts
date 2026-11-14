import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requirePermission } from "@/lib/api-auth";
import { logAudit, AUDIT_ACTIONS } from "@/lib/audit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function leaderModel(): any {
  return (prisma as unknown as Record<string, unknown>).leader as never;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const leader = await leaderModel().findUnique({ where: { id } });
    if (!leader) {
      return NextResponse.json(
        { success: false, error: "Leader not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: leader });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch leader" },
      { status: 500 }
    );
  }
}

async function updateLeader(request: Request, id: string) {
  const authResult = await requireSession();
  if (authResult instanceof NextResponse) return authResult;

  const permError = await requirePermission(authResult.session, "groups:update");
  if (permError) return permError;

  try {
    const body = await request.json();
    const { name, role, description, imageUrl, section, order } = body;

    if (section !== undefined && section !== "organization" && section !== "circle") {
      return NextResponse.json(
        { success: false, error: "Section must be 'organization' or 'circle'" },
        { status: 400 }
      );
    }

    const leader = await leaderModel().update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(section !== undefined && { section }),
        ...(order !== undefined && {
          order: order === null || order === "" ? 0 : Number(order),
        }),
      },
    });

    await logAudit(
      authResult.session,
      {
        action: AUDIT_ACTIONS.UPDATE,
        targetTable: "leader",
        targetId: id,
      },
      request
    );

    return NextResponse.json({ success: true, data: leader });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to update leader" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return updateLeader(request, id);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return updateLeader(request, id);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSession();
  if (authResult instanceof NextResponse) return authResult;

  const permError = await requirePermission(authResult.session, "groups:delete");
  if (permError) return permError;

  const { id } = await params;
  try {
    await leaderModel().delete({ where: { id } });
    await logAudit(
      authResult.session,
      {
        action: AUDIT_ACTIONS.DELETE,
        targetTable: "leader",
        targetId: id,
      },
      request
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to delete leader" },
      { status: 500 }
    );
  }
}
