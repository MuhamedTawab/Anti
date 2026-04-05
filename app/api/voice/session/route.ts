import { NextRequest, NextResponse } from "next/server";

import { getVoiceMembers } from "@/lib/data";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { roomId?: string };
  const roomId = body.roomId ?? "war-room";

  return NextResponse.json({
    ok: true,
    roomId,
    participants: (await getVoiceMembers(roomId)).length + 1,
    signaling: {
      provider: "webrtc",
      transport: "socket.io",
      note: "Replace this mock response with a real offer/answer and ICE candidate exchange."
    }
  });
}
