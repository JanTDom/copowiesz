import { jsonResult } from "@/lib/server/http";
import { getPaymentSettings } from "@/lib/payments/config";

export const runtime = "nodejs";
export async function GET(): Promise<Response> { return jsonResult(getPaymentSettings().public); }
