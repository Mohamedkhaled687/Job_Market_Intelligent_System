import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, X, Send, Loader2, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStudyPlanChat, type ChatMessage } from "@/hooks/useStudyPlan";
import { cn } from "@/lib/utils";

function MarkdownContent({ content }: { content: string }) {
  const html = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-4 mb-1.5">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-[hsl(var(--muted))] px-1 py-0.5 text-xs">$1</code>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[hsl(var(--primary))] underline hover:opacity-80">$1</a>'
    )
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n{2,}/g, '<div class="h-2"></div>')
    .replace(/\n/g, "<br />");

  return (
    <div
      className="prose-sm max-w-none text-sm leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const EMPTY_PROMPT =
  "Paste a job description or list skills you want to learn, and I'll create a personalized study plan with real resources.";

export function StudyPlanChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mutation = useStudyPlanChat();

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, mutation.isPending, scrollToBottom]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || mutation.isPending) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    mutation.mutate(text, {
      onSuccess: (data) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.content },
        ]);
      },
      onError: () => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "**Something went wrong.** Please check that the API server is running and try again.",
          },
        ]);
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-lg hover:shadow-xl transition-shadow"
            title="Study Plan Agent"
          >
            <Bot className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 flex h-[540px] w-[400px] flex-col overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--primary))] px-4 py-3">
              <div className="flex items-center gap-2 text-[hsl(var(--primary-foreground))]">
                <GraduationCap className="h-5 w-5" />
                <span className="font-semibold text-sm">Study Plan Agent</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-[hsl(var(--primary-foreground))] hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && !mutation.isPending && (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <div className="rounded-2xl bg-[hsl(var(--primary)/0.1)] p-4">
                    <Bot className="h-8 w-8 text-[hsl(var(--primary))]" />
                  </div>
                  <p className="max-w-[260px] text-sm text-[hsl(var(--muted-foreground))]">
                    {EMPTY_PROMPT}
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5",
                      msg.role === "user"
                        ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-br-md"
                        : "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] rounded-bl-md"
                    )}
                  >
                    {msg.role === "user" ? (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <MarkdownContent content={msg.content} />
                    )}
                  </div>
                </div>
              ))}

              {mutation.isPending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-[hsl(var(--muted))] px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--primary))]" />
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      Generating study plan...
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-[hsl(var(--border))] px-3 py-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Describe a job or list skills..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={mutation.isPending}
                  className="flex-1 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2.5 text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || mutation.isPending}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
