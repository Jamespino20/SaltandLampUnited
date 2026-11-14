import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat with Lampy | Salt and Lamp United",
  description:
    "Chat with Lampy, the Salt and Lamp United assistant — ask about events, groups, beliefs, and more.",
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
