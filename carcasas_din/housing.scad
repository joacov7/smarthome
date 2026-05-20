/* ==========================================================
   SISTEMA MODULAR ESP32 — Carcasa DIN 35mm
   Optimizado para PLA FDM · Estética minimalista

   RENDER:
     "BODY"      → cuerpo principal
     "COVER"     → tapa (imprimir boca abajo en slicer)
     "DIN_CLIP"  → clip DIN separado con palanca rígida
     "BUS_CAP"   → tapa ciega para orificio de bus lateral
     "PREVIEW"   → ensamblado completo
     "PLATE"     → todas las piezas en plato de impresión

   MÓDULOS:
     "PSU"    → 2U  36mm   Fuente HLK-PM01
     "CPU"    → 3U  54mm   ESP32 + OLED
     "RELAY4" → 4U  72mm   Relés 4CH
     "IN8"    → 3U  54mm   Entradas 8CH
     "BORNES" → 3U  54mm   Bornes de expansión
     "CUSTOM" → usa WIDTH_U
   ========================================================== */

// ── SELECCIÓN ─────────────────────────────────────────────
MODULO  = "CPU";
RENDER  = "PLATE";   // Cambiar a "BODY"/"COVER"/"DIN_CLIP"/"BUS_CAP"/"PREVIEW" según necesidad
WIDTH_U = 3;

// ── GRID MODULAR ──────────────────────────────────────────
U = 18.0;   // mm por unidad de ancho

// ── FORMA GENERAL ─────────────────────────────────────────
R    = 5.0;   // radio esquinas verticales
CF   = 1.6;   // chaflán borde superior
WALL = 2.0;   // espesor de pared (2mm para PLA: buena rigidez)
FL   = 1.8;   // espesor piso
D    = 65.0;  // profundidad (frente→fondo) — 65mm para ESP32 DevKit 30 pines
H    = 90.0;  // altura cuerpo (sin clip DIN) — ref. imagen: 90mm
TOL  = 0.25;  // tolerancia encastre (PLA: ligeramente más que PETG)
$fn  = 40;

// ── PANEL FRONTAL ─────────────────────────────────────────
PNL_I = 0.8;  // profundidad rehundido
PNL_B = 4.0;  // borde alrededor del panel
PNL_R = 3.0;  // radio esquinas del panel

// Ícono / símbolo del módulo (área libre en panel)
ICON_Z = 28.0; // posición Z del centro del ícono desde piso
ICON_W = 18.0; // ancho del área de ícono
ICON_H = 18.0; // alto del área de ícono

// LEDs: 3 puntos centrados en la parte baja del panel
LED_N  = 3;
LED_D  = 3.4;
LED_P  = 8.0;  // paso entre LEDs
LED_Z  = 10.0; // posición Z desde piso

// Portaetiqueta (nombre del módulo)
LBL_H = 8.0;
LBL_Z = 20.0;
LBL_R = 1.5;

// ── VENTILACIÓN LATERAL ───────────────────────────────────
// Slots verticales en las paredes laterales (derecha e izquierda)
// Solo en la zona que no interfiere con el bus I2C ni el snap lateral
VENT_W   = 1.6;  // ancho de cada slot
VENT_GAP = 3.5;  // separación entre slots
VENT_H   = 30.0; // alto de cada slot
VENT_Z   = 35.0; // posición Z desde piso (zona media-alta)
VENT_N   = 3;    // cantidad de slots por lado

// ── APERTURA BORNERAS (fondo inferior, cara frontal) ──────
TERM_W   = 0.0;  // 0 = sin apertura. Setear al ancho de tu bornera si querés.
TERM_H   = 12.0; // alto de la apertura
// (se calcula automático centrado en la cara frontal)

// ── APERTURA USB TYPE-C (módulo CPU — Waveshare ESP32-S3 Zero) ────────
// S3 Zero: USB-C nativo, conector 8.9mm × 3.18mm
// Activar para reprogramar sin abrir. Alternativa: OTA por WiFi.
USB_CUTOUT = true;   // true → agrega apertura USB-C en cara frontal
USB_W      = 11.0;  // ancho (USB-C: 8.9mm + 2.1mm holgura para alinear)
USB_H      =  5.5;  // alto  (USB-C: 3.18mm + 2.3mm holgura)
USB_Z      =  3.5;  // altura desde piso interior (ajustar según posición PCB)

