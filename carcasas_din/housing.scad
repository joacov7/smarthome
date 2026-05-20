/* ==========================================================
   SISTEMA MODULAR ESP32 — Carcasa DIN 35mm
   Estilo TÉRMICA · Diseño minimalista
   ──────────────────────────────────────────────────────────
   Principios:
     · Frente liso — cero agujeros visibles
     · LEDs difuminados a través de pared fina (0.8mm)
     · Clip DIN compacto integrado al dorso
     · Bornes salen por la base
     · Todo el diseño: una sola expresión limpia

   MÓDULOS (todos W×H×D = 72×85×47mm):
     "RELAY4" → relés 4CH
     "INPUT4" → entradas 4CH
     "CPU"    → ESP32 + OLED
     "PSU"    → Fuente HLK

   RENDER:
     "BODY"    "COVER"   "CLIP"
     "PREVIEW" "PLATE"
   ========================================================== */

MODULO = "RELAY4";
RENDER = "PREVIEW";

// ── GRILLA ───────────────────────────────────────────────
U = 18.0;

// ── DIMENSIONES ──────────────────────────────────────────
W    = 4 * U;   // 72mm — 4U
H    = 85.0;    // alto total
D    = 47.0;    // profundidad frente → espalda
WALL = 1.8;     // pared lateral/posterior
WALL_F = 2.2;   // pared frontal (un poco más para rigidez)
FL   = 2.0;     // base
R    = 4.5;     // radio esquinas — expresivo, como producto Apple
CF   = 1.5;     // chaflán borde superior
TOL  = 0.25;
$fn  = 48;

// ── TAPA ─────────────────────────────────────────────────
CVR_T = 2.0;
RBT_W = 1.2;    // escalón en pared para tapa (piel ext: 0.6mm)
RBT_H = 3.0;
RIB_N = 4;
RIB_W = 0.8;
RIB_D = 0.35;

// ── LEDs — DIFUSOR DE PARED FINA ─────────────────────────
// Pockets interiores dejan GLOW_T de pared → el LED brilla
// a través del PLA como un halo difuminado (efecto Apple).
LED_N     = 4;
LED_P     = 12.0;   // paso entre LEDs
LED_Z     = 58.0;   // altura desde base
GLOW_W    = 5.0;    // ancho de la ventana de glow
GLOW_H    = 5.0;    // alto
GLOW_R    = 1.8;    // radio esquinas (suavizado)
GLOW_T    = 0.8;    // espesor pared restante — 2 perímetros 0.4mm

// ── ETIQUETA — línea grabada sutil ───────────────────────
LBL_W  = 56.0;
LBL_H  =  8.0;
LBL_Z  = 38.0;
LBL_DEP=  0.5;  // profundidad grabado (no es ranura pasante)
LBL_R  =  2.0;

// ── BORNES BASE ───────────────────────────────────────────
BSLOT_N    = 12;
BSLOT_STEP =  5.0;
BSLOT_W    =  3.5;
BSLOT_BEV  =  2.0;

// ── GUÍAS PCB ─────────────────────────────────────────────
RAIL_T  = 1.8;
RAIL_D  = 2.2;
PCB_YF  = D * 0.22;
PCB_YB  = D * 0.62;
RAIL_Z0 = FL + 14.0;
RAIL_H  = H - RAIL_Z0 - RBT_H - 10;

// ── DIN CLIP TRASERO ──────────────────────────────────────
// Basado en STL analizado: clip compacto 36mm × 12.5mm × 5.7mm
// que engancha sobre las pestañas del riel TS35.
// Pieza separada, se atornilla con 2× M3 a la pared trasera.
DIN_W     = 35.0;   // ancho riel TS35
DIN_H     =  7.5;   // alto perfil omega
DIN_T     =  1.0;   // espesor chapa riel
DIN_FL    =  2.8;   // vuelo de pestaña
DIN_GAP   =  0.35;  // holgura
CLP_BASE_T=  3.2;   // espesor placa base del clip
CLP_BODY_H= 28.0;   // alto total de la pieza clip
CLP_W     = DIN_W + 14.0;  // ancho clip (=49mm, centrado en módulo 72mm)
CLP_Z     = 14.0;   // posición Z del centro del riel desde base del módulo
CLP_SP    = 44.0;   // separación tornillos M3
// Gancho superior: labio que cae sobre pestaña superior del riel
CLP_HK_D  =  3.0;   // profundidad del gancho (cómo avanza sobre el riel)
CLP_HK_H  =  4.0;   // alto del labio
// Gancho inferior: muelle rígido con labio
CLP_LW_T  =  2.8;   // espesor de la lengüeta inferior
CLP_LW_L  = 10.0;   // largo de la lengüeta
CLP_LW_LIP=  2.0;   // labio final de retención

