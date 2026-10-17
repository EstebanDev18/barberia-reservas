// Barbero del inicio en SVG. Las animaciones viven en globals.css (clases bb-*);
// los ojos y el parallax leen --mx/--my, que el hero actualiza con el puntero.
const SKIN = "#8a5a3c", HAIR = "#141414", STEEL = "#cfd3d6", INK = "var(--asphalt)";
const limb = (d) => <><path d={d} fill="none" stroke={INK} strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" /><path d={d} fill="none" stroke={SKIN} strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" /></>;
const blade = (d) => <><path d={d} stroke={INK} strokeWidth="10" strokeLinecap="round" /><path d={d} stroke={STEEL} strokeWidth="5" strokeLinecap="round" /></>;

export default function Barber() {
  return <svg className="barber" viewBox="0 0 300 410" role="img" aria-label="Barbero de Legacy cortando con tijeras">
    <defs>
      <clipPath id="bb-head"><ellipse cx="150" cy="150" rx="58" ry="66" /></clipPath>
      <linearGradient id="bb-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={HAIR} /><stop offset="1" stopColor={HAIR} stopOpacity="0" /></linearGradient>
    </defs>
    <rect x="34" y="290" width="232" height="130" rx="18" fill="var(--yellow)" stroke={INK} strokeWidth="8" />
    <path d="M66 415 V312 Q66 248 150 242 Q234 248 234 312 V415 Z" fill="var(--chalk)" stroke={INK} strokeWidth="8" strokeLinejoin="round" />
    <text x="150" y="352" textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize="34" letterSpacing="2" fill="var(--red)">LEGACY</text>
    <rect x="128" y="200" width="44" height="50" fill={SKIN} stroke={INK} strokeWidth="8" />
    <path d="M118 248 Q150 280 182 248" fill="none" stroke="var(--yellow)" strokeWidth="5" strokeDasharray="6 4" strokeLinecap="round" />
    <circle cx="150" cy="266" r="6" fill="var(--yellow)" stroke={INK} strokeWidth="3" />

    <g className="bb-arm-l">
      {limb("M90 292 L42 258 L58 210")}
      <g transform="translate(58 200) rotate(-14)"><rect x="-7" y="-44" width="14" height="46" rx="3" fill="var(--red)" stroke={INK} strokeWidth="4" />{[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M7 ${-38 + i * 8} h8`} stroke={INK} strokeWidth="3" />)}</g>
      <circle cx="58" cy="210" r="15" fill={SKIN} stroke={INK} strokeWidth="6" />
      <circle cx="90" cy="292" r="25" fill="var(--chalk)" stroke={INK} strokeWidth="8" />
    </g>

    <g className="bb-head">
      <circle cx="93" cy="158" r="13" fill={SKIN} stroke={INK} strokeWidth="6" />
      <circle cx="207" cy="158" r="13" fill={SKIN} stroke={INK} strokeWidth="6" />
      <circle cx="91" cy="173" r="4.5" fill="var(--yellow)" stroke={INK} strokeWidth="2" />
      <ellipse cx="150" cy="150" rx="58" ry="66" fill={SKIN} />
      <g clipPath="url(#bb-head)"><rect x="80" y="70" width="140" height="40" fill={HAIR} /><rect x="80" y="104" width="28" height="64" fill="url(#bb-fade)" /><rect x="192" y="104" width="28" height="64" fill="url(#bb-fade)" /></g>
      <ellipse cx="150" cy="150" rx="58" ry="66" fill="none" stroke={INK} strokeWidth="8" />
      <path d="M96 112 Q92 66 150 62 Q208 66 204 112 Z" fill={HAIR} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <path d="M112 92 L134 80 M118 100 L140 88" stroke={SKIN} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M114 132 Q128 123 141 131 M159 131 Q172 123 186 132" fill="none" stroke={HAIR} strokeWidth="7" strokeLinecap="round" />
      <g className="bb-eyes">
        <ellipse cx="128" cy="148" rx="9" ry="9" fill="#fff" stroke={INK} strokeWidth="4" />
        <ellipse cx="172" cy="148" rx="9" ry="9" fill="#fff" stroke={INK} strokeWidth="4" />
        <g className="bb-pupils"><circle cx="128" cy="149" r="4.5" fill={INK} /><circle cx="172" cy="149" r="4.5" fill={INK} /></g>
      </g>
      <path d="M150 154 Q143 170 153 174" fill="none" stroke="#5e3a26" strokeWidth="4" strokeLinecap="round" />
      <path d="M94 150 Q96 238 150 242 Q204 238 206 150 L194 150 Q190 202 150 206 Q110 202 106 150 Z" fill={HAIR} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M126 186 Q150 172 174 186 Q150 195 126 186 Z" fill={HAIR} />
      <path d="M141 196 Q150 202 159 196" fill="none" stroke="#e39b86" strokeWidth="4" strokeLinecap="round" />
    </g>

    <g className="bb-arm-r">
      {limb("M210 292 L258 240 L236 178")}
      <path d="M252 220 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 z" fill={INK} />
      <g className="bb-blade-a">{blade("M236 162 L272 126")}<circle cx="224" cy="176" r="9" fill="none" stroke="var(--red)" strokeWidth="5" /></g>
      <g className="bb-blade-b">{blade("M236 162 L280 142")}<circle cx="232" cy="182" r="9" fill="none" stroke="var(--red)" strokeWidth="5" /></g>
      <circle cx="236" cy="162" r="3.5" fill={INK} />
      <circle cx="234" cy="182" r="14" fill={SKIN} stroke={INK} strokeWidth="6" />
      <circle cx="210" cy="292" r="25" fill="var(--chalk)" stroke={INK} strokeWidth="8" />
      <g className="bb-clips">{[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M${262 + i * 5} ${132 + (i % 2) * 6} l5 7`} stroke={HAIR} strokeWidth="3" strokeLinecap="round" style={{ animationDelay: `${i * 0.26}s` }} />)}</g>
    </g>
  </svg>;
}
