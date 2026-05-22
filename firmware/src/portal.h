#pragma once
#include <WiFi.h>
#include <DNSServer.h>
#include <WebServer.h>
#include "storage.h"

// ==========================================================
//   CAPTIVE PORTAL — WiFi AP + config web UI
// ==========================================================

static DNSServer  dnsServer;
static WebServer  webServer(80);

// ─── Página HTML embebida ──────────────────────────────────
static const char PORTAL_HTML[] PROGMEM = R"rawhtml(
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Módulo ESP32 — Configuración</title>
<style>
  :root{
    --bg:#0d1117;--card:#161b22;--border:#30363d;
    --accent:#4fc3f7;--orange:#ff9800;--text:#e6edf3;
    --muted:#8b949e;--danger:#f85149;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--text);font:14px/1.5 'Segoe UI',system-ui,sans-serif;padding:0 0 40px}
  header{background:var(--card);border-bottom:1px solid var(--border);padding:16px 20px;display:flex;align-items:center;gap:12px}
  header svg{flex-shrink:0}
  header h1{font-size:1.1rem;font-weight:600;color:var(--accent)}
  header p{font-size:.8rem;color:var(--muted);margin-top:2px}
  .wrap{max-width:600px;margin:0 auto;padding:20px 16px}
  .section{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:18px;margin-bottom:16px}
  .section h2{font-size:.8rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid var(--border)}
  .field{margin-bottom:12px}
  .field:last-child{margin-bottom:0}
  label{display:block;font-size:.8rem;color:var(--muted);margin-bottom:4px}
  input[type=text],input[type=password],input[type=number],select{
    width:100%;background:#0d1117;border:1px solid var(--border);border-radius:6px;
    color:var(--text);padding:8px 10px;font-size:.9rem;outline:none;
    transition:border-color .15s;
  }
  input:focus,select:focus{border-color:var(--accent)}
  select option{background:#0d1117}
  .row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .row3{display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px}
  .ch-grid{display:grid;gap:10px}
  .ch-card{background:#0d1117;border:1px solid var(--border);border-radius:6px;padding:12px}
  .ch-card h3{font-size:.75rem;font-weight:600;color:var(--accent);margin-bottom:10px}
  .tabs{display:flex;gap:0;border:1px solid var(--border);border-radius:6px;overflow:hidden;margin-bottom:16px}
  .tab{flex:1;text-align:center;padding:8px;cursor:pointer;font-size:.8rem;color:var(--muted);background:var(--bg);border:none;transition:background .15s,color .15s}
  .tab.active{background:var(--accent);color:#000;font-weight:600}
  .tab-content{display:none}
  .tab-content.active{display:block}
  .save-btn{width:100%;background:var(--accent);color:#000;border:none;border-radius:8px;padding:14px;font-size:1rem;font-weight:700;cursor:pointer;margin-top:4px;transition:opacity .15s}
  .save-btn:hover{opacity:.85}
  .reset-btn{width:100%;background:transparent;color:var(--danger);border:1px solid var(--danger);border-radius:8px;padding:10px;font-size:.85rem;cursor:pointer;margin-top:10px;transition:background .15s}
  .reset-btn:hover{background:var(--danger);color:#fff}
  .alert{display:none;background:#1c2a1e;border:1px solid #3fb950;color:#3fb950;border-radius:6px;padding:12px;text-align:center;font-weight:600;margin-bottom:12px}
  .alert.err{background:#2a1a1a;border-color:var(--danger);color:var(--danger)}
  .hint{font-size:.72rem;color:var(--muted);margin-top:3px}
</style>
</head>
<body>
<header>
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="6" fill="#4fc3f7" fill-opacity=".15"/>
    <rect x="4" y="12" width="24" height="8" rx="2" fill="#4fc3f7"/>
    <rect x="7" y="15" width="4" height="2" rx="1" fill="#000"/>
    <rect x="13" y="15" width="4" height="2" rx="1" fill="#000"/>
    <rect x="19" y="15" width="4" height="2" rx="1" fill="#000"/>
    <rect x="14" y="6" width="4" height="6" rx="1" fill="#ff9800"/>
  </svg>
  <div>
    <h1>Sistema Modular ESP32</h1>
    <p>Portal de configuración inicial</p>
  </div>
</header>

<div class="wrap">
  <div id="alertBox" class="alert"></div>

  <form id="cfgForm" method="POST" action="/save">

    <!-- ── WiFi ── -->
    <div class="section">
      <h2>Red WiFi</h2>
      <div class="field"><label>SSID (nombre de red)</label><input type="text" name="wifiSSID" id="wifiSSID" maxlength="32" required placeholder="Mi Red WiFi"></div>
      <div class="field"><label>Contraseña</label><input type="password" name="wifiPass" id="wifiPass" maxlength="64" placeholder="contraseña"></div>
    </div>

    <!-- ── MQTT ── -->
    <div class="section">
      <h2>Broker MQTT (Home Assistant)</h2>
      <div class="row2">
        <div class="field"><label>Host / IP</label><input type="text" name="mqttHost" id="mqttHost" maxlength="64" required placeholder="192.168.1.100"></div>
        <div class="field"><label>Puerto</label><input type="number" name="mqttPort" id="mqttPort" min="1" max="65535" value="1883"></div>
      </div>
      <div class="row2">
        <div class="field"><label>Usuario</label><input type="text" name="mqttUser" id="mqttUser" maxlength="32" placeholder="mqtt"></div>
        <div class="field"><label>Contraseña</label><input type="password" name="mqttPass" id="mqttPass" maxlength="64"></div>
      </div>
    </div>

    <!-- ── Módulo ── -->
    <div class="section">
      <h2>Identidad del módulo</h2>
      <div class="row2">
        <div class="field"><label>ID único</label><input type="text" name="deviceId" id="deviceId" maxlength="32" required placeholder="modulo_01"><p class="hint">Sin espacios. Ej: alarma_01</p></div>
        <div class="field"><label>Nombre visible</label><input type="text" name="deviceName" id="deviceName" maxlength="48" required placeholder="Módulo 01"></div>
      </div>
      <div class="field"><label>Contraseña OTA</label><input type="password" name="otaPass" id="otaPass" maxlength="32" placeholder="esp32ota"><p class="hint">Para actualizaciones por WiFi</p></div>
      <div class="field"><label>Habitación / Área</label><input type="text" name="area" id="area" maxlength="23" placeholder="Living"><p class="hint">Agrupa este módulo en la app Casa de Apple (Siri)</p></div>
      <div class="row2">
        <div class="field">
          <label>Cantidad de relés</label>
          <select name="relayCount" id="relayCount" onchange="buildChannels()">
            <option value="0">0</option><option value="1">1</option><option value="2">2</option>
            <option value="3">3</option><option value="4" selected>4</option><option value="5">5</option>
            <option value="6">6</option><option value="7">7</option><option value="8">8</option>
          </select>
        </div>
        <div class="field">
          <label>Cantidad de entradas</label>
          <select name="inputCount" id="inputCount" onchange="buildChannels()">
            <option value="0">0</option><option value="1">1</option><option value="2">2</option>
            <option value="3">3</option><option value="4">4</option><option value="5">5</option>
            <option value="6">6</option><option value="7">7</option><option value="8" selected>8</option>
          </select>
        </div>
      </div>
    </div>

    <!-- ── Canales tabs ── -->
    <div class="section" id="channelSection">
      <h2>Configuración de canales</h2>
      <div class="tabs">
        <button type="button" class="tab active" onclick="switchTab('relays',this)">Relés</button>
        <button type="button" class="tab" onclick="switchTab('inputs',this)">Entradas</button>
      </div>
      <div id="tabRelays" class="tab-content active">
        <div class="ch-grid" id="relayCards"></div>
      </div>
      <div id="tabInputs" class="tab-content">
        <div class="ch-grid" id="inputCards"></div>
      </div>
    </div>

    <button type="submit" class="save-btn">Guardar y reiniciar</button>
  </form>

  <form action="/reset" method="POST" onsubmit="return confirm('¿Borrar toda la configuración?')">
    <button type="submit" class="reset-btn">Borrar configuración (factory reset)</button>
  </form>
</div>

<script>
const HA_CLASSES    = ["door","window","motion","smoke","moisture","vibration","None","garage_door"];
const HA_LABELS     = ["Puerta","Ventana","Movimiento","Humo","Agua/Humedad","Vibración","Genérico","Portón garaje"];
const MODES         = ["switch","pulse","timer"];
const MODE_LABELS   = ["Switch (ON/OFF)","Pulso momentáneo","Temporizador"];
const HA_TYPES      = [0,1,2];
const HA_TYPE_LABELS= ["Interruptor","Luz 💡","Ventilador"];

// Prefill from current config injected by server
const CFG = JSON.parse(document.getElementById('cfgData')?.textContent||'{}');

function switchTab(name, btn) {
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab'+name.charAt(0).toUpperCase()+name.slice(1)).classList.add('active');
}

function buildChannels() {
  const rc = parseInt(document.getElementById('relayCount').value)||0;
  const ic = parseInt(document.getElementById('inputCount').value)||0;

  // Relays
  const rg = document.getElementById('relayCards');
  rg.innerHTML = '';
  for(let i=0;i<rc;i++){
    const r = CFG.relay?.[i]||{};
    const name   = r.name||('Relé '+(i+1));
    const mode   = r.mode||0;
    const ms     = r.pulseMs||500;
    const haType = r.haType||0;
    rg.innerHTML += `
    <div class="ch-card">
      <h3>Relé ${i+1}</h3>
      <div class="row2">
        <div class="field"><label>Nombre</label>
          <input type="text" name="rname${i}" maxlength="23" value="${esc(name)}">
        </div>
        <div class="field"><label>Tipo (HomeKit)</label>
          <select name="rtype${i}">
            ${HA_TYPE_LABELS.map((l,j)=>`<option value="${j}"${j==haType?' selected':''}>${l}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="row2">
        <div class="field"><label>Modo</label>
          <select name="rmode${i}" onchange="togglePulse(this,${i})">
            ${MODES.map((m,j)=>`<option value="${j}"${j==mode?' selected':''}>${MODE_LABELS[j]}</option>`).join('')}
          </select>
        </div>
        <div class="field" id="rpms${i}"${mode==0?' style="display:none"':''}>
          <label>Duración (ms)</label>
          <input type="number" name="rpms${i}" min="50" max="60000" value="${ms}">
        </div>
      </div>
    </div>`;
  }
  if(rc===0) rg.innerHTML='<p style="color:var(--muted);font-size:.8rem">Sin relés configurados</p>';

  // Inputs
  const ig = document.getElementById('inputCards');
  ig.innerHTML = '';
  for(let i=0;i<ic;i++){
    const inp = CFG.input?.[i]||{};
    const name = inp.name||('Entrada '+(i+1));
    const hac  = inp.haClass||'door';
    const inv  = inp.inverted||false;
    ig.innerHTML += `
    <div class="ch-card">
      <h3>Entrada ${i+1}</h3>
      <div class="row3">
        <div class="field"><label>Nombre</label>
          <input type="text" name="iname${i}" maxlength="23" value="${esc(name)}">
        </div>
        <div class="field"><label>Tipo HA</label>
          <select name="iclass${i}">
            ${HA_CLASSES.map((c,j)=>`<option value="${c}"${c==hac?' selected':''}>${HA_LABELS[j]}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Lógica</label>
          <select name="iinv${i}">
            <option value="0"${!inv?' selected':''}>NO (normal abierto)</option>
            <option value="1"${inv?' selected':''}>NC (normal cerrado)</option>
          </select>
        </div>
      </div>
    </div>`;
  }
  if(ic===0) ig.innerHTML='<p style="color:var(--muted);font-size:.8rem">Sin entradas configuradas</p>';
}

function togglePulse(sel, i) {
  document.getElementById('rpms'+i).style.display = sel.value=='0'?'none':'';
}

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }

// Prefill top-level fields from injected config
function prefill(){
  const f = id => document.getElementById(id);
  if(CFG.wifiSSID)   f('wifiSSID').value   = CFG.wifiSSID;
  if(CFG.mqttHost)   f('mqttHost').value   = CFG.mqttHost;
  if(CFG.mqttPort)   f('mqttPort').value   = CFG.mqttPort;
  if(CFG.mqttUser)   f('mqttUser').value   = CFG.mqttUser;
  if(CFG.deviceId)   f('deviceId').value   = CFG.deviceId;
  if(CFG.deviceName) f('deviceName').value = CFG.deviceName;
  if(CFG.area)       f('area').value       = CFG.area;
  if(CFG.relayCount!=null) f('relayCount').value = CFG.relayCount;
  if(CFG.inputCount!=null) f('inputCount').value = CFG.inputCount;
}

// Form submit via fetch for better UX
document.getElementById('cfgForm').addEventListener('submit',function(e){
  e.preventDefault();
  const btn = this.querySelector('.save-btn');
  btn.disabled=true; btn.textContent='Guardando...';
  fetch('/save',{method:'POST',body:new FormData(this)})
    .then(r=>r.text())
    .then(t=>{
      showAlert(t.includes('OK')?'Configuración guardada. Reiniciando...':'Error al guardar.',!t.includes('OK'));
      if(t.includes('OK')) setTimeout(()=>{btn.textContent='Reiniciando…'},1000);
    })
    .catch(()=>showAlert('Error de conexión.',true))
    .finally(()=>{ if(!document.getElementById('alertBox').classList.contains('err')) {} else btn.disabled=false; });
});

function showAlert(msg,err=false){
  const a=document.getElementById('alertBox');
  a.textContent=msg; a.className='alert'+(err?' err':'');
  a.style.display='block';
  if(!err) window.scrollTo({top:0,behavior:'smooth'});
}

prefill();
buildChannels();
</script>
</body>
</html>
)rawhtml";

// ==========================================================
//   HELPERS — construir JSON de config para inyectar en HTML
// ==========================================================
static String buildConfigJson() {
    String j = "{";
    j += "\"wifiSSID\":\"";  j += cfg.wifiSSID;   j += "\",";
    j += "\"mqttHost\":\"";  j += cfg.mqttHost;   j += "\",";
    j += "\"mqttPort\":";    j += cfg.mqttPort;   j += ",";
    j += "\"mqttUser\":\"";  j += cfg.mqttUser;   j += "\",";
    j += "\"deviceId\":\"";  j += cfg.deviceId;   j += "\",";
    j += "\"deviceName\":\"";j += cfg.deviceName; j += "\",";
    j += "\"relayCount\":";  j += cfg.relayCount; j += ",";
    j += "\"inputCount\":";  j += cfg.inputCount; j += ",";
    j += "\"area\":\"";      j += cfg.area;       j += "\",";
    j += "\"relay\":[";
    for (int i = 0; i < RELAY_MAX; i++) {
        if (i) j += ",";
        j += "{\"name\":\"";   j += cfg.relay[i].name;    j += "\",";
        j += "\"mode\":";      j += cfg.relay[i].mode;    j += ",";
        j += "\"pulseMs\":";   j += cfg.relay[i].pulseMs; j += ",";
        j += "\"haType\":";    j += cfg.relay[i].haType;  j += "}";
    }
    j += "],\"input\":[";
    for (int i = 0; i < INPUT_MAX; i++) {
        if (i) j += ",";
        j += "{\"name\":\"";    j += cfg.input[i].name;    j += "\",";
        j += "\"haClass\":\"";  j += cfg.input[i].haClass;  j += "\",";
        j += "\"inverted\":";   j += cfg.input[i].inverted ? "true" : "false"; j += "}";
    }
    j += "]}";
    return j;
}

// Inyecta el JSON de config en el HTML como <script id="cfgData" type="application/json">
static String buildPage() {
    String html = FPSTR(PORTAL_HTML);
    String inject = "<script id=\"cfgData\" type=\"application/json\">";
    inject += buildConfigJson();
    inject += "</script>\n</head>";
    html.replace("</head>", inject);
    return html;
}

// ==========================================================
//   PARSEO DE FORM POST
// ==========================================================
static String argOrDefault(const String& key, const String& def) {
    if (webServer.hasArg(key)) {
        String v = webServer.arg(key);
        v.trim();
        return v;
    }
    return def;
}

static void handleSave() {
    // WiFi
    strlcpy(cfg.wifiSSID, argOrDefault("wifiSSID","").c_str(), sizeof(cfg.wifiSSID));
    strlcpy(cfg.wifiPass, argOrDefault("wifiPass","").c_str(), sizeof(cfg.wifiPass));

    // MQTT
    strlcpy(cfg.mqttHost, argOrDefault("mqttHost","192.168.1.100").c_str(), sizeof(cfg.mqttHost));
    cfg.mqttPort = (uint16_t)argOrDefault("mqttPort","1883").toInt();
    strlcpy(cfg.mqttUser, argOrDefault("mqttUser","mqtt").c_str(), sizeof(cfg.mqttUser));
    strlcpy(cfg.mqttPass, argOrDefault("mqttPass","").c_str(), sizeof(cfg.mqttPass));

    // Módulo
    strlcpy(cfg.deviceId,   argOrDefault("deviceId","modulo_01").c_str(), sizeof(cfg.deviceId));
    strlcpy(cfg.deviceName, argOrDefault("deviceName","Módulo 01").c_str(), sizeof(cfg.deviceName));
    strlcpy(cfg.otaPass,    argOrDefault("otaPass","esp32ota").c_str(), sizeof(cfg.otaPass));
    strlcpy(cfg.area,       argOrDefault("area","General").c_str(), sizeof(cfg.area));

    uint8_t rc = (uint8_t)constrain(argOrDefault("relayCount","4").toInt(), 0, RELAY_MAX);
    uint8_t ic = (uint8_t)constrain(argOrDefault("inputCount","8").toInt(), 0, INPUT_MAX);
    cfg.relayCount = rc;
    cfg.inputCount = ic;

    // Relés
    for (int i = 0; i < RELAY_MAX; i++) {
        String pfx = "rname" + String(i);
        strlcpy(cfg.relay[i].name, argOrDefault(pfx, ("Relé " + String(i+1))).c_str(), sizeof(cfg.relay[i].name));
        cfg.relay[i].mode    = (uint8_t)constrain(argOrDefault("rmode"+String(i),"0").toInt(), 0, 2);
        cfg.relay[i].pulseMs = (uint16_t)constrain(argOrDefault("rpms"+String(i),"500").toInt(), 50, 60000);
        cfg.relay[i].haType  = (uint8_t)constrain(argOrDefault("rtype"+String(i),"0").toInt(), 0, 2);
    }

    // Entradas
    for (int i = 0; i < INPUT_MAX; i++) {
        strlcpy(cfg.input[i].name,    argOrDefault("iname"+String(i),  "Entrada "+String(i+1)).c_str(), sizeof(cfg.input[i].name));
        strlcpy(cfg.input[i].haClass, argOrDefault("iclass"+String(i), "door").c_str(), sizeof(cfg.input[i].haClass));
        cfg.input[i].inverted = argOrDefault("iinv"+String(i),"0") == "1";
    }

    if (strlen(cfg.wifiSSID) == 0) {
        webServer.send(400, "text/plain", "ERROR: SSID requerido");
        return;
    }

    configSave();
    webServer.send(200, "text/plain", "OK");
    delay(1500);
    ESP.restart();
}

static void handleReset() {
    configReset();
    webServer.send(200, "text/html",
        "<html><body style='background:#0d1117;color:#e6edf3;font-family:sans-serif;text-align:center;padding:40px'>"
        "<h2 style='color:#f85149'>Configuración borrada</h2>"
        "<p>El módulo reiniciará en modo portal.</p></body></html>");
    delay(1500);
    ESP.restart();
}

// ==========================================================
//   PORTAL — iniciar AP + DNS + WebServer
// ==========================================================
void portalBegin() {
    // Nombre del AP incluye deviceId para identificar el módulo
    String apName = "ESP32-";
    apName += cfg.deviceId;
    WiFi.mode(WIFI_AP);
    WiFi.softAP(apName.c_str());

    // DNS: redirigir todo al portal
    dnsServer.start(53, "*", WiFi.softAPIP());

    // Rutas
    webServer.on("/", HTTP_GET,  []() {
        webServer.send(200, "text/html; charset=utf-8", buildPage());
    });
    webServer.on("/save",  HTTP_POST, handleSave);
    webServer.on("/reset", HTTP_POST, handleReset);

    // Captive portal redirects (iOS, Android, Windows)
    auto redirect = []() {
        webServer.sendHeader("Location", "http://192.168.4.1/", true);
        webServer.send(302, "text/plain", "");
    };
    webServer.on("/hotspot-detect.html",     HTTP_GET, redirect);
    webServer.on("/generate_204",            HTTP_GET, redirect);
    webServer.on("/connecttest.txt",         HTTP_GET, redirect);
    webServer.on("/ncsi.txt",                HTTP_GET, redirect);
    webServer.onNotFound(redirect);

    webServer.begin();
}

// Llamar en loop() mientras estamos en modo portal
void portalLoop() {
    dnsServer.processNextRequest();
    webServer.handleClient();
}
