type AnalysisResult = {
  title: string;
  rootCause: string;
  confidence: number;
  severity: "low" | "medium" | "high" | "critical";
  evidence: string[];
  fix: string;
  nextSteps: string[];
};

type Pattern = {
  regex: RegExp;
  title: string;
  rootCause: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  fix: string;
  nextSteps: string[];
};

const PATTERNS: Pattern[] = [
  {
    regex: /QueuePool.*limit.*reached|connection pool.*exhaust|too many connections/i,
    title: "Database Connection Pool Exhaustion",
    rootCause: "The database connection pool has been exhausted. All available connections are in use and new requests cannot acquire a connection within the timeout period.",
    severity: "high",
    confidence: 94,
    fix: "Increase `pool_size` and `max_overflow` in your database configuration. Consider adding connection pooling with PgBouncer.",
    nextSteps: [
      "Update database connection pool configuration",
      "Restart the application service",
      "Monitor active connections with `SELECT count(*) FROM pg_stat_activity`"
    ]
  },
  {
    regex: /ECONNREFUSED|connection refused|connect ECONNREFUSED/i,
    title: "Connection Refused",
    rootCause: "The target service is not accepting connections. The service may be down, not started, or listening on a different port.",
    severity: "high",
    confidence: 96,
    fix: "Verify the target service is running and listening on the expected port. Check firewall rules and network configuration.",
    nextSteps: [
      "Check if the service process is running",
      "Verify port binding in service configuration",
      "Check firewall/security group rules"
    ]
  },
  {
    regex: /OOMKilled|out of memory|heap out of memory|JavaScript heap/i,
    title: "Out of Memory (OOM) Kill",
    rootCause: "The process exceeded its memory limit and was terminated by the system. This is often caused by memory leaks, large data processing, or insufficient memory allocation.",
    severity: "critical",
    confidence: 98,
    fix: "Increase the memory limit for the container/process. Investigate potential memory leaks using heap profiling.",
    nextSteps: [
      "Increase --max-old-space-size or container memory limit",
      "Run heap profiler to identify leaking objects",
      "Check for unbounded caches or large file reads in memory"
    ]
  },
  {
    regex: /502 Bad Gateway|upstream prematurely closed|upstream timed out/i,
    title: "502 Bad Gateway",
    rootCause: "The reverse proxy (Nginx/HAProxy) received an invalid or no response from the upstream application server. The backend may be overloaded, crashed, or timing out.",
    severity: "critical",
    confidence: 89,
    fix: "Check the upstream application server health. Increase proxy timeout values if the backend is slow but healthy.",
    nextSteps: [
      "Check upstream application logs for errors",
      "Review proxy timeout configuration",
      "Monitor backend CPU and memory utilization"
    ]
  },
  {
    regex: /ETIMEDOUT|timeout|timed out|request timeout|gateway timeout/i,
    title: "Request Timeout",
    rootCause: "A network request or database query exceeded the configured timeout threshold. This may indicate network issues, slow queries, or an overloaded downstream service.",
    severity: "medium",
    confidence: 85,
    fix: "Identify the slow operation (network call or DB query) and optimize it. Consider increasing timeout as a short-term fix.",
    nextSteps: [
      "Enable slow query logging to identify bottlenecks",
      "Check network latency to downstream services",
      "Consider adding request retries with exponential backoff"
    ]
  },
  {
    regex: /SIGKILL|SIGTERM|signal 9|signal 15|killed/i,
    title: "Process Killed by Signal",
    rootCause: "The process was terminated by an external signal. This is typically caused by orchestration systems (Kubernetes), OOM killer, or manual intervention.",
    severity: "high",
    confidence: 88,
    fix: "Check system logs (`dmesg`, `journalctl`) for OOM killer activity. Review orchestration health checks and resource limits.",
    nextSteps: [
      "Check `dmesg | grep -i oom` for OOM killer events",
      "Review container resource limits (CPU/memory)",
      "Verify health check endpoints are responding"
    ]
  },
  {
    regex: /ENOSPC|no space left on device|disk full/i,
    title: "Disk Space Exhausted",
    rootCause: "The filesystem has run out of available disk space. This prevents the application from writing logs, temp files, or database data.",
    severity: "critical",
    confidence: 99,
    fix: "Free disk space immediately by removing old logs, temp files, or expanding the volume.",
    nextSteps: [
      "Run `df -h` to identify full partitions",
      "Clean up old log files and temporary data",
      "Set up log rotation and disk usage alerts"
    ]
  },
  {
    regex: /401 Unauthorized|403 Forbidden|jwt expired|token.*expired|UnauthorizedError/i,
    title: "Authentication / Authorization Failure",
    rootCause: "Requests are being rejected due to invalid, expired, or missing authentication credentials.",
    severity: "medium",
    confidence: 92,
    fix: "Verify the authentication token refresh mechanism. Check that API keys/tokens are valid and not expired.",
    nextSteps: [
      "Check client-side token refresh logic",
      "Verify server time synchronization (NTP)",
      "Review API key expiration policies"
    ]
  },
  {
    regex: /Traceback.*most recent call|File ".*\.py".*line \d+/i,
    title: "Python Exception",
    rootCause: "An unhandled Python exception occurred. The traceback provides the call stack leading to the error.",
    severity: "medium",
    confidence: 80,
    fix: "Examine the traceback to identify the failing line and add appropriate error handling.",
    nextSteps: [
      "Read the full traceback from bottom to top",
      "Add try/except block around the failing code",
      "Add logging to capture input data that caused the failure"
    ]
  },
  {
    regex: /npm ERR|Module not found|Cannot find module|ERESOLVE/i,
    title: "Node.js Module Resolution Error",
    rootCause: "A required Node.js module could not be found. This is typically caused by missing dependencies or incorrect import paths.",
    severity: "low",
    confidence: 95,
    fix: "Run `npm install` to install missing dependencies. Check import paths for typos.",
    nextSteps: [
      "Run `npm install` or `npm ci`",
      "Verify package.json has the required dependency",
      "Check for typos in import/require statements"
    ]
  },
  {
    regex: /segmentation fault|SIGSEGV|core dumped/i,
    title: "Segmentation Fault",
    rootCause: "The process attempted to access memory it does not own, causing a crash. This is often caused by native module bugs or corrupted installations.",
    severity: "critical",
    confidence: 97,
    fix: "Rebuild native modules with `npm rebuild`. If the issue persists, check for known bugs in native dependencies.",
    nextSteps: [
      "Run `npm rebuild` to recompile native modules",
      "Check if the issue is reproducible with a minimal test case",
      "Review recent dependency updates for breaking changes"
    ]
  }
];