// Palanca de liberación (empuja la lengüeta para soltar)
LVR_H     = 18.0;
LVR_T     =  3.2;

// ==========================================================
//   PRIMITIVAS
// ==========================================================

module rr2(w, d, r) {
    offset(r=r, $fn=$fn) offset(r=-r) square([w, d]);
}
module rbox(w, d, h, r) {
    linear_extrude(h) rr2(w, d, r);
}
// Caja con chaflán superior (look mecanizado)
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
// Rectángulo redondeado 3D
module rbox3(w, d, h, r) {
    hull()
        for (tx=[r, w-r], ty=[r, d-r])
            translate([tx, ty, 0])
            cylinder(h=h, r=r, $fn=24);
}

// ==========================================================
//   SLOTS DE BORNES EN LA BASE
// ==========================================================
module cable_slots_cut() {
    total = BSLOT_N * BSLOT_STEP;
    x0 = (W - total) / 2 + (BSLOT_STEP - BSLOT_W) / 2;
    for (i = [0 : BSLOT_N - 1]) {
        x = x0 + i * BSLOT_STEP;
        translate([x, WALL + 2, -0.01])
            cube([BSLOT_W, D - WALL*2 - 4, FL + 0.02]);
        // bisel interior
        translate([x, WALL + 2, FL - BSLOT_BEV + 0.01])
            rotate([0, 90, 0])
            linear_extrude(BSLOT_W)
            polygon([[0,0],[BSLOT_BEV, 0],[0, BSLOT_BEV]]);
    }
}

// ==========================================================
//   VENTANAS LED — DIFUSOR DE PARED FINA (Apple glow)
//
//   Pocket interior que adelgaza la pared frontal a GLOW_T.
//   El LED ilumina desde adentro; la pared difumina la luz
//   sin perforar la superficie → cara completamente lisa.
// ==========================================================
module led_glow_pockets() {
    total = (LED_N - 1) * LED_P;
    x0 = W / 2 - total / 2;
    pocket_depth = WALL_F - GLOW_T;
    for (i = [0 : LED_N - 1]) {
        translate([x0 + i * LED_P - GLOW_W/2,
                   GLOW_T,   // deja GLOW_T de pared desde el frente (Y=0)
                   LED_Z - GLOW_H/2])
            rbox3(GLOW_W, pocket_depth + 0.01, GLOW_H, GLOW_R);
    }
}

// ==========================================================
//   ETIQUETA GRABADA EN FRENTE
//   Línea perimetral sutil — identifica el módulo visualmente
// ==========================================================
module label_engraving() {
    lx = (W - LBL_W) / 2;
    translate([lx, -0.01, LBL_Z])
        rbox3(LBL_W, LBL_DEP + 0.02, LBL_H, LBL_R);
}

// ==========================================================
//   USB-C (solo CPU, zona inferior del frente)
// ==========================================================
module usb_cutout() {
    if (MODULO == "CPU") {
        translate([(W - 11.0)/2, -0.01, 6.0])
            cube([11.0, WALL_F + 0.02, 5.5]);
    }
}

// ==========================================================
//   GUÍAS PCB
// ==========================================================
module pcb_guide_rails() {
    for (side = [0, 1]) {
        xb = side == 0 ? WALL : W - WALL - RAIL_D;
        for (yp = [PCB_YF, PCB_YB]) {
            translate([xb, yp, RAIL_Z0])
                cube([RAIL_D, RAIL_T, RAIL_H]);
        }
    }
    // topes inferiores
    for (side = [0, 1]) {
        xb = side == 0 ? WALL : W - WALL - RAIL_D;
        for (yp = [PCB_YF, PCB_YB])
            translate([xb - 0.5, yp, RAIL_Z0 - 2])
                cube([RAIL_D + 1, RAIL_T, 2]);
    }
}