// ── DIN TS35 ──────────────────────────────────────────────
DIN_W   = 35.0;
DIN_H   = 7.5;
DIN_T   = 1.0;
DIN_GAP = 0.3;

// ── SNAP LATERAL MÓDULO-A-MÓDULO ─────────────────────────
// Sistema de unión entre módulos adyacentes en el carril.
// Macho (derecha) + Hembra (izquierda). Snap con retención positiva.
// Diseñado para múltiples ciclos sin fatiga (geometría rígida, no resorte).
SN_W  = 10.0;   // longitud del snap en dirección Y (profundidad)
SN_H  =  4.0;   // altura total del snap en Z
SN_T  =  2.2;   // ancho del gancho en X
SN_RET = 1.0;   // retención del snap (profundidad del diente)
SN_Z  = 50.0;   // posición Z del snap (zona media del módulo)
SN_Y  = 12.0;   // posición Y desde el frente

// ── BUS I2C LATERAL ───────────────────────────────────────
BUS_W  = 16.0;
BUS_H  =  9.5;
BUS_Z  = 22.0;  // centro desde piso interior
BUS_CH =  0.8;  // chaflán

// ── TAPA PLANA CON REBAJE ─────────────────────────────────
// Diseño: placa plana + labio de alineación que baja al interior.
// El cuerpo tiene un escalón perimetral en el tope donde la placa apoya.
// No hay falda profunda → sin problemas de tolerancia.
CVR_T = 2.0;    // espesor de la placa
RBT_W = 1.2;    // ancho del escalón cortado en la pared (WALL-RBT_W = piel exterior)
RBT_H = 3.0;    // profundidad del escalón desde el tope del cuerpo

// Ranuras decorativas rebajadas en la cara superior (estética Apple)
RIB_N = 6;      // cantidad de ranuras
RIB_W = 1.0;    // ancho de cada ranura
RIB_D = 0.4;    // profundidad (rebajadas, no en relieve → sin overhang)

// ── POSTES PCB M3 ─────────────────────────────────────────
PST_H  = 8.0;
PST_OD = 6.0;
PST_ID = 3.2;
PST_MG = 5.5;

// ── CLIP DIN SEPARADO (palanca rígida, apto PLA) ─────────
// Diseño: gancho fijo superior + palanca de liberación inferior.
// La palanca es una pieza rígida que gira ~3mm — no depende de
// flexibilidad del material → funciona sin fatiga en PLA.
CLP_SP = 24.0;  // separación tornillos M3 de sujeción al body
CLP_BH =  4.0;  // altura placa base del clip
CLP_LV =  8.0;  // altura palanca de liberación

// ── TAPA BUS ──────────────────────────────────────────────
CAP_FL = 1.0;   // labio exterior

// ==========================================================
//   ANCHO CALCULADO
// ==========================================================
W = (MODULO=="PSU"                              ) ? 2*U :
    (MODULO=="CPU" || MODULO=="IN8" || MODULO=="BORNES") ? 3*U :
    (MODULO=="RELAY4"                              ) ? 4*U :
    WIDTH_U * U;
// BORNES subió a 3U (54mm → interior 50mm) para alojar 10 bornes paso 5mm

// ==========================================================
//   PRIMITIVAS
// ==========================================================

module rr2(w, d, r) {
    offset(r=r, $fn=$fn) offset(r=-r) square([w, d]);
}

module rbox(w, d, h, r) {
    linear_extrude(h) rr2(w, d, r);
}

// Caja con chaflán superior (look "mecanizado")
module apple_box(w, d, h, r, c) {
    union() {
        linear_extrude(h - c + 0.01) rr2(w, d, r);
        translate([0, 0, h - c])
            hull() {
                linear_extrude(0.01) rr2(w, d, r);
                translate([c, c, c])
                    linear_extrude(0.01)
                    rr2(w-c*2, d-c*2, max(r-c, 1.2));
            }
    }
}

// ==========================================================
//   SNAP LATERAL MÓDULO-A-MÓDULO
//
//   Macho (X=W): gancho con diente de retención positiva.
//   Hembra (X=0): cavidad con rebaje para alojar el diente.
//   Para separar módulos: empujar el gancho macho hacia +X
//   con un destornillador plano en la ranura de liberación.
// ==========================================================
module snap_male() {
    // Brazo del gancho (sale del lado derecho del módulo)
    translate([W, SN_Y, SN_Z])
        union() {
            // Brazo horizontal
            cube([SN_T, SN_W, SN_H]);
            // Diente de retención (rampa de entrada + escalón)
            translate([SN_T, 0, 0])
                hull() {
                    cube([0.01, SN_W, SN_H]);
                    translate([SN_RET, 0, SN_RET * 0.5])
                        cube([0.01, SN_W, SN_H - SN_RET * 0.5]);
                }
        }
    // Ranura de liberación (permite empujar el gancho con destornillador)
    // Solo una muesca visible en la cara lateral superior del gancho
}

