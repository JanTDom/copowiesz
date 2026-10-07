import type { Metadata } from "next";
import { PublicInfoShell } from "@/components/public-info-shell";
import { PaymentResult } from "@/components/payment-result";
export const metadata:Metadata={title:"Stan zamówienia — COPOWIESZ",robots:{index:false,follow:false}};
export default async function PaymentResultPage({searchParams}:{searchParams:Promise<{orderId?:string|string[]}>}){const params=await searchParams;const value=params.orderId;const orderId=typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)?value:null;return <PublicInfoShell compact eyebrow="Po powrocie z bramki" title="Sprawdźmy Twoje zamówienie." lead="Potwierdzenie odczytujemy z serwera. Ta strona nie deklaruje zapłaty na podstawie przekierowania."><PaymentResult orderId={orderId}/></PublicInfoShell>}