// ==========================================================
//   AGUJEROS M3 — CLIP EN PARED TRASERA
// ==========================================================
module back_clip_holes() {
    xs = [W/2 - CLP_SP/2, W/2 + CLP_SP/2];
    for (px = xs) {
        translate([px, D - WALL - 0.01, CLP_Z + CLP_BODY_H/2])
            rotate([90, 0, 0])
            cylinder(h = WALL + 0.02, d = 3.5, $fn = 24);
        // insertar M3: pocket avellanado desde dentro
        translate([px, D - WALL + 0.01, CLP_Z + CLP_BODY_H/2])
            rotate([90, 0, 0])
            cylinder(h = 3.5, d = 5.2, $fn = 24);
    }
}

// ==========================================================
//   CUERPO PRINCIPAL
// ==========================================================
module body() {
    difference() {
        apple_box(W, D, H, R, CF);

        // Cavidad interior — pared frontal WALL_F, resto WALL
        translate([WALL, WALL_F, FL])
            cube([W - WALL*2, D - WALL - WALL_F, H + 1]);
        // Paredes laterales y trasera (WALL)
        // El bloque de arriba ya talla el interior correcto:
        // front: de Y=WALL_F, back: de Y=D-WALL, sides: de X=WALL

        // Escalón tapa
        translate([WALL - RBT_W, WALL - RBT_W, H - RBT_H])
            cube([W - 2*(WALL-RBT_W), D - 2*(WALL-RBT_W), RBT_H + 1]);

        // Bornes
        cable_slots_cut();

        // LED glow pockets (interiores, desde Y=GLOW_T)
        led_glow_pockets();

        // Etiqueta
        label_engraving();

        // USB-C
        usb_cutout();

        // Clip holes
        back_clip_holes();

        // Slots ventilación lateral
        for (side = [0, 1]) {
            vx = side == 0 ? -0.01 : W - WALL - 0.01;
            for (i = [0:2]) {
                vy = D * 0.2 + i * D * 0.22;
                translate([vx, vy, H * 0.44])
                    cube([WALL + 0.02, 1.8, 22]);
            }
        }

        // Ranura I2C
        translate([W - WALL - 0.01, (D-10)/2, H - RBT_H - 8])
            cube([WALL + 0.02, 10, 5]);
        translate([-0.01, (D-10)/2, H - RBT_H - 8])
            cube([WALL + 0.02, 10, 5]);
    }

    pcb_guide_rails();
}

// ==========================================================
//   TAPA PLANA CON REBAJE
// ==========================================================
module cover() {
    sW = W - 2*(WALL - RBT_W);
    sD = D - 2*(WALL - RBT_W);
    cW = sW - 2*TOL;
    cD = sD - 2*TOL;
    cR = max(R - (WALL - RBT_W), 1.5);
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
        // Ranuras decorativas rebajadas (más finas, look Apple)
        for (i = [0 : RIB_N - 1]) {
            ry = cD * 0.18 + i * (cD * 0.64 / max(RIB_N-1,1)) - RIB_W/2;
            translate([ox + 3, ry, CVR_T - RIB_D])
                cube([lW - 6, RIB_W, RIB_D + 0.01]);
        }
    }
}

// ==========================================================
//   CLIP DIN TRASERO
//
//   Basado en geometría analizada (DIN_Rail_Hook_v1b.stl):
//     · Placa base: 3.2mm espesor, atornillada a pared trasera
//     · Gancho superior fijo: labio que cae sobre pestaña top
//     · Lengüeta inferior: flexible-rígida (PLA: 2.8mm × 10mm)
//       → se dobla ~2mm para enganchar/soltar sin fatiga
//     · No necesita pieza separada de palanca
//
//   Montaje:
//     1. Atornillar clip a pared trasera del módulo (2× M3)
//     2. Presionar módulo contra riel desde arriba
//        → lengüeta se deforma levemente y hace clic
//     3. Para soltar: empujar lengüeta con destornillador plano
// ==========================================================
module din_clip() {
    cx = (W - CLP_W) / 2;
    // El "centro" del riel en la pieza: CLP_Z desde la base del módulo.
    // En la pieza clip, el riel queda en la zona Z media.
    riel_z_local = CLP_BODY_H * 0.45;  // posición del centro del riel en la pieza

