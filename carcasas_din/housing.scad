/* ==========================================================
   SISTEMA MODULAR ESP32 — Carcasa DIN 35mm
   Estilo TÉRMICA: clip posterior · bornes inferiores

   MÓDULOS (todos 4U × 85mm × 47mm):
     "RELAY4" → relés 4CH     (placa 57×55×27mm)
     "INPUT4" → entradas 4CH  (placa 52×55×23mm)
     "CPU"    → ESP32 + OLED  (Waveshare S3 Zero)
     "PSU"    → Fuente HLK    (HDR-15-5 o similar)

   RENDER:
     "BODY"    → cuerpo principal
     "COVER"   → tapa plana superior
     "CLIP"    → clip DIN trasero
     "LEVER"   → palanca de liberación
     "PREVIEW" → ensamblado completo
     "PLATE"   → plato de impresión (todas las piezas)
   ========================================================== */

MODULO = "RELAY4";
RENDER = "PREVIEW";

// ── GRILLA DIN ────────────────────────────────────────────
U = 18.0;   // mm por unidad de ancho

// ── DIMENSIONES COMUNES ───────────────────────────────────
// Todos los módulos son idénticos en exterior.
W    = 4 * U;   // 72mm — ancho 4U
H    = 85.0;    // alto total del módulo
D    = 47.0;    // profundidad frente → espalda (sin clip)
WALL = 2.0;     // espesor de pared
FL   = 2.0;     // espesor base
R    = 3.0;     // radio de esquinas (más recto, look industrial)
CF   = 1.2;     // chaflán borde superior
TOL  = 0.25;    // tolerancia impresión PLA
$fn  = 40;

// ── TAPA PLANA CON REBAJE ─────────────────────────────────
CVR_T = 2.0;    // espesor de la tapa
RBT_W = 1.2;    // escalón en paredes (WALL-RBT_W = 0.8mm piel)
RBT_H = 3.0;    // profundidad del escalón desde el tope
RIB_N = 5;      // ranuras decorativas rebajadas
RIB_W = 1.0;
RIB_D = 0.4;

// ── PANEL FRONTAL ─────────────────────────────────────────
// Franja frontal visible: LEDs + portaetiqueta + rehundido
LED_N = 4;      // 1 LED por canal
LED_D = 3.2;    // diámetro del agujero LED
LED_P = 13.0;   // paso entre LEDs (4 × 13 = 52mm, centrado en 72)
LED_Z = 55.0;   // altura desde base (zona superior del frente)

LBL_W = 52.0;   // ancho portaetiqueta
LBL_H =  8.0;
LBL_Z = 40.0;   // altura desde base
LBL_R =  1.5;

PNL_I = 0.8;    // profundidad rehundido decorativo
PNL_B = 5.0;    // borde alrededor del área rehundida

// ── BORNES BASE (salida de cables hacia abajo) ───────────
// 12 slots de 5mm de paso centrados en el ancho del módulo
// (3 terminales por relé × 4 relés = 12)
// Para INPUT4: 8 canales + GND → ajustar BSLOT_N
BSLOT_N    = 12;    // cantidad de slots
BSLOT_STEP =  5.0;  // paso (mm)
BSLOT_W    =  3.5;  // ancho del slot (5 - 1.5mm de puente = 3.5)
BSLOT_BEV  =  2.0;  // bisel de entrada (guía cables)

// ── SNAP LATERAL (unión módulo a módulo) ─────────────────
SN_W   = 8.0;
SN_H   = 4.0;
SN_T   = 2.0;
SN_RET = 0.8;
SN_Z   = H * 0.5;   // zona media del módulo
SN_Y   = D * 0.35;

// ── RANURA CABLE I2C (pared lateral superior) ─────────────
// El cable plano I2C corre entre módulos por la parte superior
I2C_NW = 12.0;   // ancho de la ranura
I2C_NH =  4.5;   // alto de la ranura
I2C_NZ = H - RBT_H - I2C_NH - 2;  // justo bajo el escalón de tapa

// ── USB-C CUTOUT (solo módulo CPU) ───────────────────────
USB_CUTOUT = false;
USB_W = 11.0;
USB_H =  5.5;
USB_Z =  6.0;   // desde la base, franja inferior del frente

