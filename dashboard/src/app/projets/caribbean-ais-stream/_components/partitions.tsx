import { Arrow, Diagram } from "@/components/docs/diagram";

const PARTITIONS_ID = "ais-partitions";
const COMPACTION_ID = "ais-compaction";

type Ship = { mmsi: string; name: string; color: string; partition: number };

const SHIPS: Ship[] = [
  { mmsi: "227000101", name: "ferry", color: "var(--town-1)", partition: 0 },
  { mmsi: "228000202", name: "cargo", color: "var(--town-2)", partition: 2 },
  { mmsi: "636000303", name: "paquebot", color: "var(--town-3)", partition: 2 },
];

// Order in which the producer sends them: interleaved, as on the radio.
const SENT: [number, number][] = [
  [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [0, 3], [2, 2], [1, 3],
];

/** Messages keyed by MMSI: each ship lands in one partition, in the order it was sent. */
export function PartitionsDiagram() {
  const lane = (p: number) => 70 + p * 58;
  const perPartition: Record<number, [number, number][]> = { 0: [], 1: [], 2: [] };
  for (const message of SENT) perPartition[SHIPS[message[0]].partition].push(message);

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Une clé par navire, un ordre garanti</h3>
      <Diagram
        id={PARTITIONS_ID}
        title="Répartition des messages de trois navires dans trois partitions Kafka"
        caption="Le producteur envoie les messages entremêlés. Kafka place chaque clé (le MMSI) toujours dans la même partition : les positions d'un navire y restent dans l'ordre d'envoi. La partition 1 est vide ici, d'autres navires l'occupent."
        width={900}
        height={250}
      >
        <text x={16} y={24} fill="var(--ink-muted)" fontSize={12} fontWeight={600}>ENVOI</text>
        {SENT.map(([ship, n], i) => (
          <g key={`sent-${i}`}>
            <rect x={16 + i * 38} y={36} width={32} height={24} rx={4} fill={SHIPS[ship].color} />
            <text x={32 + i * 38} y={53} fill="var(--on-seq-high)" fontSize={11} textAnchor="middle" fontWeight={600}>
              {n}
            </text>
          </g>
        ))}
        <Arrow id={PARTITIONS_ID} points={[[330, 48], [420, 48], [420, 70], [438, 70]]} />
        <text x={344} y={40} fill="var(--ink-secondary)" fontSize={12}>hash(MMSI)</text>

        {[0, 1, 2].map((p) => (
          <g key={`p-${p}`}>
            <text x={444} y={lane(p) + 4} fill="var(--ink-muted)" fontSize={12} fontWeight={600}>
              partition {p}
            </text>
            <rect x={540} y={lane(p) - 16} width={344} height={32} rx={6} fill="var(--page)" stroke="var(--grid)" />
            {perPartition[p].map(([ship, n], i) => (
              <g key={`m-${p}-${i}`}>
                <rect x={548 + i * 40} y={lane(p) - 12} width={32} height={24} rx={4} fill={SHIPS[ship].color} />
                <text x={564 + i * 40} y={lane(p) + 5} fill="var(--on-seq-high)" fontSize={11} textAnchor="middle" fontWeight={600}>
                  {n}
                </text>
              </g>
            ))}
          </g>
        ))}

        {SHIPS.map((ship, i) => (
          <g key={ship.mmsi}>
            <rect x={16 + i * 150} y={210} width={12} height={12} rx={2} fill={ship.color} />
            <text x={34 + i * 150} y={221} fill="var(--ink-secondary)" fontSize={12}>
              {ship.name} {ship.mmsi}
            </text>
          </g>
        ))}
        <text x={480} y={221} fill="var(--ink-muted)" fontSize={12}>
          chiffre = numéro du message de ce navire
        </text>
      </Diagram>
    </div>
  );
}

const LOG: { mmsi: string; version: string; color: string }[] = [
  { mmsi: "227…101", version: "v1", color: "var(--town-1)" },
  { mmsi: "228…202", version: "v1", color: "var(--town-2)" },
  { mmsi: "227…101", version: "v2", color: "var(--town-1)" },
  { mmsi: "636…303", version: "v1", color: "var(--town-3)" },
  { mmsi: "227…101", version: "v3", color: "var(--town-1)" },
  { mmsi: "228…202", version: "v2", color: "var(--town-2)" },
];

/** Log compaction on ais.ships: only the latest record per key survives. */
export function CompactionDiagram() {
  const kept = LOG.filter((entry, i) => LOG.findLastIndex((e) => e.mmsi === entry.mmsi) === i);
  const cell = (x: number, y: number, entry: (typeof LOG)[number], faded: boolean, key: string) => (
    <g key={key} opacity={faded ? 0.3 : 1}>
      <rect x={x} y={y} width={110} height={44} rx={6} fill="var(--surface)" stroke={entry.color} strokeWidth={2} />
      <text x={x + 10} y={y + 19} fill="var(--ink)" fontSize={12} fontWeight={600}>
        {entry.mmsi}
      </text>
      <text x={x + 10} y={y + 35} fill="var(--ink-secondary)" fontSize={11}>
        fiche {entry.version}
      </text>
    </g>
  );
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">ais.ships, un topic compacté</h3>
      <Diagram
        id={COMPACTION_ID}
        title="Compactage du topic ais.ships : seule la dernière fiche de chaque navire est conservée"
        caption="Chaque navire renvoie sa fiche (nom, type, dimensions, destination) toutes les 6 minutes. Le compactage ne garde que la dernière par clé : le topic se comporte comme une table, qu'un nouveau consommateur relit en entier pour connaître toute la flotte."
        width={860}
        height={190}
      >
        <text x={16} y={22} fill="var(--ink-muted)" fontSize={12} fontWeight={600}>AVANT COMPACTAGE (ordre d&apos;écriture →)</text>
        {LOG.map((entry, i) => cell(16 + i * 118, 34, entry, kept.indexOf(entry) === -1, `log-${i}`))}
        <Arrow id={COMPACTION_ID} points={[[430, 88], [430, 116]]} />
        <text x={16} y={128} fill="var(--ink-muted)" fontSize={12} fontWeight={600}>APRÈS</text>
        {kept.map((entry, i) => cell(16 + i * 118, 138, entry, false, `kept-${i}`))}
      </Diagram>
    </div>
  );
}