module snap_female_cut() {
    t = TOL;
    translate([-0.01, SN_Y - t/2, SN_Z - t/2])
        union() {
            // Cavidad principal
            cube([SN_T + t + 0.01, SN_W + t, SN_H + t]);
            // Rebaje para el diente
            translate([SN_T + t, 0, 0])
                cube([SN_RET + t + 0.5, SN_W + t, SN_H + t]);
        }
    // Bisel de entrada para guiar el montaje
    translate([-0.01, SN_Y - t/2, SN_Z + SN_H + t - 0.01])
        rotate([0, 90, 0])
        linear_extrude(SN_T + SN_RET + t + 1)
        polygon([[0,0],[0, SN_W + t],[1.5, 0]]);
}

// ==========================================================
//   ORIFICIO BUS I2C CON CHAFLÁN
// ==========================================================
module bus_hole(side) {
    // side: "L" = izquierdo (X=0), "R" = derecho (X=W)
    by = (D - BUS_W) / 2;
    bz = BUS_Z + FL;
    mx = (side == "L") ? 0 : W;
    dir = (side == "L") ? -1 : 1;

    translate([mx, by, bz]) {
        cube([dir * (WALL + 0.02), BUS_W, BUS_H]);
        // Chaflán perimetral de entrada
        translate([0, -BUS_CH, -BUS_CH])
            hull() {
                translate([(side=="L" ? -0.01 : WALL*dir + 0.01), 0, 0])
                    cube([0.01, BUS_W + BUS_CH*2, BUS_H + BUS_CH*2]);
                translate([(side=="L" ? BUS_CH*dir : (WALL - BUS_CH)*dir), BUS_CH, BUS_CH])
                    cube([0.01, BUS_W, BUS_H]);
            }
    }
}

// ==========================================================
//   SLOTS DE VENTILACIÓN LATERAL
//   Ranuras verticales en paredes laterales (flujo de aire)
// ==========================================================
module vent_slots_cut(side) {
    // side: "L" (X=0) o "R" (X=W)
    total_w = (VENT_N - 1) * (VENT_W + VENT_GAP);
    y0 = D/2 - total_w/2;

    for (i = [0 : VENT_N - 1]) {
        vy = y0 + i * (VENT_W + VENT_GAP);
        // Evitar zona del snap y del bus
        vz_start = VENT_Z;
        // Corte pasante en la pared
        translate([
            side == "L" ? -0.01 : W - 0.01,
            vy,
            vz_start
        ])
            cube([WALL + 0.02, VENT_W, VENT_H]);
    }
}

// ==========================================================
//   POSTES PCB
// ==========================================================
module pcb_posts() {
    xs = [PST_MG + PST_OD/2,
          W - PST_MG - PST_OD/2];
    ys = [PST_MG + PST_OD/2 + 3,
          D - PST_MG - PST_OD/2 - 4];
    for (px = xs, py = ys)
        translate([px, py, FL])
            difference() {
                cylinder(h=PST_H, d=PST_OD);
                translate([0, 0, -0.1])
                    cylinder(h=PST_H + 0.2, d=PST_ID);
            }
}

// ==========================================================
//   POCKETS INSERTOS M3 (piso → clip DIN)
// ==========================================================
module insert_pockets() {
    xs = [W/2 - CLP_SP/2, W/2 + CLP_SP/2];
    for (px = xs)
        translate([px, D/2, -0.1])
            cylinder(h=5.0, d=4.8, $fn=24);
}

// ==========================================================
//   PANEL FRONTAL REHUNDIDO
//   (Y=0, cara visible en el tablero eléctrico)
// ==========================================================
module front_panel_cut() {
    pw = W - PNL_B*2;
    ph = H - PNL_B*2 - CF - 2;
    translate([PNL_B, -0.01, PNL_B])
        cube([pw, PNL_I + 0.02, ph]);
}

