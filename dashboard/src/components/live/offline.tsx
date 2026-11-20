/** The banner laid over the map when there is no live data to show. */
export function LiveOffline({ reason, lastOk }: { reason: "soon" | "down"; lastOk: Date | null }) {
  return (
    <div role="status" className="rounded-xl border border-border bg-surface/95 px-4 py-3 text-sm shadow-sm">
      <p className="font-semibold">{reason === "soon" ? "Démo bientôt en ligne" : "Démo momentanément indisponible"}</p>
      <p className="text-ink-secondary">
        {reason === "soon"
          ? "Le service qui publie les données n’est pas encore déployé."
          : lastOk
            ? `Dernière réponse reçue à ${lastOk.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} ; nouvel essai automatique.`
            : "Le service ne répond pas ; nouvel essai automatique."}
      </p>
    </div>
  );
}
