/* ==========================================================
   SISTEMA MODULAR ESP32 — Carcasa DIN 35mm
   Estética minimalista de alta precisión

   RENDER:
     "BODY"      → cuerpo principal
     "COVER"     → tapa superior
     "DIN_CLIP"  → clip DIN separado (tornillos M3)
     "BUS_CAP"   → tapa ciega para orificio de bus
     "PREVIEW"   → ensamblado completo
     "PLATE"     → plato de impresión listo para slicear

   MÓDULOS:
     "PSU"    → 2U  36mm   Fuente HLK-PM01
     "CPU"    → 3U  54mm   ESP32 + OLED
     "RELAY4" → 4U  72mm   Relés 4CH
     "IN8"    → 3U  54mm   Entradas 8CH
     "BORNES" → 2U  36mm   Bornes de expansión
     "CUSTOM" → usa WIDTH_U
   ========================================================== */

// ── SELECCIÓN PRINCIPAL ───────────────────────────────────
MODULO = "CPU";
RENDER = "PREVIEW";
WIDTH_U = 3;     // unidades si MODULO = "CUSTOM"

// ── GRID MODULAR ─────────────────────────────────────────
U    = 18.0;     // mm por unidad de ancho DIN

// ── FORMA ────────────────────────────────────────────────
R    = 5.0;      // radio de esquinas verticales
CF   = 1.4;      // chaflán del borde superior (machined look)
WALL = 1.8;      // espesor de pared
FL   = 1.6;      // espesor del piso
D    = 60.0;     // profundidad total (frente → fondo)
H    = 68.0;     // altura del cuerpo (sin clip DIN)
TOL  = 0.20;     // tolerancia de encastre tapa/cuerpo
$fn  = 40;

// ── PANEL FRONTAL REHUNDIDO ───────────────────────────────
// (cara visible en el tablero eléctrico)
PNL_I = 0.7;     // profundidad del rehundido
PNL_B = 3.5;     // borde alrededor del panel
LBL_H = 13.0;    // alto de la ranura portaetiqueta
LBL_Z = 7.0;     // posición Z de la ranura desde el piso

// ── DIN TS35 ─────────────────────────────────────────────
DIN_W   = 35.0;
DIN_H   = 7.5;
DIN_T   = 1.0;
DIN_GAP = 0.30;

// ── GUÍAS DE ALINEACIÓN LATERAL ──────────────────────────
// Lengüeta (derecha) + ranura (izquierda) para alinear módulos en Z
// → garantiza que los conectores de bus queden exactamente al mismo nivel
GD_W  = 14.0;    // largo de la guía en dirección Y (profundidad)
GD_H  =  2.5;    // altura de la guía en dirección Z
GD_T  =  1.4;    // protrusion/profundidad de la guía en dirección X
GD_Z  = 22.0;    // posición Z de la guía (aprox. nivel del bus I2C)
GD_Y  =  8.0;    // posición Y de la guía desde el frente

// ── BUS I2C LATERAL ───────────────────────────────────────
BUS_W  = 16.0;   // ancho del conector 6-pin (6×2.54 + cuerpo)
BUS_H  =  9.5;   // alto
BUS_Z  = 20.0;   // altura del centro desde el piso interior
BUS_CH =  0.6;   // chaflán del orificio

// ── TAPA ─────────────────────────────────────────────────
CVR_T  = 1.8;    // espesor del techo
FLG_H  = 5.5;    // altura de la falda de encastre (press-fit)

// ── VENTANAS LED (en la tapa) ─────────────────────────────
LED_N  = 4;      // cantidad
LED_P  = 7.5;    // paso entre centros
LED_D  = 3.2;    // diámetro
LED_CF = 0.7;    // chaflán exterior del agujero

// ── POSTES PCB M3 ────────────────────────────────────────
PST_H  = 6.0;
PST_OD = 5.5;
PST_ID = 3.2;
PST_MG = 5.0;    // margen desde paredes

// ── CLIP DIN (pieza separada) ─────────────────────────────
CLP_SP = 22.0;   // separación entre tornillos M3 de sujeción
CLP_T  =  1.4;   // espesor pared elástica del clip (flexible en PETG)
CLP_BH =  3.5;   // altura de la placa base del clip

// ── TAPA BUS (tapa ciega para orificios de bus libres) ────
CAP_FL = 0.9;    // labio exterior de la tapa ciega

// ==========================================================
//   ANCHO CALCULADO
// ==========================================================
W = (MODULO=="PSU"    || MODULO=="BORNES") ? 2*U :
    (MODULO=="CPU"    || MODULO=="IN8"   ) ? 3*U :
    (MODULO=="RELAY4"                    ) ? 4*U : WIDTH_U*U;

// ==========================================================
//   PRIMITIVAS
// ==========================================================

