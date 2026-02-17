import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Loader2, Sparkles, Circle, Plus, MoreHorizontal, Zap } from "lucide-react";
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
      <div className="flex flex-col h-full bg-[#0d1117]">
        {/* Header */}
        <div className="border-b border-gray-800 bg-gradient-to-b from-[#161b22] to-[#0d1117] px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate(`/incidents/${incidentId}`)}
                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95">
                <Plus className="w-5 h-5" />
              </button>
              <div className="h-6 w-px bg-gray-800 mx-1" />
              <div className="text-xs text-gray-500 font-mono">#{incidentId?.slice(0, 5).toUpperCase()}</div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
                <div className="relative">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <div className="absolute inset-0 bg-blue-400 blur-sm opacity-50 animate-pulse" />
                </div>
                <span className="text-white font-medium text-sm">AI Guidance Assistant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 px-2.5 py-0.5">
                  <Circle className="w-2 h-2 fill-emerald-400 animate-pulse" />
                  <span className="text-xs font-medium">Live</span>
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 gap-1 px-2.5 py-0.5">
                  <Zap className="w-3 h-3" />
                  <span className="text-xs font-medium">Fast</span>
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
          {stepIndex && incident && (
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg px-4 py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px] px-2 py-0.5 font-semibold">
                    STEP {parseInt(stepIndex) + 1} OF {incident.nextSteps.length}
                  </Badge>
                  <span className="text-sm text-gray-300">{incident.nextSteps[parseInt(stepIndex)]}</span>
                </div>
                <button 
                  onClick={() => navigate(`/incidents/${incidentId}`)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  View Full Context →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          {messages.length === 0 && !streaming ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-6 rounded-full border border-blue-500/30">
                  <Sparkles className="w-8 h-8 text-blue-400" />
                </div>
              </div>
              <p className="text-gray-400 text-sm max-w-md">
                Ask me anything about this remediation step
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-4 ${
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.role === 'assistant'
                      ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30'
                      : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <Sparkles className="w-4 h-4 text-blue-400" />
                    ) : (
                      <span className="text-white text-xs font-semibold">U</span>
                    )}
                  </div>
                  <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                    <div
                      className={`inline-block px-4 py-3 rounded-2xl ${
                        msg.role === 'assistant'
                          ? 'bg-[#161b22] border border-gray-800 text-gray-200'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      <div className="text-sm leading-relaxed prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1 px-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {streaming && streamingContent && (
                <div className="flex gap-4 flex-row">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                    <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block px-4 py-3 rounded-2xl bg-[#161b22] border border-gray-800 text-gray-200">
                      <div className="text-sm leading-relaxed prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamingContent}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-800 bg-[#0d1117] px-6 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-[#161b22] border border-gray-800 rounded-xl focus-within:border-blue-500/50 transition-colors overflow-hidden">
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
                className="min-h-[60px] resize-none border-0 bg-transparent text-gray-200 placeholder:text-gray-600 focus-visible:ring-0 focus-visible:ring-offset-0 pr-14"
                disabled={streaming}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                size="icon"
                className="absolute right-2 bottom-2 bg-gray-700 hover:bg-blue-600 disabled:bg-gray-800 disabled:text-gray-600 transition-colors rounded-lg"
              >
                {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <div className="text-xs text-gray-600 mt-2 text-center">
              <span className="font-semibold">Enter</span> to send · <span className="font-semibold">Shift+Enter</span> for new line
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
