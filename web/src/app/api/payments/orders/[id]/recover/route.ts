import { handleRecoverOrder } from "@/lib/payments/handlers";

export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  return handleRecoverOrder(request, (await context.params).id);
}
