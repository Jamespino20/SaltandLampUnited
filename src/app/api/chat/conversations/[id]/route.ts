import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function models(): { conv: any | null; msg: any | null } {
  const p = prisma as unknown as Record<string, unknown>;
  return {
    conv: typeof p.chatConversation !== "undefined" ? p.chatConversation : null,
    msg: typeof p.chatMessage !== "undefined" ? p.chatMessage : null,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { conv } = models();
    if (!conv) return NextResponse.json({ success: true, data: null });
    const convo = await conv.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!convo) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: convo });
  } catch {
    return NextResponse.json({ success: true, data: null });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { conv } = models();
    if (!conv) return NextResponse.json({ success: true, data: null });
    await conv.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
