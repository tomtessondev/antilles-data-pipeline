import { Arrow, ArrowMarker, Box, Figure } from "./diagram";

export function ArchitectureDiagram() {
  const m = "sensor-arch-arrow";
  return (
    <Figure
      title="Architecture de caribbean-sensor-pipeline"
      caption="Des stations aux tableaux de bord. Chaque flèche franchit une frontière contrôlée : TLS et identifiant pour le broker, rôle « insertion seule » pour l'ingestor, rôle « lecture seule » pour Grafana."
      viewBox="0 0 1100 310"
      minWidth={820}
    >
      <ArrowMarker id={m} />
      <Box x={10} y={20} w={175} h={110} title="6 stations simulées" lines={["Python, météo + pannes", "1 lecture / 10 s", "même graine = mêmes données"]} />
      <Box x={10} y={180} w={175} h={110} title="Station ESP32" lines={["BME280 + PMS5003", "tampon d'une heure", "mqtts:// + identifiant"]} tone="accent" />
      <Box x={265} y={70} w={170} h={170} title="Mosquitto" lines={["broker MQTT", "TLS sur le port 8883", "un identifiant par client", "ACL antilles/%u/…", "last will « offline »"]} tone="primary" />
      <Box x={515} y={70} w={170} h={170} title="Ingestor" lines={["validation pydantic", "lots : 500 lectures", "ou toutes les 2 s", "rejets gardés tels quels", "session persistante"]} />
      <Box x={765} y={15} w={185} h={280} title="TimescaleDB" lines={["telemetry (hypertable)", "telemetry_hourly (agrégat)", "station_status", "ingest_errors", "reading_flags", "job qualité / 5 min", "vues : station_health,", "telemetry_clean,", "station_quality_daily"]} tone="primary" />
      <Box x={985} y={70} w={105} h={170} title="Grafana" lines={["2 tableaux", "de bord", "3 alertes", "tout en", "fichiers"]} tone="accent" />
      <Arrow from={[185, 75]} to={[265, 130]} marker={m} />
      <Arrow from={[185, 235]} to={[265, 180]} marker={m} />
      <text x={225} y={160} textAnchor="middle" className="fill-ink-muted text-[11px]">QoS 1</text>
      <Arrow from={[435, 155]} to={[515, 155]} marker={m} label="abonné" />
      <Arrow from={[685, 155]} to={[765, 155]} marker={m} label="INSERT" />
      <Arrow from={[950, 155]} to={[985, 155]} marker={m} label="SELECT" labelOffset={-30} />
    </Figure>
  );
}

export function MqttDiagram() {
  const m = "sensor-mqtt-arrow";
  return (
    <Figure
      title="Topics MQTT et contrôle d'accès"
      caption="Chaque station ne peut écrire que sous son propre identifiant ; une publication sur le topic d'une autre station est ignorée par le broker. L'ingestor lit tout et n'écrit rien."
      viewBox="0 0 900 300"
      minWidth={700}
    >
      <ArrowMarker id={m} />
      <Box x={10} y={100} w={185} h={100} title="gp-pap-01" lines={["identifiant = id station", "mot de passe propre"]} tone="accent" />
      <Box x={330} y={15} w={260} h={70} title="antilles/gp-pap-01/telemetry" lines={["QoS 1, une lecture JSON v1"]} tone="primary" />
      <Box x={330} y={115} w={260} h={70} title="antilles/gp-pap-01/status" lines={["« online » / « offline », retenu"]} tone="primary" />
      <Box x={330} y={215} w={260} h={70} title="antilles/mq-fdf-01/telemetry" lines={["topic d'une autre station"]} tone="alert" />
      <Box x={700} y={10} w={190} h={95} title="Ingestor" lines={["abonné à antilles/+/…", "lecture seule"]} />
      <Box x={700} y={140} w={190} h={105} title="Broker" lines={["last will « offline »", "publié si la station", "disparaît sans prévenir"]} />
      <Arrow from={[195, 125]} to={[330, 55]} marker={m} label="autorisé" labelOffset={-6} />
      <Arrow from={[195, 150]} to={[330, 150]} marker={m} label="autorisé" />
      <Arrow from={[195, 175]} to={[330, 245]} marker={m} label="refusé par l'ACL" labelOffset={24} dashed tone="alert" />
      <Arrow from={[590, 50]} to={[700, 55]} marker={m} label="lit" />
      <Arrow from={[700, 190]} to={[590, 155]} marker={m} label="publie" labelOffset={20} />
    </Figure>
  );
}

