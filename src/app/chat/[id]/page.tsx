import { redirect, notFound } from "next/navigation";
import { auth } from "@/root/auth";
import { prisma } from "@/lib/prisma";
import ChatApp from "@/components/ChatApp";

export default async function ChatConversationPage(
  props: PageProps<"/chat/[id]">,
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await props.params;

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: session.user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) notFound();

  return (
    <ChatApp
      userName={session.user.name ?? session.user.email ?? "there"}
      initialConversationId={conversation.id}
      initialMessages={conversation.messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
      }))}
    />
  );
}
