import { ArrowMarker, Box, Figure } from "./diagram";

const W = 960;
const H = 360;

/** Sources → normalisation → keyed producer → three topics → Flink SQL → PostgreSQL. */
export function ArchitectureDiagram() {
  const arrow = "url(#ais-arch-arrow)";
  return (
    <Figure
      title="Architecture"
      caption="Tout ce qui figure ici tourne aujourd'hui. Les anomalies et la carte en direct sont les prochaines étapes de la feuille de route."
      minWidth={720}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Schéma d'architecture du flux AIS vers Kafka puis Flink">
        <ArrowMarker id="ais-arch-arrow" />

        <text x={16} y={22} fill="var(--ink-muted)" fontSize={12} fontWeight={600}>SOURCES</text>
        <Box x={16} y={34} w={190} h={64} title="aisstream.io" lines={["WebSocket, temps réel", "zone : Petites Antilles"]} accent="var(--series-1)" />
        <Box x={16} y={112} w={190} h={64} title="Enregistrement" lines={["fichier JSON lines", "commande replay"]} />
        <Box x={16} y={190} w={190} h={64} title="Trafic synthétique" lines={["même format qu'aisstream", "commandes demo, synthesize"]} />

        <Box x={250} y={96} w={180} h={96} title="Normalisation" lines={["pydantic", "sentinelles AIS → null", "noms sans « @ »"]} />
        <Box x={474} y={96} w={180} h={96} title="Producteur Kafka" lines={["clé = MMSI", "idempotent, acks=all", "compression zstd"]} accent="var(--series-1)" />

        <text x={700} y={22} fill="var(--ink-muted)" fontSize={12} fontWeight={600}>TOPICS KAFKA</text>
        <Box x={700} y={34} w={240} h={64} title="ais.positions" lines={["journal d'événements, 7 jours", "3 partitions"]} accent="var(--series-1)" />
        <Box x={700} y={112} w={240} h={64} title="ais.ships" lines={["compacté : dernière fiche", "de chaque navire"]} accent="var(--series-1)" />
        <Box x={700} y={190} w={240} h={64} title="ais.dlq" lines={["messages rejetés, tels quels", "14 jours"]} accent="var(--series-2)" />

        <Box x={474} y={282} w={180} h={64} title="Flink SQL" lines={["fenêtres 5 min et 1 h", "watermark 30 s"]} accent="var(--series-1)" />
        <Box x={700} y={282} w={240} h={64} title="PostgreSQL" lines={["port_activity, ship_hourly", "upsert sur clé primaire"]} accent="var(--series-1)" />

        <g stroke="var(--ink-muted)" strokeWidth={1.5} fill="none">
          <path d="M206 66 C228 66 228 130 248 130" markerEnd={arrow} />
          <path d="M206 144 L248 144" markerEnd={arrow} />
          <path d="M206 222 C228 222 228 158 248 158" markerEnd={arrow} />
          <path d="M430 144 L472 144" markerEnd={arrow} />
          <path d="M654 120 C676 120 676 66 698 66" markerEnd={arrow} />
          <path d="M654 144 L698 144" markerEnd={arrow} />
          <path d="M654 168 C676 168 676 222 698 222" markerEnd={arrow} />
        </g>
        <g stroke="var(--ink-muted)" strokeWidth={1.5} fill="none">
          {/* Flink reads ais.positions: from the column of topics down to the Flink box. */}
          <path d="M820 256 L820 268 L564 268 L564 280" markerEnd={arrow} />
          <path d="M654 314 L698 314" markerEnd={arrow} />
        </g>
      </svg>
    </Figure>
  );
}
