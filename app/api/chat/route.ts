import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { sessionId, chatInput } = await request.json();

    const response = await fetch("https://huiling002.app.n8n.cloud/webhook/invoke_agent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        chatInput,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Webhook responded with status ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      const text = await response.text();
      return new NextResponse(text, {
        headers: { "Content-Type": "text/plain" },
      });
    }
  } catch (error) {
    const err = error as Error;
    console.error("Error proxying chat to n8n:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