// Ventanas LED (3 puntos en la zona inferior del panel)
module led_windows_cut() {
    total_w = (LED_N - 1) * LED_P;
    x0 = W/2 - total_w/2;
    for (i = [0 : LED_N - 1])
        translate([x0 + i*LED_P, -0.01, LED_Z])
            rotate([-90, 0, 0])
            cylinder(h=WALL + PNL_I + 0.02, d=LED_D, $fn=20);
}

// Ranura portaetiqueta
module label_slot_cut() {
    lw = W - PNL_B*2 - 8;
    lz = LBL_Z;
    translate([(W - lw)/2, -0.01, lz])
        cube([lw, PNL_I + WALL + 0.02, LBL_H]);
    // Bisel de entrada
    translate([(W-lw)/2, -0.01, lz + LBL_H - 1.0])
        rotate([0, 90, 0])
        linear_extrude(lw)
        polygon([[0, 0],
                 [0, PNL_I + WALL + 0.02],
                 [PNL_I + WALL + 0.02, 0]]);
}

// Apertura para borneras enchufables (base frontal)
module terminal_cut() {
    if (TERM_W > 0) {
        tw = TERM_W;
        translate([(W - tw)/2, -0.01, FL])
            cube([tw, WALL + 0.02, TERM_H]);
    }
}

// ==========================================================
//   CUERPO PRINCIPAL
// ==========================================================
module body() {
    difference() {
        union() {
            // Shell exterior
            apple_box(W, D, H, R, CF);
            // Snap macho (lado derecho)
            snap_male();
        }

        // Hueco interior
        translate([WALL, WALL, FL])
            cube([W - WALL*2, D - WALL*2, H + 0.1]);

        // Panel frontal rehundido
        front_panel_cut();

        // Ventanas LED
        led_windows_cut();

        // Portaetiqueta
        label_slot_cut();

        // Apertura borneras
        terminal_cut();

        // Apertura Micro USB (solo módulo CPU si USB_CUTOUT=true)
        if (USB_CUTOUT && MODULO == "CPU")
            translate([(W - USB_W)/2, -0.01, USB_Z])
                cube([USB_W, WALL + PNL_I + 0.02, USB_H]);

        // Snap hembra (lado izquierdo)
        snap_female_cut();

        // Orificios bus I2C (ambos lados)
        bus_hole("L");
        bus_hole("R");

        // Ventilación lateral
        vent_slots_cut("L");
        vent_slots_cut("R");

        // Escalón perimetral para la tapa plana:
        // amplía el interior en RBT_W a cada lado en los últimos RBT_H mm.
        // Deja una piel exterior de (WALL-RBT_W) = 0.8mm (2 perímetros 0.4mm).
        // El escalón horizontal resultante es el apoyo de la placa.
        translate([WALL - RBT_W, WALL - RBT_W, H - RBT_H])
            cube([W - 2*(WALL - RBT_W),
                  D - 2*(WALL - RBT_W),
                  RBT_H + 1]);

        // Pockets insertos M3 (piso)
        insert_pockets();

        // Slots ventilación piso
        ns = max(floor((W - 12) / 6), 1);
        for (i = [0 : ns - 1])
            translate([6 + i * (W - 12) / max(ns - 1, 1),
                       D * 0.3, -0.1])
                cube([1.8, D * 0.4, FL + 0.2]);
    }

    // Postes PCB
    pcb_posts();
}

// ==========================================================
//   TAPA PLANA CON REBAJE
//
//   Geometría:
//     ┌──────────────────────────┐  ← cara superior (plana o con ranuras)
//     │        placa CVR_T       │  ← espesor 2mm
//     └──┐                  ┌───┘  ← escalón: apoya sobre pared del cuerpo
//        │   labio de        │      ← baja RBT_H al interior → alinea sin juego
//        │   alineación      │
//        └──────────────────┘
//
//   Encaje en el cuerpo:
//     - Placa asienta en el escalón perimetral (WALL - RBT_W = 0.8mm de pared)
//     - Labio entra en el interior principal → centra la tapa automáticamente
//     - Tolerancia lateral: TOL = 0.25mm a cada lado
//
//   Impresión: cara superior hacia arriba, sin soportes.
// ==========================================================
module cover() {
    // ── Ancho del escalón (zona ampliada al tope del cuerpo) ──
    sW = W - 2*(WALL - RBT_W);   // = W - 2*0.8 = W - 1.6
    sD = D - 2*(WALL - RBT_W);
    // ── Placa (con tolerancia) ────────────────────────────────
    cW = sW - 2*TOL;
    cD = sD - 2*TOL;
    cR = max(R - (WALL - RBT_W), 1.5);
    // ── Labio de alineación (encaja en interior principal) ────
    // Interior principal: W - 2*WALL = W - 4mm
    lW = W - 2*WALL - 2*TOL;
    lD = D - 2*WALL - 2*TOL;
    lH = RBT_H;
    lR = max(R - WALL, 1.0);
    ox = (cW - lW) / 2;   // offset del labio respecto a la placa
    oy = (cD - lD) / 2;

