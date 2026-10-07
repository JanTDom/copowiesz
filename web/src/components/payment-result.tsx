"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, LoaderCircle, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { getSupabase } from "@/lib/supabase";
import styles from "./public-info.module.css";

type Result = {
  orderId: string; status: string; environment: string;
  amountCents: number; paidAt: string | null;
  receiptUrl: string; notice: string; retryWithNewOrder?: boolean; canRecoverRegistration?: boolean;
};
const labels: Record<string, string> = {
  pending: "Czekamy na potwierdzenie operatora",
  paid: "Operator potwierdził transakcję",
  registration_failed: "Nie udało się przygotować płatności",
  cancelled: "Zamówienie anulowane",
  refunded: "Płatność zwrócona",
};

export function PaymentResult({ orderId }: { orderId: string | null }) {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const refresh = useCallback(async (recover = false) => {
    if (!orderId || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      if (recover) {
        const client = getSupabase();
        const session = client ? await client.auth.getSession() : null;
        const token = session?.data.session?.access_token;
        if (!token) throw new Error("Zaloguj się na konto użyte przy zamówieniu.");
        const response = await fetch(`/api/payments/orders/${orderId}/recover`, {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: "{}", cache: "no-store", signal: AbortSignal.timeout(15000),
        });
        const recovered = await response.json();
        if (!response.ok) throw new Error(recovered.notice || recovered.error || "Nie udało się odczytać próby. Nie rozpoczynaj kolejnego zakupu; sprawdź ponownie za chwilę.");
        if (recovered.redirectUrl) {
          const url = new URL(recovered.redirectUrl);
          const expected = recovered.environment === "sandbox" ? "sandbox.przelewy24.pl" : "secure.przelewy24.pl";
          if (url.protocol !== "https:" || url.hostname !== expected) throw new Error("Niepoprawny adres operatora płatności. Skontaktuj się z nami.");
          window.location.assign(url.href);
          return;
        }
      }
      const data = await apiFetch(`/api/payments/orders/${orderId}`);
      setResult(data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się sprawdzić zamówienia.");
    } finally { inFlight.current = false; setBusy(false); }
  }, [orderId]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!result || result.status !== "pending" || !orderId) return;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (attempts > 12) clearInterval(interval);
      else void refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [orderId, result?.status, refresh]);

  async function receipt() {
    if (!orderId) return;
    setBusy(true);
    try {
      const client = getSupabase();
      const session = client ? await client.auth.getSession() : null;
      const token = session?.data.session?.access_token;
      if (!token) throw new Error("Zaloguj się na konto użyte przy zamówieniu.");
      const response = await fetch(`/api/payments/orders/${orderId}/receipt`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error("Nie udało się pobrać potwierdzenia. Sprawdź konto i spróbuj ponownie.");
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a");
      a.href = url; a.download = `copowiesz-zamowienie-${orderId}.txt`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się pobrać potwierdzenia.");
    } finally { setBusy(false); }
  }

  return <div className={styles.legalCopy}>
    {!orderId ? <p className="info-box">Nie podano poprawnego numeru zamówienia. <Link href="/platnosci">Sprawdź dostęp i płatności</Link>.</p> : <>
      <p className="caption">Zamówienie {orderId}</p>
      {result ? <>
        <h2>{labels[result.status] ?? "Sprawdzamy stan zamówienia"}</h2>
        <p>{result.environment === "sandbox" ? "To transakcja testowa. Nie pobrano rzeczywistej opłaty za dostęp." : "Stan jest odczytywany z serwera, po weryfikacji operatora płatności."}</p>
        <p>{result.notice}</p>
        <div className="inline-actions">
          <button className={styles.secondaryLink} onClick={() => void refresh(result.status === "pending")} disabled={busy}><RefreshCw size={17}/>{result.canRecoverRegistration ? "Wznów przygotowanie płatności" : "Sprawdź ponownie"}</button>
          <button className={styles.secondaryLink} onClick={() => void receipt()} disabled={busy}><Download size={17}/>Pobierz warunki zamówienia</button>
          {result.status === "registration_failed" && result.retryWithNewOrder === true && <Link className={styles.primaryLink} href="/platnosci">Rozpocznij nową próbę</Link>}
        </div>
      </> : !error && <p role="status"><LoaderCircle className="spin" size={18}/>Sprawdzamy zamówienie…</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <p>Samo wejście na tę stronę nie przyznaje dostępu. Jeśli transakcja pozostaje niepotwierdzona, zachowaj numer zamówienia i <Link href="/kontakt">napisz do nas</Link>.</p>
    </>}
    <p><Link href="/">Wróć do aplikacji</Link></p>
  </div>;
}
