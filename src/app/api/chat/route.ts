import { NextResponse } from "next/server";
import { chatWithSLUFull } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
import { ChatMessage } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, sessionId, conversationId } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Messages array is required" },
        { status: 400 }
      );
    }

    const validMessages: ChatMessage[] = messages.map(
      (m: { role: string; content: string }) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })
    );

    const result = await chatWithSLUFull(validMessages);

    // Persist if a conversationId was supplied (defensive: models may not exist yet).
    if (conversationId && typeof conversationId === "string" && !conversationId.startsWith("local-")) {
      try {
        const p = prisma as unknown as Record<string, unknown>;
        const msgModel = p.chatMessage as
          | { create: (args: unknown) => Promise<unknown> }
          | undefined;
        if (msgModel) {
          const lastUser = [...validMessages]
            .reverse()
            .find((m) => m.role === "user");
          if (lastUser) {
            await msgModel.create({
              data: {
                conversationId,
                role: "user",
                content: lastUser.content,
              },
            });
          }
          await msgModel.create({
            data: {
              conversationId,
              role: "assistant",
              content: result.text,
            },
          });
          const convModel = p.chatConversation as
            | { update: (args: unknown) => Promise<unknown> }
            | undefined;
          if (convModel) {
            const titleSeed = lastUser?.content.slice(0, 60) ?? "New chat";
            await convModel.update({
              where: { id: conversationId },
              data: { updatedAt: new Date(), title: titleSeed },
            });
          }
        }
        void sessionId;
      } catch {
        // Persistence is best-effort; never fail the chat response.
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        role: "assistant",
        content: result.text,
        complexity: result.complexity,
        modelUsed: result.modelUsed,
        followUp: result.complexity === "complex",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
