import { Arrow, Diagram, Group, Legend, Node } from "@/components/docs/diagram";

const ID = "ais-architecture";

/** Sources → normalisation → keyed producer → three topics → Flink SQL (windows, pattern matching) → PostgreSQL. */
export function AisArchitecture() {
  return (
    <div className="space-y-2">
      <Diagram
        id={ID}
        title="Architecture : aisstream.io, un enregistrement ou le trafic synthétique, normalisés puis publiés en Avro par un producteur Kafka dans trois topics, schémas gardés par le Schema Registry ; Flink SQL lit les positions et écrit ses résultats dans PostgreSQL ; Grafana affiche la carte et les métriques Prometheus"
        caption="Tout ce qui figure ici tourne aujourd’hui : ingestion, Kafka avec ses schémas Avro, Flink SQL et la détection d’anomalies, la carte Grafana et les métriques Prometheus."
        width={960}
        height={450}
      >
        <Group x={10} y={20} w={200} h={250} label="Sources" />
        <Node x={25} y={44} w={170} h={56} label="aisstream.io" sub="WebSocket, temps réel" sub2="zone : Petites Antilles" tone="source" />
        <Node x={25} y={120} w={170} h={56} label="Enregistrement" sub="fichier JSON lines" sub2="commande replay" tone="source" />
        <Node x={25} y={196} w={170} h={56} label="Trafic synthétique" sub="même format qu'aisstream" sub2="commandes demo, synthesize" tone="source" />
        <Arrow id={ID} points={[[195, 72], [220, 72], [220, 138], [243, 138]]} />
        <Arrow id={ID} points={[[195, 148], [243, 148]]} />
        <Arrow id={ID} points={[[195, 224], [220, 224], [220, 158], [243, 158]]} />

        <Node x={245} y={116} w={170} h={64} label="Normalisation" sub="pydantic, sentinelles AIS → null" sub2="noms sans « @ »" tone="process" />
        <Arrow id={ID} points={[[415, 148], [448, 148]]} />

        <Node x={450} y={30} w={180} h={56} label="Schema Registry" sub="schémas Avro" sub2="compatibilité totale" tone="infra" />
        <Arrow id={ID} points={[[540, 116], [540, 88]]} dashed />
        <Node x={450} y={116} w={180} h={64} label="Producteur Kafka" sub="clé = MMSI, Avro" sub2="idempotent, acks=all" tone="process" />
        <Arrow id={ID} points={[[630, 138], [648, 138], [648, 72], [678, 72]]} />
        <Arrow id={ID} points={[[630, 148], [678, 148]]} />
        <Arrow id={ID} points={[[630, 158], [648, 158], [648, 224], [678, 224]]} />

        <Group x={665} y={20} w={285} h={250} label="Topics Kafka" />
        <Node x={680} y={44} w={255} h={56} label="ais.positions" sub="journal d'événements, 7 jours" sub2="3 partitions" tone="store" />
        <Node x={680} y={120} w={255} h={56} label="ais.ships" sub="compacté : dernière fiche" sub2="de chaque navire" tone="store" />
        <Node x={680} y={196} w={255} h={56} label="ais.dlq" sub="messages rejetés, tels quels" sub2="14 jours" tone="alert" />

        {/* Flink reads ais.positions: from the column of topics down to the Flink box. */}
        <Arrow id={ID} points={[[700, 270], [700, 280], [540, 280], [540, 290]]} />
        <Node x={450} y={292} w={180} h={56} label="Flink SQL" sub="fenêtres, motifs" sub2="watermark 30 s" tone="process" />
        <Arrow id={ID} points={[[630, 320], [678, 320]]} />
        <Node x={680} y={292} w={255} h={56} label="PostgreSQL" sub="activité, stats, anomalies" sub2="upsert sur clé primaire" tone="serve" />
        <Arrow id={ID} points={[[807, 348], [807, 370]]} />
        <Node x={680} y={372} w={255} h={56} label="Grafana" sub="carte du trafic, anomalies" sub2="métriques du pipeline" tone="serve" />
        <Node x={450} y={372} w={180} h={56} label="Prometheus" sub="métriques de Kafka" sub2="et de Flink" tone="infra" />
        <Arrow id={ID} points={[[630, 400], [678, 400]]} />
      </Diagram>
      <Legend
        items={[
          ["source", "Sources"],
          ["process", "Traitement"],
          ["store", "Topics Kafka"],
          ["alert", "Rejets"],
          ["serve", "Résultats"],
          ["infra", "Schémas et métriques"],
        ]}
      />
    </div>
  );
}
