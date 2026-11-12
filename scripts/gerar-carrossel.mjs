// Gera o carrossel de certificações/badges do README como SVG animado.
//
// O README do GitHub não roda JS nem CSS próprio, então o carrossel do
// portfólio é recriado como um SVG com animação CSS interna (o mesmo truque da
// cobrinha). As imagens das badges vão embutidas em base64, porque o GitHub
// bloqueia imagens externas dentro de SVG.
//
// Uso:  node scripts/gerar-carrossel.mjs
// Saída: assets/certificacoes.svg (pt-BR) e assets/certifications.svg (en)

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Tempo de cada badge na tela (segundos).
const SLIDE_S = 8;

// Ordem = ordem do carrossel. Imagens em assets/badges/*.webp (360x360, do Credly).
const badges = [
  {
    image: "aws-cloud-practitioner",
    title: "AWS Certified Cloud Practitioner",
    issuer: "Amazon Web Services",
    isNew: true,
    pt: {
      kind: "Certificação",
      issued: "nov/2026",
      expires: "nov/2029",
      text: "Certificação oficial da AWS que valida a base em nuvem: conceitos de cloud, serviços essenciais, segurança, arquitetura, preços e suporte. É o primeiro degrau da trilha de certificações AWS.",
    },
    en: {
      kind: "Certification",
      issued: "Nov 2026",
      expires: "Nov 2029",
      text: "Official AWS certification that validates cloud fundamentals: cloud concepts, core services, security, architecture, pricing and support. It is the first step on the AWS certification path.",
    },
  },
  {
    image: "aws-application-networking",
    title: "AWS Application Networking Demonstrated",
    issuer: "Amazon Web Services",
    pt: {
      kind: "Microcredencial",
      issued: "out/2026",
      expires: "out/2027",
      text: "Exame prático em ambiente AWS real, com desafios cronometrados a partir de um cenário de negócio: entrega de aplicações, otimização de desempenho e arquitetura moderna de redes de aplicação.",
    },
    en: {
      kind: "Micro-credential",
      issued: "Oct 2026",
      expires: "Oct 2027",
      text: "Hands-on exam in a live AWS environment, with timed challenges built on a business scenario: application delivery, performance optimization and modern application networking architecture.",
    },
  },
  {
    image: "aws-cloud-quest-networking",
    title: "AWS Cloud Quest: Networking",
    issuer: "Amazon Web Services",
    pt: {
      kind: "Badge de treinamento",
      issued: "out/2026",
      text: "Soluções para escalar a conectividade, ligar redes on-premises e proteger aplicações, com prática em túneis, peering, roteamento entre regiões, filtragem e espelhamento de tráfego e análise de logs.",
    },
    en: {
      kind: "Training badge",
      issued: "Oct 2026",
      text: "Solutions to scale connectivity, connect on-premises networks and protect applications, with hands-on practice in tunnels, peering, inter-region routing, traffic filtering and mirroring, and log analysis.",
    },
  },
  {
    image: "aws-cloud-quest-cloud-practitioner",
    title: "AWS Cloud Quest: Cloud Practitioner",
    issuer: "Amazon Web Services",
    pt: {
      kind: "Badge de treinamento",
      issued: "mai/2025",
      text: "Minha primeira badge AWS: construção de soluções práticas com serviços de computação, rede, banco de dados e segurança, aplicando os conceitos fundamentais da nuvem.",
    },
    en: {
      kind: "Training badge",
      issued: "May 2025",
      text: "My first AWS badge: building hands-on solutions with compute, networking, database and security services, applying the core concepts of the cloud.",
    },
  },
  {
    image: "worldskills-shanghai-2026",
    title: "WorldSkills Shanghai 2026 · Intelligent Security Technology",
    issuer: "WorldSkills",
    pt: {
      kind: "Competição mundial",
      issued: "set/2026",
      text: "Representei o Brasil na modalidade Tecnologia de Segurança Inteligente e terminei em 5º lugar no mundo: planejamento, instalação e manutenção de sistemas que protegem pessoas, patrimônio e infraestrutura.",
    },
    en: {
      kind: "World competition",
      issued: "Sep 2026",
      text: "Represented Brazil in Intelligent Security Technology and finished 5th in the world: planning, installing and maintaining systems that protect people, property and infrastructure.",
    },
  },
];

const ui = {
  pt: { isNew: "nova", issued: "emitida", expires: "válida até", verify: "Verificar no Credly", label: "Certificações e badges do Credly" },
  en: { isNew: "new", issued: "issued", expires: "valid until", verify: "Verify on Credly", label: "Credly certifications and badges" },
};

// Paleta do portfólio.
const C = {
  ink950: "#070809", ink850: "#0e1013", ink700: "#1c2026", ink600: "#2a2f37",
  ink400: "#6b7684", ink200: "#b8c0cc", aws: "#ff9900", term: "#00e58a", net: "#3ea8ff",
};
const MONO = `'JetBrains Mono', ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace`;
const SANS = `Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`;

