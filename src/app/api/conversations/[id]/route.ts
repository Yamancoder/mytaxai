import { NextResponse } from "next/server";
import { auth } from "@/root/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: RouteContext<"/api/conversations/[id]">) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: session.user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/conversations/[id]">) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
