import { useState } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  BookOpen,
  Key,
  Terminal,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Shield,
  Zap,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EndpointProps {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  requestBody?: string;
  responseBody: string;
  curlExample: string;
}

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PATCH: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
};

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <pre className="bg-background/80 border border-border rounded-md p-3 md:p-4 overflow-x-auto text-xs font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        data-testid="button-copy-code"
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-muted/50 border border-border text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  );
}

function Endpoint({ method, path, description, requestBody, responseBody, curlExample }: EndpointProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button
        data-testid={`button-endpoint-${method.toLowerCase()}-${path.replace(/\//g, "-").replace(/:/g, "")}`}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 md:p-4 hover:bg-muted/10 transition-colors text-left"
      >
        <Badge variant="outline" className={cn("text-[10px] font-mono font-bold px-2 py-0.5 shrink-0", methodColors[method])}>
          {method}
        </Badge>
        <code className="text-xs md:text-sm font-mono text-foreground flex-1 truncate">{path}</code>
        <span className="text-xs text-muted-foreground hidden sm:block max-w-[200px] truncate">{description}</span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-border p-3 md:p-4 space-y-4 bg-card/30">
          <p className="text-sm text-muted-foreground">{description}</p>
          {requestBody && (
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Request Body</p>
              <CodeBlock code={requestBody} language="json" />
            </div>
          )}
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Response</p>
            <CodeBlock code={responseBody} language="json" />
          </div>
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">cURL Example</p>
            <CodeBlock code={curlExample} language="bash" />
          </div>
        </div>
      )}
    </div>
  );
}

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://your-app.replit.app";

const endpoints: EndpointProps[] = [
  {
    method: "POST",
    path: "/api/v1/incidents/analyze",
    description: "Submit logs for AI-powered analysis",
    requestBody: JSON.stringify({ logs: "ERROR 2024-01-15 Connection refused..." }, null, 2),
    responseBody: JSON.stringify({
      id: "uuid-here",
      title: "Database Connection Failure",
      severity: "critical",
      confidence: 92,
      rootCause: "PostgreSQL connection pool exhausted...",
      fix: "Increase max_connections in postgresql.conf...",
      evidence: ["Connection refused at line 42", "Pool timeout after 30s"],
      nextSteps: ["Check connection pool settings", "Monitor active connections"],
      status: "resolved",
      createdAt: "2024-01-15T10:30:00.000Z"
    }, null, 2),
    curlExample: `curl -X POST ${BASE_URL}/api/v1/incidents/analyze \\
  -H "Authorization: Bearer ic_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"logs": "ERROR 2024-01-15 Connection refused..."}'`,
  },
  {
    method: "GET",
    path: "/api/v1/incidents",
    description: "List all your incidents",
    responseBody: JSON.stringify({
      data: [
        {
          id: "uuid-here",
          title: "Database Connection Failure",
          severity: "critical",
          confidence: 92,
          status: "resolved",
          createdAt: "2024-01-15T10:30:00.000Z"
        }
      ],
      total: 1
    }, null, 2),
    curlExample: `curl ${BASE_URL}/api/v1/incidents \\
  -H "Authorization: Bearer ic_your_api_key_here"`,
  },
  {
    method: "GET",
    path: "/api/v1/incidents/:id",
    description: "Get details for a specific incident",
    responseBody: JSON.stringify({
      id: "uuid-here",
      title: "Database Connection Failure",
      severity: "critical",
      confidence: 92,
      rootCause: "PostgreSQL connection pool exhausted...",
      fix: "Increase max_connections...",
      evidence: ["..."],
      nextSteps: ["..."],
      status: "resolved",
      createdAt: "2024-01-15T10:30:00.000Z"
    }, null, 2),
    curlExample: `curl ${BASE_URL}/api/v1/incidents/your-incident-id \\
  -H "Authorization: Bearer ic_your_api_key_here"`,
  },
  {
    method: "PATCH",
    path: "/api/v1/incidents/:id/status",
    description: "Update the status of an incident",
    requestBody: JSON.stringify({ status: "resolved" }, null, 2),
    responseBody: JSON.stringify({
      id: "uuid-here",
      title: "Database Connection Failure",
      status: "resolved",
      "...": "full incident object"
    }, null, 2),
    curlExample: `curl -X PATCH ${BASE_URL}/api/v1/incidents/your-incident-id/status \\
  -H "Authorization: Bearer ic_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "resolved"}'`,
  },
  {
    method: "DELETE",
    path: "/api/v1/incidents/:id",
    description: "Delete an incident",
    responseBody: JSON.stringify({ success: true }, null, 2),
    curlExample: `curl -X DELETE ${BASE_URL}/api/v1/incidents/your-incident-id \\
  -H "Authorization: Bearer ic_your_api_key_here"`,
  },
];

