import { useState } from "react";
import { ProfileView } from "@/components/profile/ProfileView";
import { CognitiveOnboarding } from "@/components/onboarding/CognitiveOnboarding";
import { useCognitiveProfile } from "@/hooks/useCognitiveProfile";

/**
 * Pagina profilo (rotta /app/profilo).
 *
 * È la pagina profilo storica di Erga, raggiungibile dall'avatar in alto a
 * destra della Home (e delle altre stanze). Le Impostazioni vivono in alto a
 * destra dentro la pagina; la calibrazione dell'Esagono Cognitivo si apre da
 * qui mantenendo lo stesso flusso della Home.
 */
export default function Profile() {
  const { refresh } = useCognitiveProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-background">
      <div className="w-full flex-1">
        <ProfileView onOpenCognitive={() => setShowOnboarding(true)} />
      </div>

      {showOnboarding && (
        <CognitiveOnboarding
          allowClose
          onClose={() => setShowOnboarding(false)}
          onCompleted={async () => {
            await refresh();
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
}
