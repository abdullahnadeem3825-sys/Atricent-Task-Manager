"use client";

import { useState, useEffect, useRef } from "react";
import { useSupabase } from "@/hooks/useSupabase";
import { useUser } from "@/hooks/useUser";
import Spinner from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import type { AIChat, AIMessage } from "@/types";

export default function AIAssistantPage() {
  const supabase = useSupabase();
  const { profile, loading: userLoading } = useUser();
  const [chats, setChats] = useState<AIChat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!profile) return;
    fetchChats();
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeChat) fetchMessages(activeChat);
  }, [activeChat]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchChats = async () => {
    const { data } = await supabase
      .from("ai_chats")
      .select("*")
      .order("updated_at", { ascending: false });
    setChats(data || []);
    setLoadingChats(false);
    if (data && data.length > 0 && !activeChat) {
      setActiveChat(data[0].id);
    }
  };

  const fetchMessages = async (chatId: string) => {
    const { data } = await supabase
      .from("ai_messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const createChat = async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from("ai_chats")
      .insert({ user_id: profile.id, title: "New Chat" })
      .select()
      .single();
    if (error) {
      toast(error.message, "error");
      return;
    }
    setChats((prev) => [data, ...prev]);
    setActiveChat(data.id);
    setMessages([]);
  };

  const deleteChat = async (chatId: string) => {
    await supabase.from("ai_chats").delete().eq("id", chatId);
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChat === chatId) {
      setActiveChat(null);
      setMessages([]);
    }
    toast("Chat deleted", "info");
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeChat || !profile || sending) return;
    const userMessage = input.trim();
    setInput("");
    setSending(true);

    // Save user message
    const { data: savedMsg } = await supabase
      .from("ai_messages")
      .insert({ chat_id: activeChat, role: "user", content: userMessage })
      .select()
      .single();

    if (savedMsg) {
      setMessages((prev) => [...prev, savedMsg]);
    }

    // Update chat title if first message
    if (messages.length === 0) {
      const title =
        userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : "");
      await supabase.from("ai_chats").update({ title }).eq("id", activeChat);
      setChats((prev) =>
        prev.map((c) => (c.id === activeChat ? { ...c, title } : c)),
      );
    }

    // Build message history for context
    const history = [
      ...messages,
      { role: "user" as const, content: userMessage },
    ].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Stream AI response
    let aiContent = "";
    const placeholderId = "temp-" + Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: placeholderId,
        chat_id: activeChat,
        role: "assistant",
        content: "Thinking...",
        created_at: new Date().toISOString(),
      },
    ]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.details || "AI request failed");
      }

      const data = await res.json();
      aiContent = data.content;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholderId ? { ...m, content: aiContent } : m,
        ),
      );

      // Save assistant message
      const { data: savedAI } = await supabase
        .from("ai_messages")
        .insert({ chat_id: activeChat, role: "assistant", content: aiContent })
        .select()
        .single();

      if (savedAI) {
        setMessages((prev) =>
          prev.map((m) => (m.id === placeholderId ? savedAI : m)),
        );
      }

      // Update chat updated_at
      await supabase
        .from("ai_chats")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activeChat);
    } catch {
      toast("Failed to get AI response", "error");
      setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (userLoading || loadingChats) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Chat Sidebar */}
      <div className="w-72 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
        <div className="p-3 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={createChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
              No chats yet
            </p>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                className={`group flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                  activeChat === chat.id
                    ? "bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-600"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
                onClick={() => setActiveChat(chat.id)}
              >
                <svg
                  className="w-4 h-4 text-gray-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                  {chat.title}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 transition-all"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-4">🤖</div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Company AI Assistant
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                Your internal AI assistant for code questions, debugging,
                architecture decisions, and more.
              </p>
              <button
                onClick={createChat}
                className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Start a new chat
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">💬</div>
                  <p className="text-gray-400 dark:text-gray-500">
                    Send a message to start the conversation
                  </p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose-chat text-sm whitespace-pre-wrap">
                        {msg.content || <Spinner size="sm" />}
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
              <div className="flex items-end gap-3 max-w-4xl mx-auto">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything... (Shift+Enter for new line)"
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-400 max-h-32"
                  style={{ minHeight: "44px" }}
                  onInput={(e) => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = "auto";
                    t.style.height = Math.min(t.scrollHeight, 128) + "px";
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? (
                    <Spinner size="sm" />
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
