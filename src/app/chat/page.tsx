import { redirect } from "next/navigation";
import { auth } from "@/root/auth";
import ChatApp from "@/components/ChatApp";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <ChatApp
      userName={session.user.name ?? session.user.email ?? "there"}
      initialConversationId={null}
      initialMessages={[]}
    />
  );
}