// ── GUÍAS PCB (rieles interiores en paredes laterales) ───
// La placa se desliza de arriba hacia abajo y apoya en topes.
// Rieles en Y: dos por lado (frente y fondo).
RAIL_T  = 1.8;   // espesor del riel (ranura para borde PCB)
RAIL_D  = 2.2;   // profundidad de la ranura
RAIL_Z0 = FL + BSLOT_BEV + 12.0;  // arrancan sobre la zona de bornes
RAIL_H  = H - RAIL_Z0 - RBT_H - 8;  // altura útil del riel
PCB_YF  = D * 0.22;   // posición Y del riel frontal
PCB_YB  = D * 0.62;   // posición Y del riel trasero

// ── TOPES PCB (el fondo de los rieles detiene la placa) ───
PCB_STOP_Z = RAIL_Z0;  // la placa apoya sobre el tope inferior del riel

// ── DIN CLIP TRASERO ──────────────────────────────────────
// Pieza separada que se atornilla a la pared trasera del módulo.
// Gancho superior fijo + palanca rígida inferior (apto PLA).
//
// Posición en el módulo: clip centrado a CLP_Z desde la base.
// El riel DIN queda a esa altura; el módulo cuelga por encima.
CLP_Z   = 16.0;   // centro del riel DIN desde la base del módulo
CLP_T   =  3.0;   // espesor de la placa del clip
CLP_W   = DIN_W + 16.0; // ancho del clip (centrado en módulo)
CLP_H   = 36.0;   // alto de la placa del clip
CLP_SP  = 46.0;   // separación tornillos M3 (centrados en W)
CLP_HK  =  5.0;   // alto del gancho (labio que atrapa la pestaña del riel)
CLP_ARM =  8.0;   // longitud del brazo hasta el canal del riel

// Palanca de liberación inferior
CLP_LV_H = 18.0;  // alto de la palanca
CLP_LV_T =  3.5;  // espesor

// ── RIEL DIN TS35 ─────────────────────────────────────────
DIN_W   = 35.0;
DIN_H   =  7.5;   // alto del perfil omega
DIN_T   =  1.0;   // espesor chapa
DIN_FL  =  3.2;   // vuelo de la pestaña
DIN_GAP =  0.4;   // holgura clip-riel

// ==========================================================
//   PRIMITIVAS
// ==========================================================

module rr2(w, d, r) {
    offset(r=r, $fn=$fn) offset(r=-r) square([w, d]);
}
module rbox(w, d, h, r) {
    linear_extrude(h) rr2(w, d, r);
}
module apple_box(w, d, h, r, c) {
    union() {
        linear_extrude(h - c + 0.01) rr2(w, d, r);
        translate([0, 0, h - c])
            hull() {
                linear_extrude(0.01) rr2(w, d, r);
                translate([c, c, c])
                    linear_extrude(0.01)
                    rr2(w - c*2, d - c*2, max(r - c, 1.0));
            }
    }
}

// ==========================================================
//   SNAP LATERAL MÓDULO-A-MÓDULO
// ==========================================================
module snap_male() {
    translate([W, SN_Y, SN_Z])
        union() {
            cube([SN_T, SN_W, SN_H]);
            translate([SN_T, 0, 0])
                hull() {
                    cube([0.01, SN_W, SN_H]);
                    translate([SN_RET, 0, SN_RET * 0.5])
                        cube([0.01, SN_W, SN_H - SN_RET * 0.5]);
                }
        }
}

module snap_female_cut() {
    t = TOL;
    translate([-0.01, SN_Y - t/2, SN_Z - t/2])
        union() {
            cube([SN_T + t + 0.01, SN_W + t, SN_H + t]);
            translate([SN_T + t, 0, 0])
                cube([SN_RET + t + 0.5, SN_W + t, SN_H + t]);
        }
    translate([-0.01, SN_Y - t/2, SN_Z + SN_H + t - 0.01])
        rotate([0, 90, 0])
        linear_extrude(SN_T + SN_RET + t + 1)
        polygon([[0,0],[0, SN_W + t],[1.5, 0]]);
}

// ==========================================================
//   SLOTS DE BORNES EN LA BASE
//   Ranuras pasantes en el piso para salida de cables.
//   Centradas en el ancho del módulo, paso 5mm.
// ==========================================================
module cable_slots_cut() {
    total_w = BSLOT_N * BSLOT_STEP;
    x0 = (W - total_w) / 2 + (BSLOT_STEP - BSLOT_W) / 2;
    for (i = [0 : BSLOT_N - 1]) {
        x = x0 + i * BSLOT_STEP;
        // Slot pasante
        translate([x, WALL + 2, -0.01])
            cube([BSLOT_W, D - WALL*2 - 4, FL + 0.02]);
        // Bisel de entrada (interior → facilita insertar el cable)
        translate([x, WALL + 2, FL - BSLOT_BEV])
            rotate([0, 90, 0])
            linear_extrude(BSLOT_W)
            polygon([[0,0],[BSLOT_BEV, 0],[0, BSLOT_BEV]]);
    }
}

