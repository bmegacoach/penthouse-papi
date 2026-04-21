import { NextRequest, NextResponse } from "next/server";
import type { AgentAction } from "@/lib/agent/types";

export async function POST(req: NextRequest) {
  try {
    const action: AgentAction = await req.json();

    if (!action.type || !action.description) {
      return NextResponse.json({ success: false, error: "type and description required" }, { status: 400 });
    }

    // Actions call internal APIs on the server side
    const baseUrl = req.nextUrl.origin;

    switch (action.type) {
      case "create_concept": {
        const { title, brand, tags, description } = action.params as Record<string, string>;
        const res = await fetch(`${baseUrl}/api/concepts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, brand, tags, description }),
        });
        if (!res.ok) return NextResponse.json({ success: false, error: `Concept creation failed: ${res.status}` });
        return NextResponse.json({ success: true, data: await res.json() });
      }

      case "advance_concept": {
        const { conceptId, status } = action.params as Record<string, string>;
        const res = await fetch(`${baseUrl}/api/concepts/${conceptId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) return NextResponse.json({ success: false, error: `Concept update failed: ${res.status}` });
        return NextResponse.json({ success: true, data: await res.json() });
      }

      case "create_job": {
        const { name, brand, sourcePath, conceptId } = action.params as Record<string, string>;
        const res = await fetch(`${baseUrl}/api/hyperedit/jobs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, brand, sourcePath: sourcePath || "agent-created", source: "url", conceptId }),
        });
        if (!res.ok) return NextResponse.json({ success: false, error: `Job creation failed: ${res.status}` });
        return NextResponse.json({ success: true, data: await res.json() });
      }

      case "search_memory": {
        const { query } = action.params as Record<string, string>;
        const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) return NextResponse.json({ success: false, error: `Search failed: ${res.status}` });
        return NextResponse.json({ success: true, data: await res.json() });
      }

      case "append_memory": {
        const { content, tags } = action.params as Record<string, unknown>;
        const res = await fetch(`${baseUrl}/api/memory/daily/append`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, source: "agent-copilot", tags }),
        });
        if (!res.ok) return NextResponse.json({ success: false, error: `Memory append failed: ${res.status}` });
        return NextResponse.json({ success: true, data: await res.json() });
      }

      case "submit_research": {
        const { question, priority } = action.params as Record<string, string>;
        const res = await fetch(`${baseUrl}/api/memory/research`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, priority: priority || "p2" }),
        });
        if (!res.ok) return NextResponse.json({ success: false, error: `Research submit failed: ${res.status}` });
        return NextResponse.json({ success: true, data: await res.json() });
      }

      case "schedule_clip": {
        const { clipId, date, platform, brand, title } = action.params as Record<string, string>;
        const res = await fetch(`${baseUrl}/api/calendar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title || "Scheduled clip", date, platform, brand, contentType: "video", sourceJobId: clipId }),
        });
        if (!res.ok) return NextResponse.json({ success: false, error: `Schedule failed: ${res.status}` });
        return NextResponse.json({ success: true, data: await res.json() });
      }

      case "navigate": {
        return NextResponse.json({ success: true, data: { navigate: action.params } });
      }

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action.type}` });
    }
  } catch (err) {
    console.error("[agent/execute]", err);
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Execution failed" }, { status: 500 });
  }
}