export default function ApiDocs() {
  const [, navigate] = useLocation();

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
        <header className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1 md:mb-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight font-sans text-foreground flex items-center gap-3">
              <BookOpen className="h-6 w-6 md:h-7 md:w-7 text-primary" />
              API Documentation
            </h1>
            <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5 self-start">
              v1.0
            </Badge>
          </div>
          <p className="text-muted-foreground font-mono text-xs md:text-sm">
            Integrate Incident Commander into your CI/CD pipelines, monitoring tools, and custom workflows.
          </p>
        </header>

        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-20">
          <Card className="p-4 md:p-6 bg-card/50 border-border">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" /> Quick Start
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0 mt-0.5">1</div>
                <div>
                  <p className="text-sm font-medium">Generate an API Key</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Go to your <span data-testid="link-profile-from-docs" className="text-primary cursor-pointer hover:underline" onClick={() => navigate("/profile")}>Profile page</span> and create a new API key under the "API Keys" section.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0 mt-0.5">2</div>
                <div>
                  <p className="text-sm font-medium">Include it in your requests</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Add your key as a Bearer token in the <code className="text-[10px] bg-muted/50 px-1 py-0.5 rounded">Authorization</code> header, or use the <code className="text-[10px] bg-muted/50 px-1 py-0.5 rounded">X-API-Key</code> header.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0 mt-0.5">3</div>
                <div>
                  <p className="text-sm font-medium">Submit logs for analysis</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    POST your log data to the analyze endpoint and get back AI-powered root cause analysis.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <CodeBlock code={`curl -X POST ${BASE_URL}/api/v1/incidents/analyze \\
  -H "Authorization: Bearer ic_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"logs": "your raw logs here..."}'`} />
            </div>
          </Card>

          <Card className="p-4 md:p-6 bg-card/50 border-border">
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" /> Authentication
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              All API v1 endpoints require an API key. You can authenticate in two ways:
            </p>
            <div className="space-y-3">
              <div className="p-3 rounded-md bg-muted/10 border border-border/50">
                <p className="text-xs font-mono text-muted-foreground mb-1">Option 1: Authorization Header (recommended)</p>
                <code className="text-xs font-mono text-foreground">Authorization: Bearer ic_your_api_key_here</code>
              </div>
              <div className="p-3 rounded-md bg-muted/10 border border-border/50">
                <p className="text-xs font-mono text-muted-foreground mb-1">Option 2: X-API-Key Header</p>
                <code className="text-xs font-mono text-foreground">X-API-Key: ic_your_api_key_here</code>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/80">
                Keep your API keys secure. Never commit them to version control. Use environment variables or secret managers in your CI/CD systems.
              </p>
            </div>
          </Card>

          <Card className="p-4 md:p-6 bg-card/50 border-border">
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" /> Base URL
            </h2>
            <CodeBlock code={`${BASE_URL}/api/v1`} />
            <p className="text-xs text-muted-foreground mt-2">
              All endpoints are relative to this base URL. Responses are JSON-encoded.
            </p>
          </Card>

          <div>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Endpoints
            </h2>
            <div className="space-y-3">
              {endpoints.map((ep) => (
                <Endpoint key={`${ep.method}-${ep.path}`} {...ep} />
              ))}
            </div>
          </div>

          <Card className="p-4 md:p-6 bg-card/50 border-border">
            <h2 className="text-lg font-bold mb-3">Error Responses</h2>
            <p className="text-sm text-muted-foreground mb-4">
              All errors follow a consistent format:
            </p>
            <CodeBlock code={JSON.stringify({ error: "Description of what went wrong" }, null, 2)} />
            <div className="mt-4 space-y-2">
              {[
                { code: "400", desc: "Bad Request - Invalid input or missing fields" },
                { code: "401", desc: "Unauthorized - Missing or invalid API key" },
                { code: "403", desc: "Forbidden - You don't own this resource" },
                { code: "404", desc: "Not Found - Resource doesn't exist" },
                { code: "500", desc: "Server Error - Something went wrong on our end" },
              ].map((err) => (
                <div key={err.code} className="flex items-center gap-3 text-xs">
                  <Badge variant="outline" className="font-mono text-[10px] w-10 justify-center">{err.code}</Badge>
                  <span className="text-muted-foreground">{err.desc}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 md:p-6 bg-card/50 border-border border-l-4 border-l-primary/40">
            <h2 className="text-lg font-bold mb-3">Integration Examples</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Node.js / JavaScript</p>
                <CodeBlock code={`const response = await fetch("${BASE_URL}/api/v1/incidents/analyze", {
  method: "POST",
  headers: {
    "Authorization": "Bearer " + process.env.INCIDENT_CMD_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ logs: errorLogs }),
});
const incident = await response.json();
console.log(incident.rootCause);`} />
              </div>
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">Python</p>
                <CodeBlock code={`import requests, os

response = requests.post(
    "${BASE_URL}/api/v1/incidents/analyze",
    headers={"Authorization": f"Bearer {os.environ['INCIDENT_CMD_API_KEY']}"},
    json={"logs": error_logs}
)
incident = response.json()
print(incident["rootCause"])`} />
              </div>
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">GitHub Actions</p>
                <CodeBlock code={`- name: Analyze deployment logs
  run: |
    curl -X POST ${BASE_URL}/api/v1/incidents/analyze \\
      -H "Authorization: Bearer \${{ secrets.INCIDENT_CMD_API_KEY }}" \\
      -H "Content-Type: application/json" \\
      -d "{\\"logs\\": \\"$(cat deploy.log)\\"}"
`} />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
