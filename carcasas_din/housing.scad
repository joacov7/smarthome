/* ==========================================================
   SISTEMA MODULAR ESP32 — Carcasa DIN 35mm (TS35)
   Paramétrico · PETG · Carril DIN 35mm tipo omega

   CÓMO USAR:
     1. Elegí el módulo en MODULO (o usá CUSTOM con WIDTH_U)
     2. Elegí qué imprimir en RENDER: "BODY" | "COVER" | "PREVIEW"
     3. Export → STL desde OpenSCAD

   MÓDULOS:
     "PSU"    → 2U  (36mm)  Fuente HLK-PM01
     "CPU"    → 3U  (54mm)  ESP32 + OLED
     "RELAY4" → 4U  (72mm)  Relés 4CH
     "IN8"    → 3U  (54mm)  Entradas 8CH
     "BORNES" → 2U  (36mm)  Bornes de expansión
     "CUSTOM" → usa WIDTH_U
   ========================================================== */

// ── SELECCIÓN PRINCIPAL ───────────────────────────────────
MODULO = "CPU";         // ver tabla arriba
RENDER = "PREVIEW";     // "BODY" | "COVER" | "PREVIEW"

// ── PARÁMETROS DE UNIDAD ─────────────────────────────────
U          = 18.0;      // mm por unidad DIN (estándar 17.5, usamos 18 para holgura)
WIDTH_U    = 3;         // unidades para MODULO="CUSTOM"

// ── GEOMETRÍA GLOBAL (no cambiar salvo que sepas) ─────────
WALL       = 2.0;       // espesor de pared general
FLOOR      = 1.8;       // espesor del piso
DEPTH      = 62.0;      // profundidad total del módulo (delante→atrás)
H_BODY     = 65.0;      // altura del cuerpo sobre el clip DIN
TOL        = 0.25;      // tolerancia de encastre tapa/cuerpo
$fn        = 28;        // resolución de curvas

// ── CLIP DIN TS35 ────────────────────────────────────────
DIN_W      = 35.0;      // ancho del carril omega
DIN_H      = 7.5;       // altura del perfil omega
DIN_T      = 1.0;       // espesor aprox. del acero del carril
DIN_FLANGE = 2.3;       // vuelo de la pestaña del carril
DIN_GAP    = 0.35;      // holgura clip-carril

// ── BUS I2C LATERAL (conector 6 pines, paso 2.54mm) ──────
BUS_ENABLE = true;      // true → agujeros laterales para el bus
BUS_W      = 16.0;      // ancho del conector (6 × 2.54 + cuerpo)
BUS_H      = 9.0;       // alto del conector
BUS_Z      = 12.0;      // distancia desde el piso interior al centro del bus
BUS_Y_OFF  = 0.0;       // offset Y desde el centro de la pared lateral

// ── TAPA ─────────────────────────────────────────────────
COVER_T    = 2.0;       // espesor del techo de la tapa
SNAP_W     = 10.0;      // ancho de cada pestaña snap
SNAP_H     = 3.5;       // alto de la pestaña snap
SNAP_D     = 1.4;       // profundidad del diente snap

// ── VENTANAS LED ─────────────────────────────────────────
LED_ENABLE = true;
LED_COLS   = 4;         // columnas de agujeros LED en tapa
LED_ROWS   = 1;         // filas
LED_D      = 3.4;       // diámetro de cada ventana
LED_PITCH  = 7.0;       // separación entre centros

// ── PORTAETIQUETA FRONTAL ─────────────────────────────────
LABEL_ENABLE = true;
LABEL_H    = 13.0;      // alto de la ranura (espacio para etiqueta)
LABEL_Z    = 6.0;       // posición Z desde piso interior
LABEL_SIDE_MARGIN = 5.0;// margen lateral

// ── POSTES DE PCB ────────────────────────────────────────
POST_ENABLE = true;
POST_H     = 5.0;       // altura del poste sobre el piso
POST_OD    = 6.0;       // diámetro exterior
POST_ID    = 3.4;       // diámetro interior (agujero M3)
POST_MARGIN = 5.0;      // margen desde paredes laterales

// ==========================================================
//   LÓGICA INTERNA — no hace falta tocar esto
// ==========================================================
function mod_units(m) =
    m == "PSU"    ? 2 :
    m == "BORNES" ? 2 :
    m == "CPU"    ? 3 :
    m == "IN8"    ? 3 :
    m == "RELAY4" ? 4 :
    WIDTH_U;

W = mod_units(MODULO) * U;   // ancho exterior calculado
H = H_BODY;                  // alias corto

// ==========================================================
//   PRIMITIVAS
// ==========================================================

