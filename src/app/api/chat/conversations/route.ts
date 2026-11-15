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
      where: { sessionId, deletedAt: null },
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

function clientIp(request: Request): string | undefined {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  return real?.trim() || undefined;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, title, messages } = body;
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
    const data: Record<string, unknown> = {
      sessionId,
      title: title ?? "New chat",
      ipAddress: clientIp(request),
    };
    if (Array.isArray(messages) && messages.length > 0) {
      data.messages = {
        create: messages
          .filter(
            (m: { role?: string; content?: string }) =>
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string" &&
              m.content.length > 0
          )
          .map(
            (m: {
              role: string;
              content: string;
              modelUsed?: string;
              complexity?: string;
            }) => ({
              role: m.role,
              content: m.content,
              modelUsed: m.modelUsed,
              complexity: m.complexity,
            })
          ),
      };
    }
    const convo = await model.create({ data });
    return NextResponse.json({ success: true, data: convo });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