// ==========================================================
//   GUÍAS PCB VERTICALES
//   Rieles en las paredes laterales para sostener la placa
//   parada verticalmente. La placa se introduce desde arriba.
// ==========================================================
module pcb_guide_rails() {
    // Cuatro postes: izquierda frente/fondo, derecha frente/fondo
    for (side = [0, 1]) {
        xbase = side == 0 ? WALL : W - WALL - RAIL_D;
        for (ypos = [PCB_YF, PCB_YB]) {
            translate([xbase, ypos, RAIL_Z0])
                cube([RAIL_D, RAIL_T, RAIL_H]);
        }
    }
    // Topes inferiores (impiden que la placa se vaya hacia abajo)
    for (side = [0, 1]) {
        xbase = side == 0 ? WALL : W - WALL - RAIL_D;
        for (ypos = [PCB_YF, PCB_YB]) {
            translate([xbase, ypos, RAIL_Z0 - 2])
                cube([RAIL_D + 2, RAIL_T, 2]);
        }
    }
}

// ==========================================================
//   PANEL FRONTAL — rehundido + indicadores
// ==========================================================
module front_panel_features() {
    // Área rehundida decorativa (da profundidad y look profesional)
    pw = W - PNL_B * 2;
    ph = H - PNL_B * 2 - CF;
    translate([PNL_B, -0.01, PNL_B])
        cube([pw, PNL_I + 0.02, ph]);

    // Portaetiqueta (ranura para papel o label impreso)
    lx = (W - LBL_W) / 2;
    translate([lx, -0.01, LBL_Z])
        cube([LBL_W, PNL_I + WALL + 0.02, LBL_H]);
    // Bisel de entrada del portaetiqueta
    translate([lx, -0.01, LBL_Z + LBL_H - 1])
        rotate([0, 90, 0])
        linear_extrude(LBL_W)
        polygon([[0,0],[0, PNL_I + WALL + 0.02],[PNL_I + WALL + 0.02, 0]]);

    // LEDs (zona superior del frente)
    total_led = (LED_N - 1) * LED_P;
    lx0 = W / 2 - total_led / 2;
    for (i = [0 : LED_N - 1])
        translate([lx0 + i * LED_P, -0.01, LED_Z])
            rotate([-90, 0, 0])
            cylinder(h = WALL + PNL_I + 0.02, d = LED_D, $fn = 20);

    // USB-C (solo CPU, franja inferior del frente)
    if (USB_CUTOUT && MODULO == "CPU")
        translate([(W - USB_W) / 2, -0.01, USB_Z])
            cube([USB_W, WALL + PNL_I + 0.02, USB_H]);
}

// ==========================================================
//   AGUJEROS CLIP DIN EN PARED TRASERA
// ==========================================================
module back_clip_holes() {
    xs = [W/2 - CLP_SP/2, W/2 + CLP_SP/2];
    for (px = xs)
        translate([px, D - WALL - 0.01, CLP_Z + CLP_H/2])
            rotate([90, 0, 0])
            cylinder(h = WALL + 0.02, d = 3.5, $fn = 20);
}

// ==========================================================
//   CUERPO PRINCIPAL
// ==========================================================
module body() {
    difference() {
        union() {
            apple_box(W, D, H, R, CF);
            snap_male();
        }

        // Cavidad interior
        translate([WALL, WALL, FL])
            cube([W - WALL*2, D - WALL*2, H + 1]);

        // Escalón perimetral para la tapa (amplía el interior al tope)
        translate([WALL - RBT_W, WALL - RBT_W, H - RBT_H])
            cube([W - 2*(WALL - RBT_W), D - 2*(WALL - RBT_W), RBT_H + 1]);

        // Snap hembra (lado izquierdo)
        snap_female_cut();

        // Slots de bornes en la base
        cable_slots_cut();

        // Panel frontal: rehundido + LEDs + portaetiqueta
        front_panel_features();

        // Ranura cable I2C (pared lateral derecha, zona superior)
        // El cable plano corre entre módulos por la parte de arriba
        translate([W - WALL - 0.01, (D - I2C_NW) / 2, I2C_NZ])
            cube([WALL + 0.02, I2C_NW, I2C_NH]);
        translate([-0.01, (D - I2C_NW) / 2, I2C_NZ])
            cube([WALL + 0.02, I2C_NW, I2C_NH]);

        // Agujeros M3 para clip DIN trasero
        back_clip_holes();

        // Ventilación en paredes laterales (zona media-alta)
        for (side = [0, 1]) {
            vx = side == 0 ? -0.01 : W - WALL - 0.01;
            for (i = [0:2]) {
                vy = D * 0.2 + i * D * 0.25;
                translate([vx, vy, H * 0.45])
                    cube([WALL + 0.02, 1.8, 22]);
            }
        }
    }