// Rectángulo redondeado 2D
module rr2(w, d, r) {
    offset(r=r, $fn=$fn) offset(r=-r) square([w, d]);
}

// Extrusión recta con esquinas redondeadas
module rbox(w, d, h, r) {
    linear_extrude(h) rr2(w, d, r);
}

// Caja con chaflán en el borde superior
// (esquinas verticales redondeadas + borde superior biselado)
module apple_box(w, d, h, r, c) {
    union() {
        // Parte recta hasta h-c
        linear_extrude(h - c + 0.01) rr2(w, d, r);
        // Transición chaflán: hull de perfil completo → perfil reducido
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
//   GUÍA DE ALINEACIÓN LATERAL
//
//   Lado derecho (X=W): lengüeta macho  →  protrude en +X
//   Lado izquierdo (X=0): ranura hembra →  corte en la pared
//
//   Perfil trapezoidal: entrada con chaflán 45° para deslizamiento
//   suave al montar módulos en el carril uno junto al otro.
// ==========================================================
module guide_tongue() {
    // Trapezoide en sección YZ: base en X=W, punta en X=W+GD_T
    translate([W, GD_Y, GD_Z])
        rotate([90, 0, 90])   // perfil en YZ, extrude en +X
        linear_extrude(GD_T)
        polygon([
            [0,      0     ],   // base inferior-delante
            [GD_W,   0     ],   // base inferior-fondo
            [GD_W,   GD_H  ],   // base superior-fondo
            [0,      GD_H  ],   // base superior-delante
        ]);
    // Chaflán de entrada (frente de la lengüeta, lado Y=GD_Y)
    translate([W, GD_Y, GD_Z])
        rotate([90, 0, 90])
        linear_extrude(GD_T * 0.4)
        polygon([[0,0],[GD_W,0],[GD_W,GD_H],[0,GD_H]]);
}

module guide_groove_cut() {
    // Ranura ligeramente mayor que la lengüeta (TOL en todos los lados)
    t  = TOL * 1.5;
    gw = GD_W + t;
    gh = GD_H + t;
    translate([-0.01, GD_Y - t/2, GD_Z - t/2])
        cube([GD_T + t + 0.01, gw, gh]);
}

// ==========================================================
//   ORIFICIO BUS I2C (con chaflán de entrada)
// ==========================================================
module bus_hole_geom(flip) {
    // flip=0 → izquierdo (X=0), flip=1 → derecho (X=W)
    by = (D - BUS_W) / 2;
    bz = BUS_Z + FL;
    sx = flip ? W - 0.01 : -0.01;

    translate([sx, by, bz]) {
        // Agujero principal
        cube([WALL + 0.02, BUS_W, BUS_H]);
        // Chaflán de entrada (bisel en la cara exterior)
        if (!flip)
            translate([0, -BUS_CH, -BUS_CH])
                hull() {
                    cube([0.01, BUS_W + BUS_CH*2, BUS_H + BUS_CH*2]);
                    translate([BUS_CH, BUS_CH, BUS_CH])
                        cube([0.01, BUS_W, BUS_H]);
                }
        else
            translate([WALL + 0.01, -BUS_CH, -BUS_CH])
                hull() {
                    translate([-0.01, 0, 0])
                        cube([0.01, BUS_W + BUS_CH*2, BUS_H + BUS_CH*2]);
                    translate([-BUS_CH - 0.01, BUS_CH, BUS_CH])
                        cube([0.01, BUS_W, BUS_H]);
                }
    }
}

// ==========================================================
//   POSTES PCB M3
// ==========================================================
module pcb_posts() {
    xs = [PST_MG + PST_OD/2,
          W - PST_MG - PST_OD/2];
    ys = [PST_MG + PST_OD/2 + 3,
          D - PST_MG - PST_OD/2 - 3];
    for (px = xs, py = ys)
        translate([px, py, FL])
            difference() {
                cylinder(h=PST_H, d=PST_OD);
                translate([0, 0, -0.1])
                    cylinder(h=PST_H + 0.2, d=PST_ID);
            }
}

// ==========================================================
//   POCKETS PARA INSERTOS M3 DE LATÓN
//   (en el piso del body, para atornillar el clip DIN)
//   Inserto estándar M3: OD≈4.5mm, largo≈4mm
// ==========================================================
module insert_pockets() {
    xs = [W/2 - CLP_SP/2, W/2 + CLP_SP/2];
    for (px = xs)
        translate([px, D/2, -0.1])
            cylinder(h=4.6, d=4.8, $fn=24);
}

// ==========================================================
//   CUERPO PRINCIPAL
// ==========================================================
module body() {
    difference() {
        union() {
            // ── Shell exterior ─────────────────────────────
            apple_box(W, D, H, R, CF);

            // ── Lengüeta de alineación (lado derecho) ──────
            guide_tongue();
        }

        // ── Hueco interior ─────────────────────────────────
        translate([WALL, WALL, FL])
            cube([W - WALL*2, D - WALL*2, H + 0.1]);

        // ── Panel frontal rehundido ─────────────────────────
        // (cara Y=0, visible desde el frente del tablero)
        pw = W - PNL_B*2;
        ph = H - PNL_B*2 - CF;
        translate([PNL_B, -0.01, PNL_B])
            cube([pw, PNL_I + 0.02, ph]);

        // ── Ranura portaetiqueta (dentro del panel) ─────────
        lw = W - PNL_B*2 - 6;
        translate([(W - lw) / 2, -0.01, PNL_B + LBL_Z])
            cube([lw, PNL_I + WALL + 0.02, LBL_H]);
        // Bisel superior de entrada etiqueta
        translate([(W - lw)/2, -0.01, PNL_B + LBL_Z + LBL_H - 0.8])
            rotate([0, 90, 0])
            linear_extrude(lw)
            polygon([[0, 0],
                     [0,    PNL_I + WALL + 0.02],
                     [PNL_I + WALL + 0.02, 0]]);

        // ── Ranura de alineación (lado izquierdo) ───────────
        guide_groove_cut();

        // ── Orificios bus I2C ────────────────────────────────
        bus_hole_geom(0);
        bus_hole_geom(1);

        // ── Receso tapa: la falda de la tapa encaja aquí ────
        translate([WALL + TOL, WALL + TOL, H - FLG_H - TOL])
            cube([W - (WALL + TOL)*2,
                  D - (WALL + TOL)*2,
                  FLG_H + TOL + 0.5]);

        // ── Pockets insertos M3 (piso) ────────────────────
        insert_pockets();

        // ── Slots de ventilación en el piso ─────────────────
        ns = floor((W - 12) / 6);
        for (i = [0 : ns - 1])
            translate([6 + i * max((W - 12) / max(ns - 1, 1), 0),
                       D * 0.28, -0.1])
                cube([1.8, D * 0.44, FL + 0.2]);
    }

