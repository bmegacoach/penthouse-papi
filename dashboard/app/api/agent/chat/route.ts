import { NextRequest, NextResponse } from "next/server";
import { AgentRouter, OpenFangBackend, OpenRouterBackend } from "@/lib/agent/router";
import type { AgentContext, Message } from "@/lib/agent/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: Message[] = body.messages || [];
    const context: AgentContext = body.context || { page: "command-center", brand: "all", pageData: {} };

    if (messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    const openfang = new OpenFangBackend();
    const openrouter = new OpenRouterBackend();
    const router = new AgentRouter(openfang, openrouter);

    const response = await router.chat(messages, context);

    return NextResponse.json(response);
  } catch (err) {
    console.error("[agent/chat]", err);
    return NextResponse.json(
      { message: "Agent is unavailable. Check Settings > Agent configuration.", actions: [] },
      { status: 502 }
    );
  }
}