    // Rieles guía PCB (suman material)
    pcb_guide_rails();
}

// ==========================================================
//   TAPA PLANA CON REBAJE
//
//   Placa asienta en el escalón perimetral del cuerpo.
//   Labio de alineación baja al interior principal.
//   Sin soportes — imprime cara arriba.
// ==========================================================
module cover() {
    sW = W - 2*(WALL - RBT_W);
    sD = D - 2*(WALL - RBT_W);
    cW = sW - 2*TOL;
    cD = sD - 2*TOL;
    cR = max(R - (WALL - RBT_W), 1.2);

    lW = W - 2*WALL - 2*TOL;
    lD = D - 2*WALL - 2*TOL;
    lH = RBT_H;
    lR = max(R - WALL, 1.0);
    ox = (cW - lW) / 2;
    oy = (cD - lD) / 2;

    difference() {
        union() {
            rbox(cW, cD, CVR_T, cR);
            translate([ox, oy, -lH + 0.01])
                rbox(lW, lD, lH, lR);
        }
        // Ranuras decorativas rebajadas
        ry0 = cD * 0.15;
        ry1 = cD * 0.85;
        step = (ry1 - ry0) / max(RIB_N - 1, 1);
        for (i = [0 : RIB_N - 1]) {
            ry = ry0 + i * step - RIB_W / 2;
            translate([ox + 2, ry, CVR_T - RIB_D])
                cube([lW - 4, RIB_W, RIB_D + 0.01]);
        }
    }
}

// ==========================================================
//   CLIP DIN TRASERO (pieza separada)
//
//   Se atornilla a la pared trasera del módulo con 2× M3.
//   El riel DIN encaja en el canal central.
//   Gancho superior FIJO + palanca inferior RÍGIDA (apto PLA).
//
//   Vista lateral (perfil):
//
//     Módulo │ placa clip │ brazo │ gancho ← pestaña riel
//            │            │       └──────── canal riel (DIN_H)
//            │            │       ┌──────── lever (palanca separada)
//     Módulo │____________│_______│
// ==========================================================
module din_clip() {
    cx0 = (W - CLP_W) / 2;  // posición X del clip (centrado)
    riel_y = CLP_ARM;        // posición Y del canal del riel desde cara del clip
    riel_z = CLP_H * 0.45;  // posición Z del centro del riel en la placa

    difference() {
        union() {
            // Placa base
            translate([cx0, 0, 0])
                rbox(CLP_W, CLP_T, CLP_H, 2.0);

            // Brazo superior + gancho fijo
            // (abraza la pestaña superior del riel desde afuera)
            gz = riel_z + DIN_H / 2;  // Z del gancho (sobre el riel)
            translate([cx0, 0, gz])
                union() {
                    // Brazo horizontal hacia el riel
                    cube([CLP_W, CLP_ARM + DIN_T + DIN_GAP, CLP_HK]);
                    // Labio que cae sobre la pestaña superior del riel
                    translate([0, CLP_ARM, 0])
                        cube([CLP_W, DIN_T + DIN_GAP, CLP_HK + DIN_FL]);
                }

            // Guías de la palanca inferior (dos postes)
            lv_z = riel_z - DIN_H / 2 - CLP_LV_H;
            for (gx = [cx0 + CLP_W * 0.2, cx0 + CLP_W * 0.8 - WALL])
                translate([gx, 0, lv_z])
                    cube([WALL, CLP_ARM + 1, CLP_LV_H + 2]);
        }

        // Canal del riel (el perfil DIN pasa por acá)
        rz = riel_z - DIN_H / 2 - DIN_GAP;
        translate([cx0 - 0.01, CLP_ARM - DIN_GAP, rz])
            cube([CLP_W + 0.02, DIN_T + DIN_GAP*2 + 0.01, DIN_H + DIN_GAP*2]);

        // Tornillos M3 sujeción al módulo
        xs = [W/2 - CLP_SP/2, W/2 + CLP_SP/2];
        for (px = xs) {
            translate([px, CLP_T / 2, CLP_H / 2])
                rotate([90, 0, 0])
                cylinder(h = CLP_T + 0.2, d = 3.4, $fn = 20);
            // Avellanado cabeza M3
            translate([px, -0.01, CLP_H / 2])
                rotate([90, 0, 0])
                cylinder(h = 2.2, d1 = 6.5, d2 = 3.4, $fn = 20);
        }

        // Alivio de peso (interior placa base)
        m = 4.0;
        translate([cx0 + m, CLP_T - 2.2, m])
            cube([CLP_W - m*2, 2.4, CLP_H - m*2]);
    }
}