    difference() {
        union() {
            // Placa base (se atornilla al módulo)
            translate([cx, 0, 0])
                rbox(CLP_W, CLP_BASE_T, CLP_BODY_H, 2.5);

            // ── Gancho superior fijo ─────────────────────────
            // Brazo horizontal + labio que cae sobre pestaña top del riel
            gz = riel_z_local + DIN_H / 2;
            translate([cx, 0, gz])
                union() {
                    // Brazo que llega al riel
                    cube([CLP_W, CLP_BASE_T + DIN_T + DIN_GAP + CLP_HK_D, CLP_HK_H]);
                    // Labio descendente (traba la pestaña superior)
                    translate([0, CLP_BASE_T + DIN_T + DIN_GAP, -(DIN_FL + 0.5)])
                        cube([CLP_W, CLP_HK_D, DIN_FL + 0.5 + CLP_HK_H]);
                }

            // ── Lengüeta inferior (retención elástica) ───────
            // Brazo delgado que flexiona al montar y retiene el riel.
            // Longitud: CLP_LW_L, espesor: CLP_LW_T
            // Tiene un labio al final que atrapa la pestaña inferior.
            lz = riel_z_local - DIN_H / 2 - CLP_LW_T;
            lx_offset = (CLP_W - CLP_W * 0.7) / 2;
            translate([cx + lx_offset, 0, lz])
                union() {
                    // Brazo de la lengüeta
                    cube([CLP_W * 0.7, CLP_LW_L, CLP_LW_T]);
                    // Labio de retención al final del brazo
                    translate([0, CLP_LW_L - CLP_LW_LIP, 0])
                        cube([CLP_W * 0.7, CLP_LW_LIP, CLP_LW_T + DIN_FL]);
                }
        }

        // Canal del riel: zona donde encaja el perfil omega
        rz = riel_z_local - DIN_H/2 - DIN_GAP;
        translate([cx - 0.01,
                   CLP_BASE_T - DIN_GAP,
                   rz])
            cube([CLP_W + 0.02,
                  DIN_T + DIN_GAP*2 + 0.01,
                  DIN_H + DIN_GAP*2]);

        // Tornillos M3 sujeción al módulo (avellanados)
        xs = [W/2 - CLP_SP/2, W/2 + CLP_SP/2];
        for (px = xs) {
            translate([px, CLP_BASE_T/2, CLP_BODY_H/2])
                rotate([90, 0, 0]) {
                    cylinder(h = CLP_BASE_T + 0.2, d = 3.4, $fn=20);
                    cylinder(h = 2.2, d1 = 6.5, d2 = 3.4, $fn=20);
                }
        }

        // Aligeramiento (reduce masa sin comprometer rigidez)
        m = 5.0;
        translate([cx + m, CLP_BASE_T - 2.0, m])
            cube([CLP_W - m*2, 2.2, CLP_BODY_H - m*2]);
    }
}

// ==========================================================
//   RENDER
// ==========================================================

if (RENDER == "BODY") {
    color("#d5d5d5") body();
}
else if (RENDER == "COVER") {
    color("#e8e8e8") cover();
}
else if (RENDER == "CLIP") {
    color("#4a5258") din_clip();
}
else if (RENDER == "PREVIEW") {
    // Cuerpo
    color("#d5d5d5", 0.95) body();

    // Tapa encajada en el escalón superior
    translate([WALL - RBT_W + TOL,
               WALL - RBT_W + TOL,
               H - CVR_T])
        color("#e8e8e8") cover();

    // Clip DIN — detrás de la pared trasera del módulo
    translate([0, D, CLP_Z - CLP_BODY_H * 0.45])
        color("#3a4248") din_clip();

    // Riel DIN de referencia (% = fantasma, no se imprime)
    riel_y = D + CLP_BASE_T + DIN_T/2 - DIN_GAP;
    %translate([(W - DIN_W)/2, riel_y, CLP_Z - DIN_H/2])
        cube([DIN_W, DIN_T, DIN_H]);
}
else if (RENDER == "PLATE") {
    // ── Plato de impresión ──────────────────────────────
    // 1. Body (mayor pieza — imprimir primero)
    color("#d5d5d5") body();

    // 2. Cover (cara superior hacia arriba, sin soporte)
    translate([W + 12, 0, CVR_T])
        rotate([180, 0, 0])
        color("#e8e8e8") cover();

    // 3. Clip DIN
    translate([0, D + 12, 0])
        color("#3a4248") din_clip();
}
