import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
      <div className="max-w-5xl mx-auto space-y-4 p-4 md:p-0">
        <Card className="p-3 md:p-4 border-border bg-gradient-to-r from-card via-card to-primary/5 border-l-4 border-l-primary">
          <div className="flex items-center gap-2 md:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/incidents/${incidentId}`)}
              className="h-8 w-8 md:h-9 md:w-9 hover:bg-primary/10 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm md:text-lg font-bold font-mono flex items-center gap-2">
                <Terminal className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                <span className="hidden sm:inline">AI Guidance Assistant</span>
                <span className="sm:hidden">AI Assistant</span>
              </h1>
              {stepIndex && incident && (
                <p className="text-[10px] md:text-xs text-muted-foreground font-mono mt-1 flex items-center gap-1 md:gap-2 truncate">
                  <Zap className="h-2 w-2 md:h-3 md:w-3 shrink-0" />
                  <span className="truncate">Step {parseInt(stepIndex) + 1}: {incident.nextSteps[parseInt(stepIndex)]?.slice(0, 40)}...</span>
                </p>
              )}
            </div>
            <Badge variant="outline" className="font-mono text-[10px] md:text-xs border-primary/30 text-primary shrink-0">
              Live
            </Badge>
          </div>
        </Card>

        <Card className="p-0 border-border bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-[calc(100vh-280px)] md:h-[calc(100vh-320px)] overflow-y-auto px-3 md:px-6 py-4 md:py-6 space-y-3 md:space-y-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
            {messages.length === 0 && !streaming && (
              <div className="flex items-center justify-center h-full text-center">
                <div className="space-y-3">
                  <div className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto">
                    <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground font-mono px-4">
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
                  className={`max-w-[90%] md:max-w-[80%] rounded-lg p-3 md:p-4 ${
                    msg.role === "user"
                      ? "bg-primary/90 text-primary-foreground border border-primary shadow-lg shadow-primary/20"
                      : "bg-muted/80 border border-border/50 backdrop-blur-sm"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-2 md:mb-3 pb-2 border-b border-border/30">
                      <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary" />
                      <span className="text-[10px] md:text-xs font-mono uppercase tracking-wider text-primary">AI Assistant</span>
                    </div>
                  )}
                  <div className="text-xs md:text-sm leading-relaxed break-words prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                  <p className="text-[9px] md:text-[10px] text-muted-foreground/60 font-mono mt-2">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {streaming && streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[90%] md:max-w-[80%] rounded-lg p-3 md:p-4 bg-muted/80 border border-border/50 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2 md:mb-3 pb-2 border-b border-border/30">
                    <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5 text-primary animate-pulse" />
                    <span className="text-[10px] md:text-xs font-mono uppercase tracking-wider text-primary">AI Assistant</span>
                    <Loader2 className="h-3 w-3 animate-spin text-primary ml-auto" />
                  </div>
                  <div className="text-xs md:text-sm leading-relaxed break-words prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {streamingContent}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </Card>

        <Card className="p-3 md:p-4 border-border bg-card/80 backdrop-blur-sm border-t-2 border-t-primary/20">
          <div className="flex gap-2 md:gap-3">
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
              className="min-h-[60px] md:min-h-[80px] resize-none bg-background/50 border-border/50 font-mono text-xs md:text-sm focus:border-primary/50 transition-colors"
              disabled={streaming}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || streaming}
              size="icon"
              className="h-[60px] w-[60px] md:h-[80px] md:w-[80px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105 shrink-0"
            >
              {streaming ? <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <Send className="h-4 w-4 md:h-5 md:w-5" />}
            </Button>
          </div>
          <div className="flex items-center gap-2 md:gap-4 mt-2 md:mt-3 text-[10px] md:text-xs text-muted-foreground font-mono flex-wrap">
            <span className="flex items-center gap-1 md:gap-1.5">
              <kbd className="px-1.5 md:px-2 py-0.5 md:py-1 bg-muted rounded text-[9px] md:text-[10px] border border-border">Enter</kbd>
              <span className="hidden sm:inline">to send</span>
            </span>
            <span className="flex items-center gap-1 md:gap-1.5">
              <kbd className="px-1.5 md:px-2 py-0.5 md:py-1 bg-muted rounded text-[9px] md:text-[10px] border border-border">Shift+Enter</kbd>
              <span className="hidden sm:inline">for new line</span>
            </span>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
