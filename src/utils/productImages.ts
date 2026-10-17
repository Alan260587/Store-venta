/**
 * High-fidelity product visuals matching the user's uploaded photos:
 * - Tijeras Westcott ($35) matching IMG-20261015-WA0077.jpg
 * - Folders Escolares ($25 c/u) matching the 4 colorful folders (Morado, Amarillo, Naranja, Azul)
 * - Crayones Crayola 24 ($40) matching IMG-20261015-WA0075.jpg
 */

export const TIJERAS_WESTCOTT_IMG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 520" width="100%" height="100%">
  <defs>
    <linearGradient id="bgSurface" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
    <linearGradient id="cardstock" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#dce7f5"/>
      <stop offset="50%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#cbd5e1"/>
    </linearGradient>
    <linearGradient id="steelBlade" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#64748b"/>
      <stop offset="35%" stop-color="#cbd5e1"/>
      <stop offset="65%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>
    <linearGradient id="greenPlastic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22c55e"/>
      <stop offset="55%" stop-color="#15803d"/>
      <stop offset="100%" stop-color="#14532d"/>
    </linearGradient>
    <linearGradient id="yellowPlastic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="55%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
    <linearGradient id="redBanner" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7f1d1d"/>
      <stop offset="60%" stop-color="#b91c1c"/>
      <stop offset="100%" stop-color="#dc2626"/>
    </linearGradient>
    <filter id="dropShadow" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="2" dy="5" stdDeviation="5" flood-opacity="0.35"/>
    </filter>
    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="1" dy="3" stdDeviation="3" flood-opacity="0.22"/>
    </filter>
  </defs>

  <!-- Photo Background -->
  <rect width="360" height="520" fill="url(#bgSurface)" rx="16"/>

  <!-- Outer Clear Blister Edge -->
  <rect x="22" y="10" width="316" height="500" rx="28" fill="#f8fafc" fill-opacity="0.35" stroke="#e2e8f0" stroke-width="2" filter="url(#dropShadow)"/>

  <!-- Cardboard Blister Backing Card -->
  <rect x="28" y="16" width="304" height="488" rx="24" fill="url(#cardstock)"/>

  <!-- Hang Slot Hole at Top -->
  <path d="M 122 34 H 238 A 10 10 0 0 1 248 44 A 10 10 0 0 1 238 54 H 122 A 10 10 0 0 1 112 44 A 10 10 0 0 1 122 34 Z" fill="#94a3b8" stroke="#64748b" stroke-width="1.5"/>

  <!-- Top Right Blue Diagonal Ribbon ("WORLD'S FAVORITE SCISSORS") -->
  <polygon points="242,16 286,16 332,62 332,100" fill="#1d4ed8"/>
  <g transform="translate(295, 50) rotate(44)">
    <text x="0" y="-4" fill="#ffffff" font-size="8.5" font-family="Arial, sans-serif" font-weight="bold" text-anchor="middle">WORLD'S</text>
    <text x="0" y="6" fill="#e0f2fe" font-size="7.5" font-family="Arial, sans-serif" font-weight="bold" text-anchor="middle">FAVORITE SCISSORS</text>
  </g>

  <!-- WESTCOTT Logo -->
  <g transform="translate(172, 92)">
    <line x1="-95" y1="-10" x2="-38" y2="-10" stroke="#1e3a8a" stroke-width="2.5"/>
    <polygon points="-98,-10 -90,-14 -90,-6" fill="#1e3a8a"/>
    <text x="0" y="0" fill="#1e3a8a" font-size="33" font-family="Georgia, serif" font-weight="bold" text-anchor="middle" letter-spacing="0.5">WESTCOTT</text>
    <text x="48" y="14" fill="#1e3a8a" font-size="11" font-family="Georgia, serif" font-style="italic" text-anchor="middle">Since 1872</text>
  </g>

  <!-- White $35 Price Sticker -->
  <g transform="translate(236, 66)" filter="url(#softShadow)">
    <rect x="0" y="0" width="68" height="40" rx="7" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
    <text x="34" y="29" fill="#0f172a" font-size="27" font-family="Arial, sans-serif" font-weight="bold" text-anchor="middle">$35</text>
  </g>

  <!-- Left Red "AGES 6+ / Pointed Tip" Banner -->
  <path d="M 28 126 H 158 A 14 14 0 0 1 172 140 A 14 14 0 0 1 158 154 H 28 Z" fill="url(#redBanner)"/>
  <ellipse cx="82" cy="119" rx="37" ry="13" fill="#b91c1c" stroke="#ffffff" stroke-width="1.5"/>
  <text x="82" y="123" fill="#ffffff" font-size="11" font-family="Arial, sans-serif" font-weight="bold" text-anchor="middle">AGES 6+</text>
  <text x="104" y="145" fill="#ffffff" font-size="12" font-family="Arial, sans-serif" font-weight="bold" text-anchor="middle">Pointed Tip</text>
  <polygon points="40,160 47,128 54,160" fill="#e2e8f0" stroke="#475569" stroke-width="1"/>

  <!-- Decorative Bottom Bubbles on Card -->
  <circle cx="62" cy="410" r="24" fill="#15803d" fill-opacity="0.45"/>
  <circle cx="148" cy="426" r="18" fill="#ca8a04" fill-opacity="0.35"/>
  <circle cx="228" cy="466" r="24" fill="#ca8a04" fill-opacity="0.5"/>

  <!-- Vertical "For Kids" Text on Left -->
  <g transform="translate(88, 308) rotate(-90)">
    <text x="0" y="0" fill="#991b1b" stroke="#7f1d1d" stroke-width="5" stroke-linejoin="round" font-size="28" font-family="Arial Black, Impact, sans-serif" font-weight="900" text-anchor="middle" letter-spacing="1">For Kids</text>
    <text x="0" y="0" fill="#f8fafc" font-size="28" font-family="Arial Black, Impact, sans-serif" font-weight="900" text-anchor="middle" letter-spacing="1">For Kids</text>
  </g>

  <!-- Right Bullet Points -->
  <g transform="translate(256, 265)" font-family="Arial, sans-serif" font-size="10.5" font-weight="bold" fill="#334155">
    <polygon points="-8,-7 -2,-3 -8,1" fill="#b91c1c"/>
    <text x="0" y="0">Durable</text>
    <text x="0" y="12">stainless</text>
    <text x="0" y="24">steel blades</text>

    <polygon points="-8,35 -2,39 -8,43" fill="#b91c1c"/>
    <text x="0" y="42">Left or right</text>
    <text x="0" y="54">handed</text>

    <polygon points="-8,66 -2,70 -8,74" fill="#b91c1c"/>
    <text x="0" y="73">5 year</text>
    <text x="0" y="85">warranty</text>
  </g>

  <!-- Bottom Right "2 PACK" Starburst Badge -->
  <g transform="translate(285, 420)" filter="url(#softShadow)">
    <polygon points="0,-32 10,-22 24,-26 20,-12 32,-4 22,8 26,22 12,20 4,32 -6,22 -20,26 -18,12 -30,2 -20,-10 -24,-24 -10,-20" fill="#dc2626" stroke="#ffffff" stroke-width="2"/>
    <text x="-2" y="2" fill="#fde047" stroke="#1e3a8a" stroke-width="1.5" font-size="30" font-family="Impact, Arial Black, sans-serif" font-weight="bold" text-anchor="middle">2</text>
    <text x="0" y="18" fill="#ffffff" stroke="#1e3a8a" stroke-width="3" paint-order="stroke" font-size="14" font-family="Impact, Arial Black, sans-serif" font-weight="bold" text-anchor="middle" letter-spacing="0.5">PACK</text>
  </g>

  <!-- SCISSORS PAIR #1 (BACK - YELLOW/ORANGE HANDLE) -->
  <g filter="url(#dropShadow)">
    <path d="M 155 170 C 90 135, 65 235, 130 262 C 148 268, 162 255, 165 235 Z" fill="none" stroke="url(#yellowPlastic)" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 185 112 C 265 102, 285 225, 222 272 C 205 284, 192 260, 186 232 Z" fill="none" stroke="url(#yellowPlastic)" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <!-- SCISSORS PAIR #2 (FRONT - GREEN HANDLE & STEEL BLADE) -->
  <g filter="url(#dropShadow)">
    <path d="M 167 104 C 171 98, 179 98, 183 104 L 198 250 L 156 250 Z" fill="url(#steelBlade)" stroke="#475569" stroke-width="1"/>
    <line x1="176" y1="102" x2="180" y2="245" stroke="#475569" stroke-width="1"/>
    <g transform="translate(174, 168) rotate(88)">
      <text x="0" y="0" fill="#1e293b" font-size="9.5" font-family="Georgia, serif" font-weight="bold" text-anchor="middle" letter-spacing="0.5">WESTCOTT®</text>
    </g>
    <circle cx="179" cy="212" r="3.5" fill="#334155"/>

    <path d="M 162 252 C 138 300, 92 345, 98 410 C 103 458, 165 478, 192 442 C 210 416, 188 345, 178 282 Z" fill="url(#greenPlastic)"/>
    <ellipse cx="145" cy="395" rx="28" ry="44" transform="rotate(-12 145 395)" fill="#cbd5e1" stroke="#14532d" stroke-width="4"/>

    <path d="M 155 245 C 155 232, 190 230, 202 252 C 218 288, 285 335, 290 385 C 294 432, 232 452, 200 408 C 175 374, 166 305, 155 245 Z" fill="url(#greenPlastic)"/>
    <ellipse cx="238" cy="378" rx="26" ry="36" transform="rotate(-22 238 378)" fill="#cbd5e1" stroke="#14532d" stroke-width="4"/>

    <path d="M 164 252 Q 182 295 215 328" fill="none" stroke="#86efac" stroke-width="3" stroke-linecap="round" stroke-opacity="0.6"/>
    <path d="M 112 365 Q 102 405 122 438" fill="none" stroke="#86efac" stroke-width="3" stroke-linecap="round" stroke-opacity="0.5"/>
  </g>

  <!-- Clear Plastic Blister Glare / Reflection Overlay -->
  <path d="M 65 95 Q 175 82 285 105" fill="none" stroke="#ffffff" stroke-width="3" stroke-opacity="0.55" stroke-linecap="round"/>
  <ellipse cx="232" cy="185" rx="18" ry="42" transform="rotate(-15 232 185)" fill="#ffffff" fill-opacity="0.22"/>
  <ellipse cx="142" cy="395" rx="22" ry="38" transform="rotate(-12 142 395)" fill="#ffffff" fill-opacity="0.25"/>
</svg>
`)}`;

// SVG Card for Folders Escolares matching the 4 vibrant folders (Morado, Amarillo, Naranja, Azul) with $25 c/u badge
export const CUADERNOS_ESCOLARES_IMG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <filter id="shadowN" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="3" dy="5" stdDeviation="5" flood-opacity="0.25"/>
    </filter>
  </defs>
  <!-- Background Tile -->
  <rect width="400" height="400" fill="#f8fafc" rx="20"/>
  <!-- Folder 1: Morado (Leftmost) -->
  <g transform="translate(30, 45)" filter="url(#shadowN)">
    <rect x="0" y="0" width="130" height="280" rx="6" fill="#7c3aed"/>
    <rect x="0" y="0" width="14" height="280" rx="3" fill="#6d28d9"/>
    <line x1="14" y1="0" x2="14" y2="280" stroke="#5b21b6" stroke-width="1.5"/>
  </g>
  <!-- Folder 2: Amarillo -->
  <g transform="translate(100, 40)" filter="url(#shadowN)">
    <rect x="0" y="0" width="130" height="285" rx="6" fill="#facc15"/>
    <rect x="0" y="0" width="14" height="285" rx="3" fill="#eab308"/>
    <line x1="14" y1="0" x2="14" y2="285" stroke="#ca8a04" stroke-width="1.5"/>
  </g>
  <!-- Folder 3: Naranja -->
  <g transform="translate(170, 35)" filter="url(#shadowN)">
    <rect x="0" y="0" width="130" height="290" rx="6" fill="#f97316"/>
    <rect x="0" y="0" width="14" height="290" rx="3" fill="#ea580c"/>
    <line x1="14" y1="0" x2="14" y2="290" stroke="#c2410c" stroke-width="1.5"/>
  </g>
  <!-- Folder 4: Azul (Rightmost) -->
  <g transform="translate(225, 30)" filter="url(#shadowN)">
    <rect x="0" y="0" width="145" height="295" rx="8" fill="#38bdf8"/>
    <rect x="0" y="0" width="16" height="295" rx="4" fill="#0284c7"/>
    <line x1="16" y1="0" x2="16" y2="295" stroke="#0369a1" stroke-width="2"/>
    <line x1="30" y1="50" x2="135" y2="50" stroke="#7dd3fc" stroke-width="1"/>
    <line x1="30" y1="70" x2="135" y2="70" stroke="#7dd3fc" stroke-width="1"/>
  </g>
  <!-- Price Badge at Bottom Center ($25 c/u) -->
  <g transform="translate(130, 320)" filter="url(#shadowN)">
    <rect x="0" y="0" width="140" height="52" rx="10" fill="white" stroke="#334155" stroke-width="2"/>
    <text x="70" y="37" fill="#0f172a" font-size="28" font-family="sans-serif" font-weight="bold" text-anchor="middle">$25 c/u</text>
  </g>
</svg>
`)}`;

// SVG Card for Crayones Crayola 24 matching IMG-20261015-WA0075.jpg exactly
export const CRAYONES_CRAYOLA_IMG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 490" width="100%" height="100%">
  <defs>
    <linearGradient id="tableBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d6d1c7"/>
      <stop offset="50%" stop-color="#c4beb2"/>
      <stop offset="100%" stop-color="#b3aca0"/>
    </linearGradient>
    <linearGradient id="crayYellow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#eab308"/>
      <stop offset="35%" stop-color="#facc15"/>
      <stop offset="85%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
    <linearGradient id="crayGreen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#15803d"/>
      <stop offset="100%" stop-color="#166534"/>
    </linearGradient>
    <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7f1d1d"/>
      <stop offset="20%" stop-color="#b91c1c"/>
      <stop offset="50%" stop-color="#dc2626"/>
      <stop offset="80%" stop-color="#b91c1c"/>
      <stop offset="100%" stop-color="#7f1d1d"/>
    </linearGradient>
    <filter id="boxShadow" x="-15%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="-6" dy="8" stdDeviation="7" flood-opacity="0.38"/>
    </filter>
    <filter id="stickerShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="1" dy="2" stdDeviation="2.5" flood-opacity="0.28"/>
    </filter>
    <clipPath id="smileWindowClip">
      <path d="M 60 124 C 70 122, 82 145, 185 145 C 275 145, 290 122, 300 124 C 306 128, 282 214, 185 214 C 85 214, 54 128, 60 124 Z"/>
    </clipPath>
    <clipPath id="boxBodyClip">
      <rect x="34" y="76" width="296" height="384" rx="5"/>
    </clipPath>
  </defs>

  <!-- Tabletop Photo Background -->
  <rect width="360" height="490" fill="url(#tableBg)" rx="16"/>

  <!-- Main Crayola Box Group with Realistic Shadow -->
  <g filter="url(#boxShadow)">
    
    <!-- Top Green Hang Tab -->
    <path d="M 48 34 H 306 A 6 6 0 0 1 312 40 V 80 H 42 V 40 A 6 6 0 0 1 48 34 Z" fill="url(#crayGreen)"/>
    <!-- Top Edge Highlight on Green Tab -->
    <line x1="48" y1="35" x2="306" y2="35" stroke="#86efac" stroke-width="1.5" stroke-opacity="0.6"/>
    <!-- "24" on Top Left of Green Tab -->
    <text x="86" y="74" fill="#f8fafc" font-size="36" font-family="Arial Rounded MT Bold, Impact, sans-serif" font-weight="bold" text-anchor="middle">24</text>
    <!-- Die-cut Euro Hang Slot showing tabletop -->
    <path d="M 134 52 H 162 C 166 42, 186 42, 190 52 H 218 A 9 9 0 0 1 227 61 A 9 9 0 0 1 218 70 H 134 A 9 9 0 0 1 125 61 A 9 9 0 0 1 134 52 Z" fill="#b8b1a4" stroke="#14532d" stroke-width="1.5"/>

    <!-- Yellow Box Body -->
    <rect x="34" y="76" width="296" height="384" rx="5" fill="url(#crayYellow)"/>
    <!-- Top Cardboard Fold Crease Highlight -->
    <line x1="36" y1="78" x2="328" y2="78" stroke="#fef08a" stroke-width="2.5"/>

    <!-- ==================== BOTTOM GREEN CHEVRON STRIPES & CORNERS ==================== -->
    <g clip-path="url(#boxBodyClip)">
      <!-- Left Green Corner & 3 Stripes -->
      <polygon points="34,270 155,460 34,460" fill="#15803d"/>
      <line x1="30" y1="242" x2="168" y2="465" stroke="#15803d" stroke-width="7"/>
      <line x1="42" y1="242" x2="180" y2="465" stroke="#15803d" stroke-width="7"/>

      <!-- Right Green Corner & 3 Stripes -->
      <polygon points="330,270 212,460 330,460" fill="#15803d"/>
      <line x1="334" y1="242" x2="198" y2="465" stroke="#15803d" stroke-width="7"/>
      <line x1="322" y1="242" x2="186" y2="465" stroke="#15803d" stroke-width="7"/>

      <!-- Bottom Left Red Crayon Illustration pointing to 24 -->
      <g transform="translate(88, 418) rotate(-35)">
        <!-- Red Wax Body & Conical Tip -->
        <polygon points="0,-16 42,0 0,16" fill="#b91c1c"/>
        <polygon points="0,-16 14,-5 14,5 0,16" fill="#dc2626"/>
        <!-- Crayon Paper Wrapper -->
        <rect x="-85" y="-16" width="85" height="32" fill="#ef4444"/>
        <!-- Black Wavy Stripes on Red Crayon -->
        <rect x="-22" y="-16" width="7" height="32" fill="#111827"/>
        <path d="M -42 -16 Q -32 0 -42 16 L -52 16 Q -42 0 -52 -16 Z" fill="#111827"/>
        <!-- Highlight on Red Crayon -->
        <line x1="-80" y1="-6" x2="30" y2="-2" stroke="#fca5a5" stroke-width="3" stroke-opacity="0.55" stroke-linecap="round"/>
      </g>
    </g>

    <!-- ==================== DIE-CUT SMILE WINDOW WITH 7 REALISTIC CRAYONS ==================== -->
    <!-- Dark Interior Cavity -->
    <path d="M 60 124 C 70 122, 82 145, 185 145 C 275 145, 290 122, 300 124 C 306 128, 282 214, 185 214 C 85 214, 54 128, 60 124 Z" fill="#1c1917"/>

    <!-- Crayons Inside Window -->
    <g clip-path="url(#smileWindowClip)">
      <!-- 1. Far Left Tilted Brown/Tan Crayon -->
      <g transform="translate(68, 150) rotate(-18)">
        <rect x="-14" y="0" width="28" height="75" fill="#d97706"/>
        <polygon points="-14,0 0,-22 14,0" fill="#92400e"/>
      </g>

      <!-- 2. Red-Orange Crayon -->
      <g transform="translate(103, 148)">
        <polygon points="-15,0 -5,-16 5,-16 15,0" fill="#dc2626"/>
        <rect x="-15" y="0" width="30" height="75" fill="#f87171"/>
        <rect x="-15" y="18" width="30" height="5" fill="#1c1917"/>
        <path d="M -15 32 Q 0 24 15 32 L 15 40 Q 0 32 -15 40 Z" fill="#1c1917"/>
        <rect x="-6" y="0" width="6" height="75" fill="#ffffff" fill-opacity="0.22"/>
      </g>

      <!-- 3. Peach/Orange Crayon -->
      <g transform="translate(135, 150)">
        <polygon points="-15,0 -5,-16 5,-16 15,0" fill="#d97706"/>
        <rect x="-15" y="0" width="30" height="75" fill="#fcd34d"/>
        <rect x="-15" y="20" width="30" height="5" fill="#1c1917"/>
        <path d="M -15 35 Q 0 27 15 35 L 15 43 Q 0 35 -15 43 Z" fill="#1c1917"/>
        <rect x="-6" y="0" width="6" height="75" fill="#ffffff" fill-opacity="0.25"/>
      </g>

      <!-- 4. Yellow Crayon -->
      <g transform="translate(167, 152)">
        <polygon points="-15,0 -5,-16 5,-16 15,0" fill="#eab308"/>
        <rect x="-15" y="0" width="30" height="75" fill="#fef08a"/>
        <rect x="-15" y="20" width="30" height="5" fill="#1c1917"/>
        <path d="M -15 34 Q 0 42 15 34 L 15 42 Q 0 50 -15 42 Z" fill="#1c1917"/>
        <rect x="-6" y="0" width="6" height="75" fill="#ffffff" fill-opacity="0.3"/>
      </g>

      <!-- 5. Green Crayon -->
      <g transform="translate(198, 152)">
        <polygon points="-15,0 -5,-16 5,-16 15,0" fill="#16a34a"/>
        <rect x="-15" y="0" width="30" height="75" fill="#6ee7b7"/>
        <rect x="-15" y="20" width="30" height="5" fill="#1c1917"/>
        <path d="M -15 35 Q 0 43 15 35 L 15 43 Q 0 51 -15 43 Z" fill="#1c1917"/>
        <rect x="-6" y="0" width="6" height="75" fill="#ffffff" fill-opacity="0.25"/>
      </g>

      <!-- 6. Sky Blue Crayon -->
      <g transform="translate(229, 149)">
        <polygon points="-15,0 -5,-16 5,-16 15,0" fill="#0284c7"/>
        <rect x="-15" y="0" width="30" height="75" fill="#7dd3fc"/>
        <rect x="-15" y="19" width="30" height="5" fill="#1c1917"/>
        <path d="M -15 33 Q 0 41 15 33 L 15 41 Q 0 49 -15 41 Z" fill="#1c1917"/>
        <rect x="-6" y="0" width="6" height="75" fill="#ffffff" fill-opacity="0.25"/>
      </g>

      <!-- 7. Purple Crayon -->
      <g transform="translate(260, 145)">
        <polygon points="-15,0 -5,-16 5,-16 15,0" fill="#7c3aed"/>
        <rect x="-15" y="0" width="30" height="75" fill="#c4b5fd"/>
        <rect x="-15" y="18" width="30" height="5" fill="#1c1917"/>
        <path d="M -15 32 Q 0 40 15 32 L 15 40 Q 0 48 -15 40 Z" fill="#1c1917"/>
        <rect x="-6" y="0" width="6" height="75" fill="#ffffff" fill-opacity="0.22"/>
      </g>
    </g>

    <!-- Die-Cut Window Cardboard Rim Shadow -->
    <path d="M 60 124 C 70 122, 82 145, 185 145 C 275 145, 290 122, 300 124 C 306 128, 282 214, 185 214 C 85 214, 54 128, 60 124 Z" fill="none" stroke="#b45309" stroke-width="2" stroke-opacity="0.5"/>

    <!-- ==================== CRAYOLA LOGO ==================== -->
    <g transform="translate(182, 130)">
      <text x="0" y="0" fill="#fef08a" stroke="#fef08a" stroke-width="8" stroke-linejoin="round" font-size="48" font-family="Comic Sans MS, Trebuchet MS, Arial Rounded MT Bold, sans-serif" font-weight="bold" text-anchor="middle" letter-spacing="0.5">Crayola</text>
      <text x="0" y="0" fill="#15803d" stroke="#14532d" stroke-width="1.5" font-size="48" font-family="Comic Sans MS, Trebuchet MS, Arial Rounded MT Bold, sans-serif" font-weight="bold" text-anchor="middle" letter-spacing="0.5">Crayola</text>
    </g>

    <!-- ==================== RED "#1 Brand Preferred" RIBBON BANNER ==================== -->
    <g transform="translate(0, 8)">
      <!-- Left & Right Ribbon Tails -->
      <polygon points="44,242 75,212 75,260 44,258 56,246" fill="#991b1b"/>
      <polygon points="318,242 290,218 290,262 318,258 308,246" fill="#7f1d1d"/>
      <!-- Main Curved Ribbon Body -->
      <path d="M 62 210 Q 182 226 300 210 L 296 264 Q 182 248 66 264 Z" fill="url(#ribbonGrad)" stroke="#7f1d1d" stroke-width="1"/>
      <!-- "#1" on Left of Ribbon -->
      <text x="105" y="253" fill="#ffffff" font-size="34" font-family="Impact, Arial Black, sans-serif" font-weight="bold" text-anchor="middle" transform="rotate(-5 105 253)">#1</text>
      <!-- "Brand Preferred by Parents & Teachers" -->
      <text x="204" y="236" fill="#ffffff" font-size="20" font-family="Georgia, serif" font-weight="bold" text-anchor="middle">Brand Preferred</text>
      <text x="204" y="253" fill="#fde047" font-size="13.5" font-family="Georgia, serif" font-weight="bold" text-anchor="middle">by Parents &amp; Teachers</text>
    </g>

    <!-- ==================== LARGE CURVED "CRAYONS" TITLE ==================== -->
    <g transform="translate(184, 336)">
      <text x="0" y="0" fill="#dc2626" stroke="#b91c1c" stroke-width="11" stroke-linejoin="round" paint-order="stroke" font-size="52" font-family="Trebuchet MS, Arial Rounded MT Bold, Impact, sans-serif" font-weight="900" text-anchor="middle" letter-spacing="1">CRAYONS</text>
      <text x="0" y="0" fill="#ffffff" font-size="52" font-family="Trebuchet MS, Arial Rounded MT Bold, Impact, sans-serif" font-weight="900" text-anchor="middle" letter-spacing="1">CRAYONS</text>
    </g>

    <!-- ==================== RED "24" CIRCLE BADGE & NONTOXIC ==================== -->
    <circle cx="185" cy="388" r="29" fill="#b91c1c" stroke="#dc2626" stroke-width="2" stroke-dasharray="6,2"/>
    <text x="185" y="400" fill="#ffffff" font-size="35" font-family="Trebuchet MS, Arial Rounded MT Bold, sans-serif" font-weight="bold" text-anchor="middle">24</text>

    <text x="185" y="446" fill="#14532d" font-size="11" font-family="Arial, sans-serif" font-weight="bold" font-style="italic" text-anchor="middle">Nontoxic</text>

    <!-- Subtle Vertical Gloss on Right Edge of Box -->
    <rect x="318" y="78" width="8" height="380" fill="#ffffff" fill-opacity="0.22"/>
  </g>

  <!-- ==================== WHITE "$40" PRICE STICKER (TOP RIGHT) ==================== -->
  <g transform="translate(230, 42)" filter="url(#stickerShadow)">
    <rect x="0" y="0" width="74" height="52" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
    <text x="37" y="37" fill="#0f172a" font-size="32" font-family="Arial, sans-serif" font-weight="bold" text-anchor="middle">$40</text>
  </g>
</svg>
`)}`;