export function FirmwareDiagram() {
  const m = "sensor-fw-arrow";
  return (
    <Figure
      title="L'intérieur du firmware ESP32"
      caption="Toute la logique (décodeur, tampon, format JSON) est du C++ sans dépendance Arduino, testée sur ordinateur. Seul main.cpp parle au matériel."
      viewBox="0 0 960 290"
      minWidth={740}
    >
      <ArrowMarker id={m} />
      <Box x={10} y={20} w={150} h={80} title="PMS5003" lines={["UART 9600 bauds", "trames de 32 octets"]} />
      <Box x={10} y={120} w={150} h={70} title="BME280" lines={["I2C, adresse 0x76"]} />
      <Box x={10} y={210} w={150} h={70} title="NTP" lines={["créneau de 10 s"]} />
      <Box x={205} y={10} w={170} h={95} title="Décodeur" lines={["en-tête 0x42 0x4D", "checksum 16 bits", "→ PM2.5, PM10"]} tone="primary" />
      <Box x={420} y={100} w={170} h={110} title="Lecture" lines={["ts = créneau", "seq = n° de créneau", "capteur muet :", "champ absent"]} tone="primary" />
      <Box x={635} y={100} w={160} h={110} title="Tampon circulaire" lines={["360 lectures (1 h)", "sans allocation", "écrase la plus", "ancienne si plein"]} tone="primary" />
      <Box x={830} y={90} w={120} h={130} title="esp-mqtt" lines={["QoS 1", "renvoi si pas", "d'accusé", "TLS + login"]} tone="accent" />
      <Arrow from={[160, 60]} to={[205, 60]} marker={m} />
      <Arrow from={[375, 75]} to={[420, 120]} marker={m} />
      <Arrow from={[160, 155]} to={[420, 155]} marker={m} label="température, humidité, pression" />
      <Arrow from={[160, 245]} to={[420, 190]} marker={m} label="horodatage" labelOffset={20} />
      <Arrow from={[590, 155]} to={[635, 155]} marker={m} />
      <Arrow from={[795, 155]} to={[830, 155]} marker={m} />
    </Figure>
  );
}

export function QualityDiagram() {
  const m = "sensor-dq-arrow";
  return (
    <Figure
      title="Le contrôle qualité des données"
      caption="Les lectures douteuses sont marquées, jamais supprimées. Les courbes lisent la vue validée ; le score combine les messages perdus et les valeurs suspectes."
      viewBox="0 0 960 260"
      minWidth={740}
    >
      <ArrowMarker id={m} />
      <Box x={10} y={80} w={170} h={100} title="telemetry" lines={["données brutes", "jamais modifiées"]} tone="primary" />
      <Box x={225} y={40} w={210} h={180} title="flag_readings()" lines={["job TimescaleDB, 5 min", "lectures reçues récemment", "pm_stuck : 30 valeurs", "identiques d'affilée", "pm_spike : > 3 × voisines", "implausible_weather"]} tone="accent" />
      <Box x={480} y={80} w={160} h={100} title="reading_flags" lines={["une ligne par", "lecture et règle"]} />
      <Box x={690} y={10} w={260} h={100} title="telemetry_clean" lines={["valeurs suspectes masquées,", "le reste de la lecture gardé", "→ courbes PM de Grafana"]} tone="primary" />
      <Box x={690} y={150} w={260} h={100} title="station_quality_daily" lines={["lectures arrivées et valides", "÷ lectures attendues", "→ score par station et par jour"]} tone="primary" />
      <Arrow from={[180, 130]} to={[225, 130]} marker={m} />
      <Arrow from={[435, 130]} to={[480, 130]} marker={m} />
      <Arrow from={[640, 115]} to={[690, 65]} marker={m} />
      <Arrow from={[640, 145]} to={[690, 195]} marker={m} />
    </Figure>
  );
}