// Geometria.
const W = 860;
const PAD = 40;
const IMG = 200;
const TX = PAD + IMG + 48; // início do texto
const TW = W - TX - PAD; // largura do texto
const TITLE_PX = 19;
const DESC_PX = 14.5;
// Larguras médias de caractere usadas na quebra de linha. Monoespaçada ≈ 0,6em;
// para a sans o valor é folgado de propósito, porque a fonte real varia por sistema.
const TITLE_CHARS = Math.floor(TW / (TITLE_PX * 0.6));
const DESC_CHARS = Math.floor(TW / (DESC_PX * 0.5));

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function wrap(text, max) {
  const lines = [];
  let cur = "";
  for (const w of text.split(/\s+/)) {
    if (cur && (cur + " " + w).length > max) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + " " + w : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

const pad2 = (n) => String(n).padStart(2, "0");

function build(lang) {
  const t = ui[lang];
  const n = badges.length;
  const total = SLIDE_S * n;
  const share = 100 / n; // % do ciclo em que cada slide fica na tela
  const fade = (0.6 / total) * 100; // 0,6 s de transição

  // Layout de cada slide (o texto define a altura).
  const slides = badges.map((b) => {
    const L = b[lang];
    const title = wrap(b.title, TITLE_CHARS);
    const desc = wrap(L.text, DESC_CHARS);
    let y = 58;
    const metaY = y;
    y += 34;
    const titleY = y;
    y += (title.length - 1) * 26 + 30;
    const descY = y;
    y += (desc.length - 1) * 23 + 32;
    const dateY = y;
    y += 22;
    const btnY = y;
    y += 34;
    return { b, L, title, desc, metaY, titleY, descY, dateY, btnY, bottom: y };
  });
  const stageBottom = Math.max(PAD + IMG, ...slides.map((s) => s.bottom)) + 20;
  const sepY = stageBottom;
  const thumbY = sepY + 16;
  const H = thumbY + 48 + 20 + 2;
  const imgY = Math.round((stageBottom - IMG) / 2);

  const img = (k) => `data:image/webp;base64,${readFileSync(join(ROOT, "assets/badges", `${badges[k].image}.webp`)).toString("base64")}`;

  const kf = `@keyframes show {
    0% { opacity: 0; transform: translateY(8px); }
    ${fade.toFixed(3)}% { opacity: 1; transform: none; }
    ${share.toFixed(3)}% { opacity: 1; transform: none; }
    ${(share + fade).toFixed(3)}% { opacity: 0; transform: none; }
    100% { opacity: 0; transform: none; }
  }
  @keyframes fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  .slide, .on { opacity: 0; transform-box: view-box; animation: show ${total}s linear infinite backwards; }
  .s0 { opacity: 1; }
  ${badges.map((_, k) => `.d${k} { animation-delay: ${k * SLIDE_S}s; }`).join("\n  ")}
  .bar { transform-box: fill-box; transform-origin: 0 50%; animation: fill ${SLIDE_S}s linear infinite; }
  .mono { font-family: ${MONO}; }
  .sans { font-family: ${SANS}; }`;

  const slideSvg = slides
    .map((s, k) => {
      const { b, L } = s;
      // Linha de meta: tipo · emissor [nova]
      const metaPx = 11.5;
      const cw = metaPx * 0.58 + 0.7; // monoespaçada + letter-spacing (só p/ posicionar a etiqueta)
      const kind = L.kind.toUpperCase();
      const issuer = b.issuer.toUpperCase();
      const meta = [
        `<text x="${TX}" y="${s.metaY}" xml:space="preserve"><tspan fill="${C.aws}">${esc(kind)}</tspan><tspan fill="${C.ink400}">  ·  </tspan><tspan fill="${C.ink200}">${esc(issuer)}</tspan></text>`,
      ];
      const x = TX + (kind.length + 5 + issuer.length) * cw + 10;
      if (b.isNew) {
        const label = t.isNew.toUpperCase();
        const pw = label.length * (10.5 * 0.6 + 1) + 16;
        meta.push(
          `<rect x="${x}" y="${s.metaY - 12}" width="${pw.toFixed(1)}" height="17" rx="8.5" fill="${C.term}" fill-opacity="0.1" stroke="${C.term}" stroke-opacity="0.45"/>`,
          `<text x="${(x + pw / 2).toFixed(1)}" y="${s.metaY}" fill="${C.term}" font-size="10.5" letter-spacing="1" text-anchor="middle">${esc(label)}</text>`,
        );
      }

      const date =
        `<tspan fill="${C.term}">$</tspan> ${esc(t.issued)} ${esc(L.issued)}` +
        (L.expires ? ` · ${esc(t.expires)} ${esc(L.expires)}` : "");
      const btnW = t.verify.length * 12 * 0.6 + 52;

      return `<g class="slide d${k}${k === 0 ? " s0" : ""}">
    <use href="#t${k}" x="${PAD}" y="${imgY}" width="${IMG}" height="${IMG}"/>
    <g class="mono" font-size="${metaPx}" letter-spacing="0.7">${meta.join("")}</g>
    <text class="mono" x="${TX}" y="${s.titleY}" font-size="${TITLE_PX}" font-weight="700" fill="#ffffff">${s.title
      .map((l, i) => `<tspan x="${TX}" dy="${i ? 26 : 0}">${esc(l)}</tspan>`)
      .join("")}</text>
    <text class="sans" x="${TX}" y="${s.descY}" font-size="${DESC_PX}" fill="${C.ink200}" fill-opacity="0.92">${s.desc
      .map((l, i) => `<tspan x="${TX}" dy="${i ? 23 : 0}">${esc(l)}</tspan>`)
      .join("")}</text>
    <text class="mono" x="${TX}" y="${s.dateY}" font-size="12" fill="${C.ink400}">${date}</text>
    <rect x="${TX}" y="${s.btnY}" width="${btnW.toFixed(1)}" height="32" rx="8" fill="${C.aws}" fill-opacity="0.08" stroke="${C.aws}" stroke-opacity="0.55"/>
    <g transform="translate(${TX + 14} ${s.btnY + 9})" fill="none" stroke="${C.aws}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 1 L13 4.5 V10.5 L7 14 L1 10.5 V4.5 Z"/><path d="M4.5 7.5 L6.5 9.5 L10 5.5"/></g>
    <text class="mono" x="${TX + 36}" y="${s.btnY + 20.5}" font-size="12" fill="${C.aws}">${esc(t.verify)}</text>
  </g>`;
    })
    .join("\n  ");

  // Miniaturas: base apagada + versão destacada animada junto com o slide.
  const thumbs = badges
    .map((_, k) => {
      const x = PAD + k * 56;
      return `<rect x="${x + 0.5}" y="${thumbY + 0.5}" width="47" height="47" rx="10" fill="${C.ink950}" fill-opacity="0.8" stroke="${C.ink700}"/>
    <use href="#t${k}" x="${x + 3}" y="${thumbY + 3}" width="42" height="42" opacity="0.45"/>
    <g class="on d${k}${k === 0 ? " s0" : ""}"><rect x="${x + 0.5}" y="${thumbY + 0.5}" width="47" height="47" rx="10" fill="${C.ink950}" stroke="${C.aws}" stroke-opacity="0.6"/><use href="#t${k}" x="${x + 3}" y="${thumbY + 3}" width="42" height="42"/></g>`;
    })
    .join("\n  ");

  // Contador 01/05 à direita.
  const counter = badges
    .map(
      (_, k) =>
        `<text class="on d${k}${k === 0 ? " s0" : ""} mono" x="${W - PAD}" y="${thumbY + 29}" font-size="12" fill="${C.ink400}" text-anchor="end">${pad2(k + 1)}/${pad2(n)}</text>`,
    )
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(t.label)}">
  <title>${esc(t.label)}</title>
  <style>
  ${kf}
  </style>
  <defs>
    <clipPath id="card"><rect width="${W}" height="${H}" rx="16"/></clipPath>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.ink850}"/><stop offset="1" stop-color="#0b0c0f"/></linearGradient>
    <radialGradient id="glow" cx="0.18" cy="0.4" r="0.45" gradientTransform="matrix(1 0 0 0.75 0 0.1)"><stop offset="0" stop-color="${C.aws}" stop-opacity="0.09"/><stop offset="1" stop-color="${C.aws}" stop-opacity="0"/></radialGradient>
    <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="${C.net}" fill-opacity="0.08"/></pattern>
    <linearGradient id="prog" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.term}"/><stop offset="1" stop-color="${C.aws}"/></linearGradient>
    <!-- Cada imagem entra uma vez só (base64); slide e miniatura usam via <use>. -->
    ${badges
      .map((_, k) => `<symbol id="t${k}" viewBox="0 0 ${IMG} ${IMG}"><image href="${img(k)}" x="0" y="0" width="${IMG}" height="${IMG}"/></symbol>`)
      .join("\n    ")}
  </defs>
  <g clip-path="url(#card)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
    <rect width="${W}" height="${H}" fill="url(#dots)"/>
  ${slideSvg}
    <line x1="${PAD}" y1="${sepY}" x2="${W - PAD}" y2="${sepY}" stroke="${C.ink700}"/>
  ${thumbs}
  ${counter}
    <rect x="0" y="${H - 2}" width="${W}" height="2" fill="${C.ink600}" fill-opacity="0.6"/>
    <rect class="bar" x="0" y="${H - 2}" width="${W}" height="2" fill="url(#prog)"/>
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="15.5" fill="none" stroke="${C.ink700}"/>
</svg>
`;
}

for (const [lang, file] of [
  ["pt", "assets/certificacoes.svg"],
  ["en", "assets/certifications.svg"],
]) {
  const svg = build(lang);
  writeFileSync(join(ROOT, file), svg);
  console.log(`${file}: ${(svg.length / 1024).toFixed(0)} KB`);
}