    difference() {
        union() {
            // Placa principal
            rbox(cW, cD, CVR_T, cR);
            // Labio de alineación (cuelga hacia abajo)
            translate([ox, oy, -lH + 0.01])
                rbox(lW, lD, lH, lR);
        }
        // Ranuras decorativas rebajadas en la cara superior
        // (perpendiculares al eje Y, centradas en la placa)
        rib_zone_y0 = cD * 0.15;
        rib_zone_y1 = cD * 0.85;
        rib_step = (rib_zone_y1 - rib_zone_y0) / max(RIB_N - 1, 1);
        for (i = [0 : RIB_N - 1]) {
            ry = rib_zone_y0 + i * rib_step - RIB_W/2;
            translate([ox + 1, ry, CVR_T - RIB_D])
                cube([lW - 2, RIB_W, RIB_D + 0.01]);
        }
    }
}

// ==========================================================
//   CLIP DIN CON PALANCA DE LIBERACIÓN — APTO PLA
//
//   Diferencia clave vs diseño anterior:
//   El gancho inferior NO es un tab flexible (que fatiga el PLA).
//   Es una PALANCA RÍGIDA separada que pivota ~3mm en un eje.
//   Para liberar: empujar la palanca hacia el frente con dedo.
//   → cero fatiga de material, funciona en PLA, ABS, PETG.
//
//   Ensamblaje: la palanca encaja en las guías del clip base
//   y se retiene con un pin M2 o un tornillo M2×8.
// ==========================================================
module din_clip() {
    lever_pivot_y = D - 8;  // posición del pivote de la palanca

    difference() {
        union() {
            // Placa base (se atornilla al piso del body)
            apple_box(W, D, CLP_BH, R*0.5, 0.5);

            // Gancho FIJO (frente) — engancha borde superior del carril
            translate([0, 0, CLP_BH])
                cube([W, WALL * 2, DIN_T + 1.5]);

            // Guías para la palanca (rieles que la retienen en Y)
            guide_h = CLP_LV + 2;
            guide_t = WALL;
            for (gx = [W*0.2, W*0.8 - guide_t])
                translate([gx, lever_pivot_y - 2, 0])
                    cube([guide_t, 4, guide_h]);
        }

        // Canal del carril (centrado en X, abierto hacia abajo)
        translate([(W - DIN_W)/2 - DIN_GAP, -0.1, CLP_BH - DIN_H])
            cube([DIN_W + DIN_GAP*2, D + 0.2, DIN_H + 0.1]);

        // Tornillos M3 sujeción al body (avellanados, cabeza flush)
        screw_xs = [W/2 - CLP_SP/2, W/2 + CLP_SP/2];
        for (px = screw_xs) {
            translate([px, D/2, -0.1])
                cylinder(h=CLP_BH + 0.2, d=3.4, $fn=20);
            translate([px, D/2, -0.1])
                cylinder(h=2.0, d1=7.0, d2=3.4, $fn=20);
        }

        // Aligeramiento placa base
        m = WALL + 2;
        translate([m, m + WALL*2, CLP_BH - 2.5])
            cube([W - m*2, D - m*2 - WALL*2 - 10, 2.8]);
    }
}

// Palanca de liberación (pieza separada)
// Se imprime aparte y se inserta en las guías del clip base.
// Para liberar el módulo del carril: empujar hacia el frente (+Y→-Y)
module din_lever() {
    lw = W * 0.5;   // largo de la palanca
    lh = CLP_LV;
    lt = 3.0;       // espesor de la palanca

    difference() {
        union() {
            // Cuerpo de la palanca
            translate([W/2 - lw/2, 0, 0])
                cube([lw, lt, lh]);
            // Extremo con rampa de acción (empuja el carril al activarse)
            translate([W/2 - lw/2, 0, lh - 3])
                hull() {
                    cube([lw, lt, 0.01]);
                    translate([0, DIN_FLANGE + 1, 3])
                        cube([lw, 0.01, 0.01]);
                }
        }
        // Agujero pivot M2
        translate([W/2, lt/2, lh * 0.35])
            rotate([90, 0, 0])
            cylinder(h=lt + 0.2, d=2.2, $fn=16, center=true);
    }
}
DIN_FLANGE = 2.3; // vuelo de la pestaña del carril TS35

