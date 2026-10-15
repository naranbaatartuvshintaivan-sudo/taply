import { after } from "next/server";
import { adminAction } from "@/lib/admin-action";
import { claimMockups, runMockups } from "@/lib/custom-mockups";

export const runtime = "nodejs";
export const maxDuration = 60;

// Админ "Дахин үүсгэх" → дараагийн багцаар (өөр бүтэц) 3 загвар. Эрхийг шууд авч ('generating'),
// рендэрийг хариу буцсаны дараа хийнэ — admin хуудас өөрөө шинэчлэгдэж хүлээнэ.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return adminAction(req, id, async () => {
    const claimed = await claimMockups(id, "regenerate");
    if (!claimed) return "regen_busy";
    after(() => runMockups(claimed));
    return "regen";
  });
}
