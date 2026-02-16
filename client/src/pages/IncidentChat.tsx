import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Loader2, Sparkles, Terminal, Zap } from "lucide-react";
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

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-4">
        <Card className="p-4 border-border bg-gradient-to-r from-card via-card to-primary/5 border-l-4 border-l-primary">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/incidents/${incidentId}`)}
              className="h-9 w-9 hover:bg-primary/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-10 w-10 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-bold font-mono flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                AI Guidance Assistant
              </h1>
              {stepIndex && incident && (
                <p className="text-xs text-muted-foreground font-mono mt-1 flex items-center gap-2">
                  <Zap className="h-3 w-3" />
                  Step {parseInt(stepIndex) + 1}: {incident.nextSteps[parseInt(stepIndex)]?.slice(0, 80)}...
                </p>
              )}
            </div>
            <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">
              Live Chat
            </Badge>
          </div>
        </Card>

        <Card className="p-0 border-border bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-[calc(100vh-320px)] overflow-y-auto px-6 py-6 space-y-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
            {messages.length === 0 && !streaming && (
              <div className="flex items-center justify-center h-full text-center">
                <div className="space-y-3">
                  <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    Ask me anything about this remediation step
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    msg.role === "user"
                      ? "bg-primary/90 text-primary-foreground border border-primary shadow-lg shadow-primary/20"
                      : "bg-muted/80 border border-border/50 backdrop-blur-sm"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/30">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-mono uppercase tracking-wider text-primary">AI Assistant</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap font-mono leading-relaxed">{msg.content}</p>
                  <p className="text-[10px] text-muted-foreground/60 font-mono mt-2">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {streaming && streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-4 bg-muted/80 border border-border/50 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/30">
                    <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                    <span className="text-xs font-mono uppercase tracking-wider text-primary">AI Assistant</span>
                    <Loader2 className="h-3 w-3 animate-spin text-primary ml-auto" />
                  </div>
                  <p className="text-sm whitespace-pre-wrap font-mono leading-relaxed">{streamingContent}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </Card>

        <Card className="p-4 border-border bg-card/80 backdrop-blur-sm border-t-2 border-t-primary/20">
          <div className="flex gap-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask a follow-up question about this step..."
              className="min-h-[80px] resize-none bg-background/50 border-border/50 font-mono text-sm focus:border-primary/50 transition-colors"
              disabled={streaming}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || streaming}
              size="icon"
              className="h-[80px] w-[80px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105"
            >
              {streaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-muted rounded text-[10px] border border-border">Enter</kbd>
              to send
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-muted rounded text-[10px] border border-border">Shift+Enter</kbd>
              for new line
            </span>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