// Rectángulo con esquinas redondeadas (2D)
module roundrect(w, d, r) {
    offset(r=r) offset(r=-r) square([w, d]);
}

// Extrusión de rectángulo redondeado
module rbox(w, d, h, r=1.5) {
    linear_extrude(h) roundrect(w, d, r);
}

// ==========================================================
//   CLIP DIN TS35 — se genera en el piso del cuerpo
//   Coordenadas: Z=0 es la base del clip (apoya en el riel)
//   El cuerpo empieza en Z = DIN_H + DIN_T + WALL
// ==========================================================
module din_clip() {
    clip_base_h = DIN_H + DIN_T + WALL;
    hook_t      = WALL * 1.2;
    spring_t    = WALL * 0.8;     // pared delgada → flexible
    spring_len  = DIN_FLANGE + DIN_T + DIN_GAP + 1.5;

    difference() {
        union() {
            // Bloque base
            cube([W, DEPTH, clip_base_h]);

            // Gancho FIJO (frente superior) — engancha el borde superior del carril
            translate([0, 0, clip_base_h])
                cube([W, hook_t * 2, DIN_T + 1.5]);

            // Gancho ELÁSTICO (fondo) — snap con rampa 45°
            translate([0, DEPTH - spring_t, 0])
                cube([W, spring_t, spring_len + 1]);
            // Rampa de entry del snap
            translate([0, DEPTH - spring_t - 1.5, 0])
                rotate([0, 90, 0])
                linear_extrude(W)
                polygon([[0,0],[0, spring_len], [1.5, spring_len]]);
        }

        // Canal del carril (centrado en X, abierto hacia abajo)
        translate([(W - DIN_W) / 2 - DIN_GAP, -1, WALL])
            cube([DIN_W + DIN_GAP * 2, DEPTH + 2, DIN_H + DIN_T + 1]);

        // Aligeramiento del bloque base (reduce material)
        margin = WALL + 2;
        translate([margin, margin, WALL])
            cube([W - margin*2, DEPTH - margin*2, clip_base_h - WALL + 0.1]);

        // Ranuras de alivio para la pared elástica (flexibilidad)
        relief_d = spring_t * 0.6;
        for (i = [W*0.15, W*0.5, W*0.85])
            translate([i - relief_d/2, DEPTH - spring_t*3, -0.1])
                cube([relief_d, spring_t * 1.5, spring_len * 0.7]);
    }
}

// ==========================================================
//   ORIFICIOS BUS I2C LATERAL
//   Centrado en Y=DEPTH/2, a altura BUS_Z desde piso interior
// ==========================================================
module bus_hole_left() {
    by = (DEPTH - BUS_W) / 2 + BUS_Y_OFF;
    bz = BUS_Z + FLOOR;
    translate([-0.5, by, bz])
        cube([WALL + 1, BUS_W, BUS_H]);
}

module bus_hole_right() {
    translate([W, 0, 0]) mirror([1,0,0]) bus_hole_left();
}

// ==========================================================
//   POSTES PARA PCB
// ==========================================================
module pcb_posts() {
    xs = [POST_MARGIN + POST_OD/2,
          W - POST_MARGIN - POST_OD/2];
    ys = [POST_MARGIN + POST_OD/2 + 4,
          DEPTH - POST_MARGIN - POST_OD/2 - 4];
    for (px = xs) for (py = ys)
        translate([px, py, FLOOR])
            difference() {
                cylinder(h=POST_H, d=POST_OD);
                translate([0, 0, -0.1])
                    cylinder(h=POST_H + 0.2, d=POST_ID);
            }
}