// ==========================================================
//   TAPA CIEGA BUS I2C
// ==========================================================
module bus_cap() {
    cw = BUS_W - TOL*2;
    ch = BUS_H - TOL*2;
    plug_d = WALL + 1.2;
    draft  = 0.4;

    union() {
        // Tapón cónico (draft → fácil insertar/retirar)
        hull() {
            cube([cw, ch, 0.01]);
            translate([draft, draft, plug_d])
                cube([cw - draft*2, ch - draft*2, 0.01]);
        }
        // Labio exterior
        translate([-1.0, -1.0, plug_d])
            linear_extrude(CAP_FL)
            rr2(cw + 2, ch + 2, 1.0);
        // Muesca de retiro (pequeño tab que sobresale para tirar con uña)
        translate([cw/2 - 3, -1.0, plug_d + CAP_FL])
            cube([6, 1.0, 2.0]);
    }
}

// ==========================================================
//   RENDER
// ==========================================================
clip_base_h = CLP_BH;

if (RENDER == "BODY") {
    color("#e0e0e0") body();
}
else if (RENDER == "COVER") {
    // Imprimir cara superior hacia arriba — sin soportes.
    // El labio queda suspendido pero tiene pocas capas → soportado por bridging.
    color("#ececec") cover();
}
else if (RENDER == "DIN_CLIP") {
    color("#707880") din_clip();
    translate([W + 10, 0, 0])
        color("#909898") din_lever();
}
else if (RENDER == "BUS_CAP") {
    color("#d0d4d8") bus_cap();
}
else if (RENDER == "PREVIEW") {
    // Vista ensamblada — todas las piezas en posición final
    // Piezas separadas: ver RENDER = "PLATE"
    //
    //  ┌─────────────────────┐  ← COVER   (gris claro)
    //  │  body               │  ← BODY    (gris medio)
    //  └─────────────────────┘
    //  [== clip DIN ==]         ← DIN_CLIP (gris oscuro)
    //   ○ bus cap               ← BUS_CAP  (gris azulado)

    // BODY
    color("#d8d8d8") body();
    // COVER — placa plana apoyada en el escalón perimetral
    // La placa queda a ras del tope del cuerpo (Z = H)
    translate([WALL - RBT_W + TOL, WALL - RBT_W + TOL, H - CVR_T])
        color("#f0f0f0") cover();
    // DIN CLIP atornillado bajo el body
    translate([0, 0, -clip_base_h])
        color("#5a6470") din_clip();
    // BUS CAP en el lado izquierdo (demo — tapa el orificio libre)
    translate([-WALL - 1.2, (D - BUS_W)/2, BUS_Z + FL])
        rotate([0, 90, 0])
        color("#b0bcc8") bus_cap();
}
else if (RENDER == "PLATE") {
    // =======================================================
    // PLATO DE IMPRESIÓN — 5 piezas separadas
    //
    // PIEZA 1 — BODY: imprimir vertical (cara frontal al frente)
    // PIEZA 2 — COVER: ⚠ girar 180° en slicer (techo hacia la cama)
    // PIEZA 3 — DIN_CLIP: imprimir horizontal (placa base abajo)
    // PIEZA 4 — DIN_LEVER: imprimir horizontal
    // PIEZA 5 — BUS_CAP ×2: imprimir de lado (labio hacia arriba)
    // =======================================================
    sp = 10;

    // 1. Body — posición de impresión correcta
    color("#d8d8d8") body();

    // 2. Cover — imprimir tal cual (cara superior hacia arriba, sin soportes)
    translate([W + sp, 0, CVR_T])
        rotate([180, 0, 0])
        color("#f0f0f0") cover();

    // 3. Clip DIN
    translate([0, D + sp, 0])
        color("#5a6470") din_clip();

    // 4. Palanca de liberación
    translate([W + sp, D + sp, 0])
        color("#788090") din_lever();

    // 5. Bus caps (×2 — uno para cada extremo del sistema)
    translate([0, D + sp + CLP_BH + sp, 0])
        color("#b0bcc8") bus_cap();
    translate([BUS_W + sp, D + sp + CLP_BH + sp, 0])
        color("#b0bcc8") bus_cap();
}
