import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/root/auth";
import { prisma } from "@/lib/prisma";
import { SYSTEM_PROMPT } from "@/lib/systemPrompt";

export const runtime = "nodejs";

const client = new Anthropic();

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId, message } = await request.json();
  if (typeof conversationId !== "string" || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "conversationId and message are required." }, { status: 400 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: session.user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  await prisma.message.create({
    data: { conversationId, role: "user", content: message },
  });

  if (conversation.title === "New conversation") {
    const title = message.trim().slice(0, 60) + (message.trim().length > 60 ? "…" : "");
    await prisma.conversation.update({ where: { id: conversationId }, data: { title } });
  }

  const history: Anthropic.MessageParam[] = [
    ...conversation.messages.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      try {
        const anthropicStream = client.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          thinking: { type: "adaptive" },
          messages: history,
        });

        anthropicStream.on("text", (delta) => {
          fullText += delta;
          controller.enqueue(encoder.encode(delta));
        });

        await anthropicStream.finalMessage();

        await prisma.message.create({
          data: { conversationId, role: "assistant", content: fullText },
        });
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        controller.close();
      } catch (err) {
        console.error("Chat stream error:", err);
        const errorText =
          "Sorry — something went wrong generating a response. Please try again.";
        controller.enqueue(encoder.encode(errorText));
        await prisma.message.create({
          data: { conversationId, role: "assistant", content: errorText },
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
