import { handleCheckout } from "@/lib/payments/handlers";

export const runtime = "nodejs";
export async function POST(request: Request): Promise<Response> { return handleCheckout(request); }
