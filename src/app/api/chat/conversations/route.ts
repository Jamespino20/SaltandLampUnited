import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convModel(): any | null {
  const p = prisma as unknown as Record<string, unknown>;
  if (typeof p.chatConversation !== "undefined") return p.chatConversation;
  // Prisma client without the new models (schema not yet migrated)
  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "sessionId is required" },
        { status: 400 }
      );
    }
    const model = convModel();
    if (!model) return NextResponse.json({ success: true, data: [] });
    const list = await model.findMany({
      where: { sessionId },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    // Defensive: prisma model may not exist yet
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, title } = body;
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "sessionId is required" },
        { status: 400 }
      );
    }
    const model = convModel();
    if (!model) {
      // Graceful fallback: return a transient id when DB model is missing
      return NextResponse.json({
        success: true,
        data: {
          id: `local-${Date.now()}`,
          sessionId,
          title: title ?? "New chat",
          transient: true,
        },
      });
    }
    const convo = await model.create({
      data: { sessionId, title: title ?? "New chat" },
    });
    return NextResponse.json({ success: true, data: convo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
