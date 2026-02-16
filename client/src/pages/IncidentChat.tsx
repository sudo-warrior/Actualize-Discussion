import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Loader2, Sparkles } from "lucide-react";
import type { Incident } from "@shared/schema";

interface Message {
  id: number;
  role: string;
  content: string;
  createdAt: string;
}

interface Conversation {
  id: number;
  title: string;
  incidentId: string;
  stepIndex: number | null;
  messages: Message[];
}

export default function IncidentChat() {
  const [, params] = useRoute("/incidents/:id/chat");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const incidentId = params?.id;
  const searchParams = new URLSearchParams(window.location.search);
  const stepIndex = searchParams.get("step");

  const { data: incident } = useQuery<Incident>({
    queryKey: [`/api/incidents/${incidentId}`],
    enabled: !!incidentId,
  });

  const { data: conversation } = useQuery<Conversation>({
    queryKey: [`/api/conversations/${conversationId}`],
    enabled: !!conversationId,
    refetchInterval: streaming ? false : 3000,
  });

  // Create conversation on mount
  useEffect(() => {
    if (incident && !conversationId) {
      const createConversation = async () => {
        const title = stepIndex 
          ? `Follow-up: ${incident.nextSteps[parseInt(stepIndex)]?.slice(0, 50)}...`
          : `Chat about: ${incident.title}`;
        
        const res = await apiRequest("POST", "/api/conversations", { 
          title,
          incidentId: incident.id,
          stepIndex: stepIndex ? parseInt(stepIndex) : null
        });
        const data = await res.json();
        setConversationId(data.id);
      };
      createConversation();
    }
  }, [incident, conversationId, stepIndex]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages, streamingContent]);

  const sendMessage = async () => {
    if (!input.trim() || !conversationId || streaming) return;

    const userMessage = input;
    setInput("");
    setStreaming(true);
    setStreamingContent("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ content: userMessage }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                setStreamingContent((prev) => prev + data.content);
              }
              if (data.done) {
                setStreamingContent("");
                queryClient.invalidateQueries({ queryKey: [`/api/conversations/${conversationId}`] });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setStreaming(false);
    }
  };

  const messages = conversation?.messages || [];
  const allMessages = streaming
    ? [...messages, { id: -1, role: "user", content: input, createdAt: new Date().toISOString() }]
    : messages;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/incidents/${incidentId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{conversation?.title || "Loading..."}</h1>
            {stepIndex && incident && (
              <p className="text-xs text-muted-foreground mt-1">
                Step: {incident.nextSteps[parseInt(stepIndex)]}
              </p>
            )}
          </div>
        </div>

        <Card className="p-4 min-h-[500px] max-h-[600px] overflow-y-auto flex flex-col gap-4">
          {allMessages.map((msg, i) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-2 text-primary">
                    <Sparkles className="h-3 w-3" />
                    <span className="text-xs font-mono uppercase">AI Assistant</span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {streaming && streamingContent && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <Sparkles className="h-3 w-3" />
                  <span className="text-xs font-mono uppercase">AI Assistant</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </Card>

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask a follow-up question..."
            className="min-h-[60px]"
            disabled={streaming}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || streaming}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