export function analyzeLogs(rawLogs: string): AnalysisResult {
  const lines = rawLogs.split("\n").filter(l => l.trim());

  for (const pattern of PATTERNS) {
    if (pattern.regex.test(rawLogs)) {
      const evidenceLines = lines.filter(line => pattern.regex.test(line)).slice(0, 5);
      const contextEvidence = evidenceLines.length > 0 ? evidenceLines : lines.slice(0, 3);

      return {
        title: pattern.title,
        rootCause: pattern.rootCause,
        confidence: pattern.confidence,
        severity: pattern.severity,
        evidence: contextEvidence,
        fix: pattern.fix,
        nextSteps: pattern.nextSteps,
      };
    }
  }

  const errorLines = lines.filter(line => /error|fatal|fail|exception|panic|crash/i.test(line)).slice(0, 5);

  return {
    title: "Unclassified Error",
    rootCause: "The logs contain error indicators but do not match any known incident patterns. Manual investigation is recommended.",
    confidence: 45,
    severity: "medium",
    evidence: errorLines.length > 0 ? errorLines : lines.slice(0, 3),
    fix: "Review the highlighted log lines manually. Consider adding more structured logging to improve future analysis.",
    nextSteps: [
      "Search error messages in your project's issue tracker",
      "Check recent deployments for related changes",
      "Add structured logging to capture more context"
    ]
  };
}
