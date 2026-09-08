import { PDF_KOREAN_FONT_FAMILY } from "./pdf-fonts";

export function getContractPdfStyles(
  fontRegularUrl: string,
  fontMediumUrl: string,
  fontSemiBoldUrl: string,
  fontBoldUrl: string
): string {
  const formatForUrl = (url: string): string => {
    if (url.startsWith("data:font/woff2")) return "woff2";
    if (url.startsWith("data:font/otf")) return "opentype";
    if (url.endsWith(".woff2")) return "woff2";
    if (url.endsWith(".otf")) return "opentype";
    return "truetype";
  };

  const faces = [
    { family: PDF_KOREAN_FONT_FAMILY, url: fontRegularUrl, weight: 400 },
    { family: PDF_KOREAN_FONT_FAMILY, url: fontMediumUrl, weight: 500 },
    { family: PDF_KOREAN_FONT_FAMILY, url: fontSemiBoldUrl, weight: 600 },
    { family: PDF_KOREAN_FONT_FAMILY, url: fontBoldUrl, weight: 700 },
  ]
    .filter((f) => f.url)
    .map(
      (f) => `
@font-face {
  font-family: "${f.family}";
  src: url("${f.url}") format("${formatForUrl(f.url)}");
  font-weight: ${f.weight};
  font-style: normal;
  font-display: block;
}`
    )
    .join("\n");

  return `
@page {
  size: A4;
  margin: 14mm 15mm 18mm;
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  background: #FDFCFA;
  color: #1B1D21;
  font-family: "${PDF_KOREAN_FONT_FAMILY}", sans-serif;
  font-size: 10.5pt;
  line-height: 1.65;
  letter-spacing: normal;
  word-spacing: normal;
  word-break: keep-all;
  overflow-wrap: break-word;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

${faces}

.document {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
}

.draft-badge {
  font-size: 8pt;
  color: #9A9EA6;
  margin-bottom: 8px;
}

.hero-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 28px;
}

.hero-brand img {
  height: 30px;
  width: auto;
  display: block;
}

.hero-brand-tag {
  margin-top: 8px;
  font-size: 7pt;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: #9A9EA6;
  text-transform: uppercase;
}

.hero-meta {
  text-align: right;
  font-size: 8pt;
}

.hero-meta-row {
  display: grid;
  grid-template-columns: auto auto;
  gap: 4px 12px;
  justify-content: end;
  margin-bottom: 6px;
}

.hero-meta-label {
  color: #9A9EA6;
}

.hero-meta-value {
  color: #1B1D21;
  font-weight: 500;
}

.hero-title {
  text-align: center;
  margin: 0 0 10px;
}

.hero-title h1 {
  margin: 0;
  font-size: 24pt;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: normal;
  color: #1B1D21;
}

.hero-intro {
  text-align: center;
  margin: 0 0 24px;
  font-size: 10pt;
  color: #6B6F78;
  letter-spacing: normal;
}

.section-title {
  margin: 0 0 10px;
  font-size: 12pt;
  font-weight: 600;
  color: #1B1D21;
  letter-spacing: normal;
}

.panel {
  background: #F7F5F0;
  border: 0.5px solid #E3DED5;
  border-radius: 4px;
  padding: 14px;
  margin-bottom: 18px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 42px;
}

.field-label {
  display: block;
  font-size: 7.5pt;
  color: #9A9EA6;
  margin-bottom: 4px;
  letter-spacing: normal;
}

.field-value {
  display: block;
  font-size: 10pt;
  font-weight: 500;
  color: #1B1D21;
  letter-spacing: normal;
}

.field-value-accent {
  color: #F57709;
  font-weight: 600;
}

.service-type-label {
  font-size: 7.5pt;
  color: #9A9EA6;
  margin-bottom: 4px;
}

.service-type-value {
  font-size: 10pt;
  font-weight: 500;
  margin-bottom: 14px;
  color: #1B1D21;
}

.service-scope-label {
  font-size: 7.5pt;
  color: #9A9EA6;
  margin-bottom: 8px;
}

.service-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 24px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.service-list.single-col {
  grid-template-columns: 1fr;
}

.service-item {
  position: relative;
  padding-left: 14px;
  font-size: 10pt;
  color: #1B1D21;
  letter-spacing: normal;
}

.service-item::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #F57709;
}

.clause {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  column-gap: 12px;
  margin-bottom: 18px;
}

.clause-number {
  font-size: 11pt;
  font-weight: 600;
  color: #F57709;
  letter-spacing: normal;
}

.clause-content h3 {
  margin: 0 0 6px;
  font-size: 13.5pt;
  font-weight: 600;
  color: #1B1D21;
  letter-spacing: normal;
}

.clause-content p {
  margin: 0;
  white-space: pre-wrap;
  text-align: left;
  letter-spacing: normal;
  word-spacing: normal;
  line-height: 1.65;
  color: #4A4D57;
}

.special-empty {
  font-size: 10pt;
  color: #9A9EA6;
}

.special-content {
  white-space: pre-wrap;
  font-size: 10pt;
  line-height: 1.65;
  letter-spacing: normal;
  color: #4A4D57;
}

.signature-section {
  break-inside: avoid;
  page-break-inside: avoid;
  margin-top: 8px;
}

.signature-title {
  margin: 0 0 6px;
  font-size: 16pt;
  font-weight: 700;
  color: #1B1D21;
}

.signature-subtitle {
  margin: 0 0 18px;
  font-size: 9pt;
  color: #6B6F78;
}

.signature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  position: relative;
  align-items: stretch;
}

.signature-grid::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 8px;
  bottom: 8px;
  width: 0.5px;
  background: #E3DED5;
  transform: translateX(-50%);
}

.signature-col {
  min-width: 0;
  display: grid;
  grid-template-rows: auto auto auto auto auto auto;
  align-content: start;
  height: 100%;
}

.sig-role {
  font-size: 7.5pt;
  color: #9A9EA6;
  margin-bottom: 6px;
}

.sig-name {
  font-size: 10pt;
  font-weight: 500;
  margin-bottom: 8px;
  color: #1B1D21;
}

.sig-details {
  display: grid;
  grid-template-rows: repeat(4, minmax(1.15em, auto));
  min-height: calc(4 * 1.15em + 9px);
  margin-bottom: 8px;
}

.sig-detail {
  display: flex;
  gap: 6px;
  min-height: 1.15em;
  font-size: 8pt;
  line-height: 1.4;
}

.sig-detail.is-empty {
  visibility: hidden;
}

.sig-detail-label {
  flex: 0 0 auto;
  color: #9A9EA6;
  white-space: nowrap;
}

.sig-detail-value {
  color: #4A4D57;
  word-break: break-word;
}

.sig-rep-label {
  font-size: 7.5pt;
  color: #9A9EA6;
}

.sig-rep {
  font-size: 10pt;
  margin-bottom: 10px;
  color: #1B1D21;
}

.sig-label {
  font-size: 7.5pt;
  color: #9A9EA6;
  margin-bottom: 6px;
}

.sig-box {
  border: 0.5px solid #E3DED5;
  background: #FDFCFA;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.sig-box img {
  object-fit: contain;
  width: 100%;
  max-width: 180px;
  height: 80px;
}

.sig-pending {
  font-size: 9pt;
  color: #9A9EA6;
}

.sig-date {
  font-size: 8pt;
  color: #6B6F78;
}

.verification {
  margin-top: 18px;
}

.verification-grid {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr);
  gap: 6px 12px;
  font-size: 7.5pt;
}

.verification-label {
  color: #9A9EA6;
}

.verification-value {
  color: #1B1D21;
  word-break: break-all;
}

.verification-hash {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 7pt;
}
`;
}