    // ── Postes PCB ─────────────────────────────────────────
    pcb_posts();
}

// ==========================================================
//   TAPA
// ==========================================================
module cover() {
    cW = W - TOL*2;
    cD = D - TOL*2;
    iW = cW - WALL*2;
    iD = cD - WALL*2;

    difference() {
        union() {
            // Techo con chaflán (igual que el body → queda flush)
            apple_box(cW, cD, CVR_T + FLG_H, R - TOL, CF);
        }

        // Hueco interior de la falda (press-fit sobre el body)
        translate([WALL, WALL, 0])
            cube([iW, iD, FLG_H + 0.1]);

        // Ventanas LED (centradas en la tapa)
        total_led_w = (LED_N - 1) * LED_P;
        lx0 = cW/2 - total_led_w/2;
        ly  = cD * 0.72;   // posición Y en la tapa
        lz  = FLG_H;       // coincide con el techo

        for (i = [0 : LED_N - 1]) {
            lx = lx0 + i * LED_P;
            // Agujero cilíndrico pasante
            translate([lx, ly, lz - 0.1])
                cylinder(h=CVR_T + 0.2, d=LED_D);
            // Chaflán exterior (borde superior del agujero)
            translate([lx, ly, lz + CVR_T - LED_CF])
                cylinder(h=LED_CF + 0.1, d1=LED_D, d2=LED_D + LED_CF*2);
        }
    }
}

// ==========================================================
//   CLIP DIN SEPARADO
//
//   Se atornilla a la base del body con 2× M3×8 (insertos en el body).
//   Imprimirlo en orientación normal (placa base hacia abajo).
//   Material: PETG — la pared delgada CLP_T da la flexibilidad
//   necesaria para el snap con el carril.
// ==========================================================
module din_clip() {
    hook_ext = DIN_H + DIN_T + DIN_GAP + 0.8;

