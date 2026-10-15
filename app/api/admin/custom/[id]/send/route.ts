import { adminAction } from "@/lib/admin-action";
import { sendMockupEmail } from "@/lib/custom-mockups";

export const runtime = "nodejs";

// Админ "Имэйл илгээх" (form POST) → харилцагч руу 3 загвартай имэйл → admin хуудас руу буцна.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return adminAction(req, id, async () => {
    const r = await sendMockupEmail(id);
    return r === "not_found" ? "not_ready" : r;
  });
}
