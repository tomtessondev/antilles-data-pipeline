import { Arrow, Diagram, Label, Legend, Node, type Tone } from "@/components/docs/diagram";

type ListNodeProps = { x: number; y: number; w: number; h: number; label: string; lines: string[]; tone?: Tone };

/** A node with more text lines than the shared Node (label + two) can hold: the shared Node
    draws the box, the text is laid out here, centred vertically. */
function ListNode({ x, y, w, h, label, lines, tone }: ListNodeProps) {
  const top = y + (h - (18 + lines.length * 16)) / 2;
  const cx = x + w / 2;
  return (
    <g>
      <Node x={x} y={y} w={w} h={h} label="" tone={tone} />
      <Label x={cx} y={top + 12} anchor="middle" size={13} bold>
        {label}
      </Label>
      {lines.map((line, i) => (
        <Label key={line} x={cx} y={top + 30 + i * 16} anchor="middle" size={11} muted>
          {line}
        </Label>
      ))}
    </g>
  );
}

const ARCH = "sensor-architecture";

/** Stations → Mosquitto → ingestor → TimescaleDB → Grafana. */
export function SensorArchitecture() {
  return (
    <div className="space-y-2">
      <Diagram
        id={ARCH}
        title="Architecture : six stations simulées et une station ESP32 publient en MQTT vers Mosquitto ; l’ingestor valide les lectures et les écrit dans TimescaleDB ; Grafana lit la base"
        caption="Des stations aux tableaux de bord. Chaque flèche franchit une frontière contrôlée : TLS et identifiant pour le broker, rôle « insertion seule » pour l'ingestor, rôle « lecture seule » pour Grafana."
        width={1120}
        height={310}
      >
        <ListNode x={10} y={20} w={175} h={110} label="6 stations simulées" lines={["Python, météo + pannes", "1 lecture / 10 s", "même graine = mêmes données"]} tone="source" />
        <ListNode x={10} y={180} w={175} h={110} label="Station ESP32" lines={["BME280 + PMS5003", "tampon d'une heure", "mqtts:// + identifiant"]} tone="source" />
        <ListNode x={265} y={70} w={170} h={170} label="Mosquitto" lines={["broker MQTT", "TLS sur le port 8883", "un identifiant par client", "ACL antilles/%u/…", "last will « offline »"]} tone="process" />
        <ListNode x={515} y={70} w={170} h={170} label="Ingestor" lines={["validation pydantic", "lots : 500 lectures", "ou toutes les 2 s", "rejets gardés tels quels", "session persistante"]} tone="process" />
        <ListNode
          x={765}
          y={15}
          w={185}
          h={280}
          label="TimescaleDB"
          lines={["telemetry (hypertable)", "telemetry_hourly (agrégat)", "station_status", "ingest_errors", "reading_flags", "job qualité / 5 min", "vues : station_health,", "telemetry_clean,", "station_quality_daily"]}
          tone="store"
        />
        <ListNode x={1000} y={70} w={110} h={170} label="Grafana" lines={["2 tableaux", "de bord", "3 alertes", "tout en", "fichiers"]} tone="serve" />

        <Arrow id={ARCH} points={[[185, 75], [225, 75], [225, 130], [263, 130]]} />
        <Arrow id={ARCH} points={[[185, 235], [225, 235], [225, 180], [263, 180]]} />
        <Label x={219} y={159} size={11} anchor="end" muted>
          QoS 1
        </Label>
        <Arrow id={ARCH} points={[[435, 155], [513, 155]]} label="abonné" labelAt={[475, 147]} />
        <Arrow id={ARCH} points={[[685, 155], [763, 155]]} label="INSERT" labelAt={[725, 147]} />
        <Arrow id={ARCH} points={[[950, 155], [998, 155]]} label="SELECT" labelAt={[975, 147]} />
      </Diagram>
      <Legend
        items={[
          ["source", "Stations"],
          ["process", "Transport et ingestion"],
          ["store", "Base temporelle"],
          ["serve", "Tableaux de bord et alertes"],
        ]}
      />
    </div>
  );
}

const MQTT = "sensor-mqtt";