    difference() {
        union() {
            // Placa base (se apoya contra el piso del body)
            apple_box(W, D, CLP_BH, R * 0.6, 0.6);

            // Gancho FIJO superior (frente, Y≈0)
            // → engancha el borde superior del carril omega
            translate([0, 0, CLP_BH])
                cube([W, WALL * 1.8, DIN_T + 1.2]);

            // Gancho ELÁSTICO inferior (fondo, Y≈D)
            // → pared delgada CLP_T → flexibilidad en PETG
            translate([0, D - CLP_T, 0])
                cube([W, CLP_T, CLP_BH + hook_ext + 0.3]);

            // Rampa 45° de entrada del snap (guía al instalar)
            translate([0, D - CLP_T - 1.4, 0])
                rotate([0, 90, 0])
                linear_extrude(W)
                polygon([[0, 0],
                         [0, hook_ext + 0.3],
                         [1.4, hook_ext + 0.3]]);
        }

        // Canal para el carril omega (centrado en X, abierto hacia abajo)
        translate([(W - DIN_W)/2 - DIN_GAP, -0.1, CLP_BH - DIN_H])
            cube([DIN_W + DIN_GAP*2, D + 0.2, DIN_H + 0.1]);

        // Tornillos M3 de sujeción (cabeza avellanada → queda flush)
        screw_xs = [W/2 - CLP_SP/2, W/2 + CLP_SP/2];
        for (px = screw_xs) {
            // Agujero pasante M3
            translate([px, D/2, -0.1])
                cylinder(h=CLP_BH + 0.2, d=3.4, $fn=20);
            // Avellanado cabeza tornillo (M3 cónica)
            translate([px, D/2, -0.1])
                cylinder(h=1.8, d1=6.5, d2=3.4, $fn=20);
        }

        // Aligeramiento interior de la placa base
        m = WALL + 2;
        translate([m, m + WALL*1.8, CLP_BH - 2.2])
            cube([W - m*2, D - m*2 - WALL*1.8 - CLP_T - 1.5, 2.4]);

        // Ranuras de alivio del gancho elástico (incrementan flexibilidad)
        for (rx = [W*0.2, W*0.5, W*0.8])
            translate([rx - CLP_T*0.4, D - CLP_T*2.8, -0.1])
                cube([CLP_T * 0.8, CLP_T * 1.8, hook_ext * 0.65]);
    }
}

// ==========================================================
//   TAPA CIEGA DE BUS I2C
//
//   Cierra los orificios de bus en los módulos de los extremos
//   (o entre módulos no conectados). Press-fit con labio exterior.
//   Retiro: presionar el labio con una uña o destornillador plano.
// ==========================================================
module bus_cap() {
    draft  = 0.5;      // ángulo de desmoldeo (facilita retirar)
    plug_d = WALL + 1; // profundidad del tapón
    cw = BUS_W - TOL*2;
    ch = BUS_H - TOL*2;

    union() {
        // Labio exterior (queda fuera de la pared)
        translate([-1.0, -1.0, plug_d])
            difference() {
                cube([cw + 2, ch + 2, CAP_FL]);
                // Chaflán perimetral del labio
                translate([cw/2 + 1, ch/2 + 1, -0.1])
                    cube([cw + 4, ch + 4, CAP_FL + 0.2], center=true); // oversized for corners
            }
        translate([-1.0, -1.0, plug_d])
            linear_extrude(CAP_FL) rr2(cw + 2, ch + 2, 0.8);

        // Tapón cónico (draft facilita insertar/retirar)
        hull() {
            cube([cw, ch, 0.01]);
            translate([draft, draft, plug_d])
                cube([cw - draft*2, ch - draft*2, 0.01]);
        }

        // Muesca de retiro (rebaje en el centro del labio superior)
        // → se puede tirar con la uña
    }
}

// ==========================================================
//   PLATO DE IMPRESIÓN
//   Body + Cover + Clip + 2× Cap, separados y orientados para
//   imprimir sin soportes (cover boca abajo → girar en slicer)
// ==========================================================
module print_plate() {
    spacing = 6;
    color("#d4d4d4") body();
    translate([W + spacing, 0, 0])
        color("#e8e8e8") cover();
    translate([0, D + spacing, 0])
        color("#607080") din_clip();
    translate([W + spacing, D + spacing, 0]) {
        color("#c0c8d0") bus_cap();
        translate([BUS_W + 4, 0, 0])
            color("#c0c8d0") bus_cap();
    }
}

// ==========================================================
//   RENDER
// ==========================================================
clip_offset_z = -(CLP_BH + 0.02);

if (RENDER == "BODY") {
    color("#d4d4d4") body();
}
else if (RENDER == "COVER") {
    // ⚠ Orientar boca abajo en el slicer (techo hacia la cama)
    color("#e8e8e8") cover();
}
else if (RENDER == "DIN_CLIP") {
    color("#607080") din_clip();
}
else if (RENDER == "BUS_CAP") {
    color("#c0c8d0") bus_cap();
}
else if (RENDER == "PREVIEW") {
    // Cuerpo
    color("#d4d4d4", 0.88) body();
    // Tapa encastrada
    translate([TOL, TOL, H])
        color("#e8e8e8", 0.82) cover();
    // Clip DIN bajo el body
    translate([0, 0, clip_offset_z])
        color("#607080") din_clip();
    // Bus caps de ejemplo (lado izquierdo)
    translate([0, (D - BUS_W)/2, BUS_Z + FL])
        rotate([0, 90, 0])
        color("#c0c8d0") bus_cap();
}
else if (RENDER == "PLATE") {
    print_plate();
}
