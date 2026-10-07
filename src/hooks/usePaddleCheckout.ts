import { useState } from "react";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";
import { useAuth } from "@/contexts/AuthContext";

export function usePaddleCheckout() {
  const { session } = useAuth();
  const user = session?.user;
  const [loading, setLoading] = useState(false);

  const openCheckout = async (priceId = "pro_monthly") => {
    if (!user) throw new Error("not_signed_in");
    setLoading(true);
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(priceId);
      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: user.email ? { email: user.email } : undefined,
        customData: { userId: user.id },
        settings: {
          displayMode: "overlay",
          successUrl: `${window.location.origin}/app?checkout=success`,
          allowLogout: false,
          variant: "one-page",
          locale: "it",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}