// ==========================================================
//   CUERPO PRINCIPAL
// ==========================================================
module body() {
    difference() {
        union() {
            // ── Paredes + piso ──────────────────────────
            difference() {
                rbox(W, DEPTH, H);
                // hueco interior
                translate([WALL, WALL, FLOOR])
                    cube([W - WALL*2, DEPTH - WALL*2, H]);
            }

            // ── Clip DIN debajo ─────────────────────────
            clip_h = DIN_H + DIN_T + WALL;
            translate([0, 0, -clip_h])
                din_clip();

            // ── Guías verticales para la tapa (esquinas) ──
            guide_d = 2.5;
            for (gx = [WALL + TOL, W - WALL - TOL - guide_d])
                for (gy = [WALL + TOL, DEPTH - WALL - TOL - guide_d])
                    translate([gx, gy, H - SNAP_H - 4])
                        cube([guide_d, guide_d, SNAP_H + 4.5]);
        }

        // ── Receso superior para encastrar la tapa ──────
        translate([WALL + TOL, WALL + TOL, H - SNAP_H - TOL])
            cube([W - (WALL+TOL)*2,
                  DEPTH - (WALL+TOL)*2,
                  SNAP_H + TOL + 0.5]);

        // ── Muescas snap (2 por lado largo) ─────────────
        snap_positions = [W*0.28, W*0.72];
        for (sx = snap_positions) {
            // lado frontal
            translate([sx - SNAP_W/2, WALL - 0.1, H - SNAP_H*0.6 - TOL])
                cube([SNAP_W, SNAP_D + 0.1, SNAP_H * 0.6]);
            // lado trasero
            translate([sx - SNAP_W/2, DEPTH - WALL - SNAP_D, H - SNAP_H*0.6 - TOL])
                cube([SNAP_W, SNAP_D + 0.1, SNAP_H * 0.6]);
        }

        // ── Agujeros bus I2C ─────────────────────────────
        if (BUS_ENABLE) {
            bus_hole_left();
            bus_hole_right();
        }

        // ── Portaetiqueta frontal ────────────────────────
        if (LABEL_ENABLE) {
            lw = W - LABEL_SIDE_MARGIN * 2;
            translate([LABEL_SIDE_MARGIN, -0.1, LABEL_Z])
                cube([lw, WALL + 0.2, LABEL_H]);
            // bisel de entrada para deslizar la etiqueta
            translate([LABEL_SIDE_MARGIN, -0.1, LABEL_Z + LABEL_H - 1])
                rotate([0, 90, 0])
                linear_extrude(lw)
                polygon([[0, 0], [0, 1.5], [WALL + 0.2, 0]]);
        }

        // ── Ventilación en el piso (slots) ───────────────
        slot_w = 1.8;
        slot_count = floor((W - 12) / 6);
        for (i = [0 : slot_count - 1])
            translate([6 + i * (W - 12) / slot_count,
                       DEPTH * 0.3, -0.1])
                cube([slot_w, DEPTH * 0.4, FLOOR + 0.2]);
    }

    // ── Postes PCB ───────────────────────────────────────
    if (POST_ENABLE) pcb_posts();
}

// ==========================================================
//   TAPA
// ==========================================================
module cover() {
    cW = W - TOL * 2;
    cD = DEPTH - TOL * 2;
    inner_W = cW - WALL * 2;
    inner_D = cD - WALL * 2;
    flange_h = SNAP_H - TOL;

    difference() {
        union() {
            // Techo
            rbox(cW, cD, COVER_T);

            // Falda de encastre
            translate([0, 0, -flange_h])
                difference() {
                    rbox(cW, cD, flange_h + 0.1);
                    translate([WALL, WALL, -0.1])
                        cube([inner_W, inner_D, flange_h + 0.3]);
                }

            // Dientes snap (coinciden con muescas del body)
            snap_positions = [W*0.28 - TOL, W*0.72 - TOL];
            for (sx = snap_positions) {
                // frontal
                translate([sx - SNAP_W/2, WALL, -flange_h])
                    cube([SNAP_W, SNAP_D, SNAP_H * 0.55]);
                // trasero
                translate([sx - SNAP_W/2, cD - WALL - SNAP_D, -flange_h])
                    cube([SNAP_W, SNAP_D, SNAP_H * 0.55]);
            }
        }

        // ── Ventanas LED ─────────────────────────────────
        if (LED_ENABLE && LED_COLS > 0) {
            total_w = (LED_COLS - 1) * LED_PITCH;
            total_h = (LED_ROWS - 1) * LED_PITCH;
            for (col = [0 : LED_COLS - 1])
                for (row = [0 : LED_ROWS - 1])
                    translate([
                        cW/2 - total_w/2 + col * LED_PITCH,
                        cD/2 - total_h/2 + row * LED_PITCH,
                        -0.1
                    ])
                    cylinder(h=COVER_T + 0.2, d=LED_D);
        }

        // ── Texto módulo en relieve (grabado) ─────────────
        // Requiere font instalado; comentar si da error en tu versión
        // translate([cW/2, cD*0.75, COVER_T - 0.4])
        //     linear_extrude(0.5)
        //     text(MODULO, size=5, halign="center", valign="center",
        //          font="Liberation Mono:style=Bold");
    }
}

// ==========================================================
//   RENDER
// ==========================================================
offset_z = DIN_H + DIN_T + WALL;

if (RENDER == "BODY") {
    translate([0, 0, offset_z])
        color("#1e3050") body();
}
else if (RENDER == "COVER") {
    // La tapa se imprime boca abajo → rotar 180° en slicer
    color("#2a4568") cover();
}
else if (RENDER == "PREVIEW") {
    // Vista ensamblada completa
    translate([0, 0, offset_z]) {
        color("#1e3050", 0.85) body();
        translate([TOL, TOL, H_BODY])
            color("#2a4568", 0.9) cover();
    }
}