export function MqttDiagram() {
  return (
    <Diagram
      id={MQTT}
      title="Topics MQTT et contrôle d'accès"
      caption="Chaque station ne peut écrire que sous son propre identifiant ; une publication sur le topic d'une autre station est ignorée par le broker. L'ingestor lit tout et n'écrit rien."
      width={900}
      height={300}
    >
      <Node x={10} y={100} w={185} h={100} label="gp-pap-01" sub="identifiant = id station" sub2="mot de passe propre" tone="source" />
      <Node x={330} y={15} w={260} h={70} label="antilles/gp-pap-01/telemetry" sub="QoS 1, une lecture JSON v1" tone="store" />
      <Node x={330} y={115} w={260} h={70} label="antilles/gp-pap-01/status" sub="« online » / « offline », retenu" tone="store" />
      <Node x={330} y={215} w={260} h={70} label="antilles/mq-fdf-01/telemetry" sub="topic d'une autre station" tone="alert" dashed />
      <Node x={700} y={10} w={190} h={95} label="Ingestor" sub="abonné à antilles/+/…" sub2="lecture seule" tone="process" />
      <ListNode x={700} y={140} w={190} h={105} label="Broker" lines={["last will « offline »", "publié si la station", "disparaît sans prévenir"]} tone="process" />

      <Arrow id={MQTT} points={[[195, 125], [328, 56]]} label="autorisé" labelAt={[262, 84]} />
      <Arrow id={MQTT} points={[[195, 150], [328, 150]]} label="autorisé" labelAt={[262, 142]} />
      <Arrow id={MQTT} points={[[195, 175], [328, 244]]} label="refusé par l'ACL" labelAt={[262, 234]} dashed />
      <Arrow id={MQTT} points={[[590, 50], [698, 55]]} label="lit" labelAt={[645, 44]} />
      <Arrow id={MQTT} points={[[700, 190], [592, 155]]} label="publie" labelAt={[645, 194]} />
    </Diagram>
  );
}

const FW = "sensor-firmware";

export function FirmwareDiagram() {
  return (
    <Diagram
      id={FW}
      title="L'intérieur du firmware ESP32"
      caption="Toute la logique (décodeur, tampon, format JSON) est du C++ sans dépendance Arduino, testée sur ordinateur. Seul main.cpp parle au matériel."
      width={960}
      height={290}
    >
      <Node x={10} y={20} w={150} h={80} label="PMS5003" sub="UART 9600 bauds" sub2="trames de 32 octets" tone="source" />
      <Node x={10} y={120} w={150} h={70} label="BME280" sub="I2C, adresse 0x76" tone="source" />
      <Node x={10} y={210} w={150} h={70} label="NTP" sub="créneau de 10 s" tone="source" />
      <ListNode x={205} y={10} w={170} h={95} label="Décodeur" lines={["en-tête 0x42 0x4D", "checksum 16 bits", "→ PM2.5, PM10"]} tone="process" />
      <ListNode x={420} y={100} w={170} h={110} label="Lecture" lines={["ts = créneau", "seq = n° de créneau", "capteur muet :", "champ absent"]} tone="process" />
      <ListNode x={635} y={100} w={160} h={110} label="Tampon circulaire" lines={["360 lectures (1 h)", "sans allocation", "écrase la plus", "ancienne si plein"]} tone="store" />
      <ListNode x={830} y={90} w={120} h={130} label="esp-mqtt" lines={["QoS 1", "renvoi si pas", "d'accusé", "TLS + login"]} tone="serve" />

      <Arrow id={FW} points={[[160, 60], [203, 60]]} />
      <Arrow id={FW} points={[[375, 75], [418, 118]]} />
      <Arrow id={FW} points={[[160, 155], [418, 155]]} label="température, humidité, pression" labelAt={[290, 147]} />
      <Arrow id={FW} points={[[160, 245], [418, 192]]} label="horodatage" labelAt={[290, 238]} />
      <Arrow id={FW} points={[[590, 155], [633, 155]]} />
      <Arrow id={FW} points={[[795, 155], [828, 155]]} />
    </Diagram>
  );
}

const DQ = "sensor-quality";

export function QualityDiagram() {
  return (
    <Diagram
      id={DQ}
      title="Le contrôle qualité des données"
      caption="Les lectures douteuses sont marquées, jamais supprimées. Les courbes lisent la vue validée ; le score combine les messages perdus et les valeurs suspectes."
      width={960}
      height={260}
    >
      <Node x={10} y={80} w={170} h={100} label="telemetry" sub="données brutes" sub2="jamais modifiées" tone="store" />
      <ListNode
        x={225}
        y={30}
        w={210}
        h={200}
        label="flag_readings()"
        lines={["job TimescaleDB, 5 min", "reçues depuis 12 h", "pm_stuck : 30 valeurs", "identiques d'affilée", "pm_spike : > 3 × voisines,", "après 3 lectures suivantes", "implausible_weather"]}
        tone="process"
      />
      <Node x={480} y={80} w={160} h={100} label="reading_flags" sub="une ligne par" sub2="lecture et règle" tone="store" />
      <ListNode x={690} y={10} w={260} h={100} label="telemetry_clean" lines={["valeurs suspectes masquées,", "le reste de la lecture gardé", "→ courbes PM de Grafana"]} tone="serve" />
      <ListNode x={690} y={150} w={260} h={100} label="station_quality_daily" lines={["lectures arrivées et valides", "÷ lectures attendues", "→ score par station et par jour"]} tone="serve" />

      <Arrow id={DQ} points={[[180, 130], [223, 130]]} />
      <Arrow id={DQ} points={[[435, 130], [478, 130]]} />
      <Arrow id={DQ} points={[[640, 115], [665, 115], [665, 60], [688, 60]]} />
      <Arrow id={DQ} points={[[640, 145], [665, 145], [665, 200], [688, 200]]} />
    </Diagram>
  );
}