// Palanca de liberación — pieza separada
// Desliza entre las guías del clip, empuja la pestaña inferior del riel.
// Para liberar: presionar la palanca hacia atrás (alejarse del módulo).
module din_lever() {
    lw = CLP_W * 0.55;

    difference() {
        union() {
            translate([(W - lw) / 2, 0, 0])
                rbox(lw, CLP_LV_T, CLP_LV_H, 1.5);
            // Nariz de acción (rampa que empuja bajo la pestaña del riel)
            translate([(W - lw) / 2, CLP_LV_T - 0.01, CLP_LV_H - 5])
                hull() {
                    cube([lw, 0.01, 5]);
                    translate([0, DIN_FL + 1, 5])
                        cube([lw, 0.01, 0.01]);
                }
        }
        // Agujero eje M2 (pin que retiene la palanca en las guías)
        translate([W / 2, CLP_LV_T / 2, CLP_LV_H * 0.3])
            rotate([90, 0, 0])
            cylinder(h = CLP_LV_T + 0.2, d = 2.2, $fn = 16, center = true);
    }
}

// ==========================================================
//   RENDER
// ==========================================================

if (RENDER == "BODY") {
    color("#d8d8d8") body();
}
else if (RENDER == "COVER") {
    // Imprimir cara superior hacia arriba, sin soportes.
    color("#ececec") cover();
}
else if (RENDER == "CLIP") {
    color("#606870") din_clip();
    translate([W + 12, 0, 0])
        color("#808890") din_lever();
}
else if (RENDER == "LEVER") {
    color("#808890") din_lever();
}
else if (RENDER == "PREVIEW") {
    // ── Cuerpo ──────────────────────────────────────────
    color("#d0d0d0") body();

    // ── Tapa (encajada en el escalón superior) ───────────
    translate([WALL - RBT_W + TOL,
               WALL - RBT_W + TOL,
               H - CVR_T])
        color("#ebebeb") cover();

    // ── Clip DIN (atornillado a la pared trasera) ─────────
    // El clip queda detrás del módulo; el riel DIN pasa por su canal.
    translate([0, D, 0])
        color("#555e66") din_clip();

    // ── Palanca (entre las guías del clip) ────────────────
    lv_z = (CLP_H * 0.45) - DIN_H / 2 - CLP_LV_H;
    translate([0, D + CLP_T, lv_z])
        color("#778088") din_lever();

    // ── Riel DIN (referencia, no se imprime) ─────────────
    %translate([(W - DIN_W) / 2,
                D + CLP_T + CLP_ARM - DIN_GAP,
                CLP_H * 0.45 - DIN_H / 2 - DIN_GAP])
        cube([DIN_W, DIN_T, DIN_H]);
}
else if (RENDER == "PLATE") {
    // =======================================================
    // PLATO DE IMPRESIÓN — 4 piezas
    //
    // 1. BODY    — vertical, cara frontal hacia adelante
    // 2. COVER   — cara superior hacia arriba (sin soporte)
    // 3. CLIP    — placa horizontal (cara que toca módulo abajo)
    // 4. LEVER   — plano
    // =======================================================
    sp = 12;

    // 1. Body
    color("#d0d0d0") body();

    // 2. Cover
    translate([W + sp, 0, CVR_T])
        rotate([180, 0, 0])
        color("#ebebeb") cover();

    // 3. Clip DIN
    translate([0, D + sp, 0])
        color("#555e66") din_clip();

    // 4. Lever
    translate([W + sp, D + sp, 0])
        color("#778088") din_lever();
}
