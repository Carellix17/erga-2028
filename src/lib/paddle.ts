import { supabase } from "@/integrations/supabase/client";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Paddle: any;
  }
}

export function getPaddleEnvironment(): "sandbox" | "live" {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

let initPromise: Promise<void> | null = null;

export function initializePaddle(): Promise<void> {
  if (initPromise) return initPromise;
  if (!clientToken) return Promise.reject(new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set"));
  initPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.onload = () => {
      window.Paddle.Environment.set(getPaddleEnvironment() === "sandbox" ? "sandbox" : "production");
      window.Paddle.Initialize({ token: clientToken });
      resolve();
    };
    script.onerror = (e) => {
      initPromise = null;
      reject(e);
    };
    document.head.appendChild(script);
  });
  return initPromise;
}

export async function getPaddlePriceId(priceId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("get-paddle-price", {
    body: { priceId, environment: getPaddleEnvironment() },
  });
  if (error || !data?.paddleId) throw new Error(`Failed to resolve price: ${priceId}`);
  return data.paddleId;
}

export async function openCustomerPortal(): Promise<void> {
  const { data, error } = await supabase.functions.invoke("customer-portal", {
    body: { environment: getPaddleEnvironment() },
  });
  if (error || !data?.url) throw new Error("portal_unavailable");
  window.open(data.url, "_blank", "noopener,noreferrer");
}
