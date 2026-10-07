import { handleOwnOrder } from "@/lib/payments/handlers";

export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  return handleOwnOrder(request, (await context.params).id, true);
}
