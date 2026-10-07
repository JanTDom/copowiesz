import { handleWebhook } from "@/lib/payments/handlers";

export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ environment: string }> }): Promise<Response> {
  return handleWebhook(request, (await context.params).environment);
}
