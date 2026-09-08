/** @deprecated Legacy pdf-lib coordinate renderer — use generateContractPdf from ./generator instead */
import { PDFDocument, PDFFont, PDFPage, StandardFonts } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { CONTRACT_TYPE_LABELS, STATUS_LABELS } from "@/lib/constants";
import { resolveSignatureBuffer } from "@/lib/signature-storage";
import { embedKoreanFonts, KoreanFontSet } from "./fonts";
import {
  drawBullet,
  drawPanel,
  drawRule,
  drawSigFrame,
} from "./draw-primitives";
import {
  GUARANTEE_SERVICES,
  INTRO_LINE,
  MANAGEMENT_SERVICES,
  PDF_PAGE,
  PDF_THEME,
  PDF_TYPE,
  SERVICE_TYPE_LABEL,
} from "./theme";
import {
  lineHeight,
  normalizeText,
  sanitizeClauseContent,
  textWidth,
  toRgb,
  wrapText,
} from "./text-engine";

import {
  PROVIDER_COMPANY_DISPLAY_NAME,
  PROVIDER_COMPANY_PDF_FOOTER_LABEL,
  PROVIDER_COMPANY_PDF_HEADER_TAG,
} from "@/lib/provider-company-display";

const LOGO_PATH = path.join(process.cwd(), "public", "brand", "rankon-logo-on-light.png");
const BRAND_NAME = PROVIDER_COMPANY_DISPLAY_NAME;
const FOOTER_LEFT = PROVIDER_COMPANY_PDF_FOOTER_LABEL;

export interface PdfClause {
  title: string;
  content: string;
  sortOrder: number;
}

export interface PdfCompanyInfo {
  companyName: string;
  representativeName: string;
  representativeTitle?: string | null;
  businessNumber: string;
  address: string;
  phone: string;
  email: string;
}

export interface PdfContractInput {
  contractNumber: string;
  companyName: string;
  representativeName: string;
  contactName?: string | null;
  contactTitle?: string | null;
  phone: string;
  email?: string | null;
  businessNumber?: string | null;
  address?: string | null;
  startDate: string;
  endDate: string;
  totalAmount: number;
  vatIncluded: boolean;
  contractType?: string;
  contractPurpose?: string | null;
  paymentTerms?: string | null;
  specialTerms?: string | null;
  status?: string | null;
  items: Array<{
    name: string;
    description?: string | null;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  clauses: PdfClause[];
  providerSignerName?: string | null;
  providerSignerTitle?: string | null;
  providerSignedAt?: string | null;
  providerSignaturePath?: string | null;
  customerSignerName?: string | null;
  customerSignerTitle?: string | null;
  customerSignedAt?: string | null;
  customerSignaturePath?: string | null;
  signedContentHash?: string | null;
  customerSignIp?: string | null;
  customerSignUserAgent?: string | null;
}

type FontRole = keyof KoreanFontSet;

class PremiumPdfBuilder {
  private doc: PDFDocument;
  private fonts!: KoreanFontSet;
  private mono!: PDFFont;
  private page!: PDFPage;
  private y = 0;
  private pageIndex = 0;
  private pages: PDFPage[] = [];
  private pageHasContent: boolean[] = [];
  private logoImage: Awaited<ReturnType<PDFDocument["embedPng"]>> | null = null;
  private totalPages = 0;
  private readonly W = PDF_PAGE.width;
  private readonly H = PDF_PAGE.height;
  private readonly ML = PDF_PAGE.marginLeft;
  private readonly MR = PDF_PAGE.marginRight;
  private readonly MB = PDF_PAGE.marginBottom;
  private readonly contentW: number;
  private meta!: {
    type: "DRAFT" | "SIGNED";
    company: PdfCompanyInfo;
    contract: PdfContractInput;
    generatedAt: Date;
  };

  constructor(doc: PDFDocument) {
    this.doc = doc;
    this.contentW = this.W - this.ML - this.MR;
  }

  async init(type: "DRAFT" | "SIGNED", company: PdfCompanyInfo, contract: PdfContractInput) {
    this.meta = { type, company, contract, generatedAt: new Date() };
    this.fonts = await embedKoreanFonts(this.doc);
    this.mono = await this.doc.embedFont(StandardFonts.Courier);
    try {
      const bytes = await fs.readFile(LOGO_PATH);
      this.logoImage = await this.doc.embedPng(bytes);
    } catch (error) {
      console.error("[PDF Logo Load Failed]", error);
      this.logoImage = null;
    }
    this.addPage(true);
  }

  private font(role: FontRole): PDFFont {
    return this.fonts[role];
  }

  private bottomLimit(): number {
    return this.MB + PDF_PAGE.footerH;
  }

  private markContent(): void {
    this.pageHasContent[this.pageIndex - 1] = true;
  }

  private addPage(isCover = false): void {
    this.page = this.doc.addPage([this.W, this.H]);
    this.pages.push(this.page);
    this.pageIndex = this.pages.length;
    this.pageHasContent.push(false);
    this.y = this.H - PDF_PAGE.marginTop;

    if (this.meta.type === "DRAFT") {
      this.drawText("DRAFT · 서명 전 초안", this.ML, this.H - 18, PDF_TYPE.caption, "medium", PDF_THEME.draft);
    }

    if (isCover) {
      this.drawCoverPage();
    }
  }

  private ensureSpace(needed: number): void {
    if (this.y - needed <= this.bottomLimit()) {
      this.addPage(false);
    }
  }

  private drawText(
    text: string,
    x: number,
    yPos: number,
    size: number,
    role: FontRole = "regular",
    color: (typeof PDF_THEME)[keyof typeof PDF_THEME] = PDF_THEME.charcoal
  ): void {
    const safe = text.includes("\n") ? text : normalizeText(text);
    if (!safe) return;
    this.markContent();
    this.page.drawText(safe, {
      x,
      y: yPos,
      size,
      font: this.font(role),
      color: toRgb(color),
    });
  }

  private drawLine(text: string, x: number, size: number, role: FontRole = "regular", color: (typeof PDF_THEME)[keyof typeof PDF_THEME] = PDF_THEME.charcoal): void {
    this.drawText(text, x, this.y, size, role, color);
    this.y -= lineHeight(size, PDF_TYPE.lineHeight);
  }

  private drawLinesBlock(
    lines: string[],
    x: number,
    size: number,
    role: FontRole,
    color: (typeof PDF_THEME)[keyof typeof PDF_THEME],
    lhRatio: number
  ): void {
    for (const line of lines) {
      this.ensureSpace(lineHeight(size, lhRatio));
      this.drawText(line, x, this.y, size, role, color);
      this.y -= lineHeight(size, lhRatio);
    }
  }

  private statusLabel(): string {
    if (this.meta.type === "SIGNED") return "체결 완료";
    const s = this.meta.contract.status;
    return s && STATUS_LABELS[s] ? STATUS_LABELS[s] : "서명 전";
  }

  private titleLines(): [string, string] {
    if (this.meta.contract.contractType === "NAVER_PLACE_MONTHLY_GUARANTEE") {
      return ["네이버 플레이스", "월 순위보장 계약서"];
    }
    return ["네이버 플레이스", "월관리 계약서"];
  }

  private productLabel(): string {
    const ct = this.meta.contract;
    return ct.items[0]?.name || CONTRACT_TYPE_LABELS[ct.contractType || ""] || "네이버 플레이스 서비스";
  }

  private drawLogo(x: number, yTop: number, h = 26): void {
    if (!this.logoImage) return;
    const img = this.logoImage;
    const w = h * (img.width / img.height);
    this.page.drawImage(img, { x, y: yTop - h, width: w, height: h });
    this.markContent();
  }

  private drawCoverPage(): void {
    const top = this.H - PDF_PAGE.marginTop - (this.meta.type === "DRAFT" ? 6 : 0);
    this.drawLogo(this.ML, top);
    this.drawText(PROVIDER_COMPANY_PDF_HEADER_TAG, this.ML, top - 34, PDF_TYPE.brandTag, "medium", PDF_THEME.muted);

    const meta: { label: string; value: string }[] = [
      { label: "계약번호", value: this.meta.contract.contractNumber },
      { label: "작성일", value: formatDate(this.meta.generatedAt.toISOString()) },
      { label: "상태", value: this.statusLabel() },
    ];
    let ry = top - 2;
    for (const row of meta) {
      this.drawText(row.label, this.W - this.MR - 100, ry, PDF_TYPE.metaLabel, "regular", PDF_THEME.muted);
      const vw = textWidth(row.value, this.font("medium"), PDF_TYPE.metaValue);
      this.drawText(row.value, this.W - this.MR - vw, ry - 11, PDF_TYPE.metaValue, "medium", PDF_THEME.charcoal);
      ry -= 24;
    }

    this.y = top - 96;
    const [l1, l2] = this.titleLines();
    const l1w = textWidth(l1, this.font("bold"), PDF_TYPE.heroTitle);
    this.drawText(l1, (this.W - l1w) / 2, this.y, PDF_TYPE.heroTitle, "bold", PDF_THEME.charcoal);
    this.y -= lineHeight(PDF_TYPE.heroTitle, 1.15);
    const l2w = textWidth(l2, this.font("bold"), PDF_TYPE.heroLine2);
    this.drawText(l2, (this.W - l2w) / 2, this.y, PDF_TYPE.heroLine2, "bold", PDF_THEME.charcoal);
    this.y -= lineHeight(PDF_TYPE.heroLine2, 1.1);

    const introLines = wrapText(INTRO_LINE, this.contentW * 0.92, this.font("regular"), PDF_TYPE.body);
    for (const line of introLines) {
      const lw = textWidth(line, this.font("regular"), PDF_TYPE.body);
      this.drawText(line, (this.W - lw) / 2, this.y, PDF_TYPE.body, "regular", PDF_THEME.muted);
      this.y -= lineHeight(PDF_TYPE.body, PDF_TYPE.lineHeight);
    }
    this.y -= PDF_TYPE.sectionGap;
    drawRule(this.page, this.ML, this.W - this.MR, this.y, PDF_THEME.rule);
    this.y -= PDF_TYPE.sectionGap;
  }

  private drawSectionHeading(title: string): void {
    this.ensureSpace(lineHeight(PDF_TYPE.section, PDF_TYPE.lineHeight) + 8);
    this.y -= 4;
    this.drawLine(title, this.ML, PDF_TYPE.section, "semibold", PDF_THEME.charcoal);
    this.y -= 2;
  }

  drawSummaryPanel(): void {
    this.drawSectionHeading("계약 요약");
    const ct = this.meta.contract;
    const left = [
      { label: "고객사", value: ct.companyName },
      { label: "대표자", value: ct.representativeName || "-" },
    ];
    const amountStr = `${formatCurrency(ct.totalAmount)} (${ct.vatIncluded ? "VAT 포함" : "VAT 별도"})`;
    const right = [
      { label: "계약 상품", value: this.productLabel() },
      {
        label: "계약기간",
        value: `${formatDate(ct.startDate)} — ${formatDate(ct.endDate)}`,
      },
      { label: "계약금액", value: amountStr, accent: true },
    ];

    const pad = PDF_TYPE.panelPad;
    const colGap = 20;
    const colW = (this.contentW - pad * 2 - colGap) / 2;
    const rowH = PDF_TYPE.summaryRowH;
    const labelGap = PDF_TYPE.summaryLabelGap;
    const panelH = pad * 2 + rowH * 3;
    const leftX = this.ML + pad;
    const rightX = leftX + colW + colGap;

    this.ensureSpace(panelH + 6);
    const top = this.y;
    const bottom = top - panelH;
    drawPanel(this.page, this.ML, bottom, this.contentW, panelH);

    const drawField = (
      field: { label: string; value: string; accent?: boolean },
      colX: number,
      row: number
    ) => {
      const labelY = top - pad - row * rowH;
      this.drawText(field.label, colX, labelY, PDF_TYPE.panelLabel, "regular", PDF_THEME.muted);
      this.drawText(
        field.value,
        colX,
        labelY - labelGap,
        PDF_TYPE.panelValue,
        field.accent ? "semibold" : "medium",
        field.accent ? PDF_THEME.blue : PDF_THEME.charcoal
      );
    };

    left.forEach((field, i) => drawField(field, leftX, i));
    right.forEach((field, i) => drawField(field, rightX, i));
    this.y = bottom - PDF_TYPE.sectionGap;
  }

  private drawServiceListItem(x: number, y: number, label: string): void {
    drawBullet(this.page, x + 2, y + 3, 2);
    this.drawText(label, x + PDF_TYPE.serviceIconGap, y, PDF_TYPE.body, "regular", PDF_THEME.charcoal);
  }

  drawServiceConditions(): void {
    this.drawSectionHeading("서비스 조건");
    const ct = this.meta.contract;
    const isGuarantee = ct.contractType === "NAVER_PLACE_MONTHLY_GUARANTEE";
    const pad = PDF_TYPE.panelPad;
    const typeLabel = isGuarantee
      ? SERVICE_TYPE_LABEL.NAVER_PLACE_MONTHLY_GUARANTEE
      : SERVICE_TYPE_LABEL.NAVER_PLACE_MONTHLY_MANAGEMENT;
    const scopeTitle = isGuarantee ? "서비스 조건" : "서비스 범위";
    const items = isGuarantee ? [...GUARANTEE_SERVICES] : [...MANAGEMENT_SERVICES];

    const headerH = 38;
    const cols = isGuarantee ? 1 : 2;
    const colGap = PDF_TYPE.serviceColGap;
    const innerW = this.contentW - pad * 2;
    const colW = cols === 1 ? innerW : (innerW - colGap) / 2;
    const rows = cols === 1 ? items.length : Math.ceil(items.length / 2);
    const rowH = PDF_TYPE.serviceRowH;
    const listH = rows * rowH + 4;
    const panelH = pad * 2 + headerH + listH;

    this.ensureSpace(panelH + 4);
    const top = this.y;
    const bottom = top - panelH;
    drawPanel(this.page, this.ML, bottom, this.contentW, panelH);

    let ty = top - pad;
    this.drawText("서비스 유형", this.ML + pad, ty, PDF_TYPE.panelLabel, "regular", PDF_THEME.muted);
    ty -= 12;
    this.drawText(typeLabel, this.ML + pad, ty, PDF_TYPE.panelValue, "medium", PDF_THEME.charcoal);
    ty -= 16;
    this.drawText(scopeTitle, this.ML + pad, ty, PDF_TYPE.panelLabel, "regular", PDF_THEME.muted);
    ty -= 14;

    const col1X = this.ML + pad;
    const col2X = col1X + colW + colGap;

    items.forEach((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = col === 0 ? col1X : col2X;
      const iy = ty - row * rowH;
      this.drawServiceListItem(x, iy, item);
    });

    this.y = bottom - PDF_TYPE.sectionGap;
  }

  drawArticles(): void {
    const clauses = [...this.meta.contract.clauses]
      .filter((c) => !c.title.includes("특약") && c.title !== "서비스 내용")
      .sort((a, b) => a.sortOrder - b.sortOrder);
    if (clauses.length === 0) return;

    this.drawSectionHeading("계약 조항");

    const numCol = PDF_TYPE.articleNumCol;
    const bodyX = this.ML + numCol + PDF_TYPE.articleGap;
    const bodyW = this.contentW - numCol - PDF_TYPE.articleGap;

    clauses.forEach((clause, idx) => {
      const num = String(idx + 1).padStart(2, "0");
      const content = sanitizeClauseContent(clause.content);
      const bodyLines = wrapText(content, bodyW, this.font("regular"), PDF_TYPE.articleBody);
      const titleH = lineHeight(PDF_TYPE.articleTitle, 1.3);
      const bodyH = bodyLines.length * lineHeight(PDF_TYPE.articleBody, PDF_TYPE.articleLineHeight);
      const blockH = titleH + bodyH + 16;

      this.ensureSpace(Math.min(blockH, 100));

      const blockTop = this.y;
      this.drawText(num, this.ML, blockTop, PDF_TYPE.articleNum, "semibold", PDF_THEME.blue);
      this.drawText(clause.title, bodyX, blockTop, PDF_TYPE.articleTitle, "semibold", PDF_THEME.charcoal);
      this.y = blockTop - titleH - 3;

      this.drawLinesBlock(bodyLines, bodyX, PDF_TYPE.articleBody, "regular", PDF_THEME.charcoal, PDF_TYPE.articleLineHeight);
      this.y -= 8;
      drawRule(this.page, bodyX, this.W - this.MR, this.y, PDF_THEME.rule);
      this.y -= PDF_TYPE.sectionGap * 0.55;
    });
  }

  drawSpecialTerms(): void {
    this.drawSectionHeading("특약사항");
    const text = this.meta.contract.specialTerms?.trim();
    const pad = 10;

    if (!text) {
      const boxH = pad * 2 + lineHeight(PDF_TYPE.body, PDF_TYPE.lineHeight);
      this.ensureSpace(boxH + 4);
      const top = this.y;
      const bottom = top - boxH;
      drawPanel(this.page, this.ML, bottom, this.contentW, boxH, PDF_THEME.panelBg);
      this.drawText("별도 특약사항 없음", this.ML + pad, top - pad - PDF_TYPE.body, PDF_TYPE.body, "regular", PDF_THEME.muted);
      this.y = bottom - PDF_TYPE.sectionGap;
      return;
    }

    const bodyLines = wrapText(text, this.contentW - pad * 2, this.font("regular"), PDF_TYPE.body);
    const boxH = pad * 2 + bodyLines.length * lineHeight(PDF_TYPE.body, PDF_TYPE.lineHeight);
    this.ensureSpace(boxH + 4);
    const top = this.y;
    const bottom = top - boxH;
    drawPanel(this.page, this.ML, bottom, this.contentW, boxH);

    let ty = top - pad - PDF_TYPE.body;
    for (const line of bodyLines) {
      this.drawText(line, this.ML + pad, ty, PDF_TYPE.body, "regular", PDF_THEME.charcoal);
      ty -= lineHeight(PDF_TYPE.body, PDF_TYPE.lineHeight);
    }
    this.y = bottom - PDF_TYPE.sectionGap;
  }

  private async embedSignature(
    sigPath: string | null | undefined,
    frameX: number,
    frameBottom: number,
    frameW: number,
    frameH: number
  ): Promise<void> {
    if (!sigPath) return;
    try {
      const buf = await resolveSignatureBuffer(sigPath);
      if (!buf) return;
      const img = await this.doc.embedPng(buf);
      const pad = 6;
      const maxW = frameW - pad * 2;
      const maxH = frameH - pad * 2;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = frameX + (frameW - w) / 2;
      const y = frameBottom + (frameH - h) / 2;
      this.page.drawImage(img, { x, y, width: w, height: h });
      this.markContent();
    } catch (error) {
      console.error("[PDF Signature Embed Failed]", { sigPath, error });
    }
  }

  private async drawSignatureColumn(
    baseY: number,
    colX: number,
    data: {
      role: string;
      name: string;
      rep: string;
      signedAt?: string | null;
      sig?: string | null;
    }
  ): Promise<void> {
    const sigW = PDF_TYPE.sigImageW;
    const sigH = PDF_TYPE.sigImageH;
    const rowGap = 14;
    const labelGap = 12;

    let ty = baseY;
    this.drawText(data.role, colX, ty, PDF_TYPE.panelLabel, "regular", PDF_THEME.muted);
    ty -= rowGap;
    this.drawText(data.name, colX, ty, PDF_TYPE.panelValue, "medium", PDF_THEME.charcoal);
    ty -= rowGap;
    this.drawText("대표자", colX, ty, PDF_TYPE.panelLabel, "regular", PDF_THEME.muted);
    ty -= labelGap;
    this.drawText(data.rep || "-", colX, ty, PDF_TYPE.body, "medium", PDF_THEME.charcoal);
    ty -= rowGap;
    this.drawText("전자서명", colX, ty, PDF_TYPE.panelLabel, "regular", PDF_THEME.muted);
    ty -= 8;
    const frameBottom = ty - sigH;
    drawSigFrame(this.page, colX, frameBottom, sigW, sigH);
    await this.embedSignature(data.sig, colX, frameBottom, sigW, sigH);
    this.drawText(
      data.signedAt ? `서명일시 ${formatDateTime(data.signedAt)}` : "서명일시 —",
      colX,
      frameBottom - 10,
      PDF_TYPE.caption,
      "regular",
      PDF_THEME.muted
    );
  }

  async drawSignatureSection(): Promise<void> {
    const sigBlockH = 240;
    const recordH = this.meta.type === "SIGNED" ? 72 : 0;
    this.ensureSpace(sigBlockH + recordH + 8);

    this.drawLine("전자서명 완료", this.ML, PDF_TYPE.sigTitle, "bold", PDF_THEME.charcoal);
    this.y -= 2;
    const subLines = wrapText(
      "양 당사자는 계약 내용을 확인하고 아래와 같이 전자서명을 완료했습니다.",
      this.contentW,
      this.font("regular"),
      PDF_TYPE.sigSubtitle
    );
    this.drawLinesBlock(subLines, this.ML, PDF_TYPE.sigSubtitle, "regular", PDF_THEME.muted, PDF_TYPE.lineHeight);
    this.y -= 6;

    const co = this.meta.company;
    const ct = this.meta.contract;
    const gap = 20;
    const colW = (this.contentW - gap) / 2;
    const baseY = this.y;
    const sigH = PDF_TYPE.sigImageH;
    const colLeftX = this.ML;
    const colRightX = this.ML + colW + gap;

    const midX = this.ML + colW + gap / 2;
    this.page.drawLine({
      start: { x: midX, y: baseY - sigH - 72 },
      end: { x: midX, y: baseY - 4 },
      thickness: 0.5,
      color: toRgb(PDF_THEME.rule),
    });
    this.markContent();

    await this.drawSignatureColumn(baseY, colLeftX, {
      role: "회사",
      name: BRAND_NAME,
      rep: co.representativeName,
      signedAt: ct.providerSignedAt,
      sig: ct.providerSignaturePath,
    });
    await this.drawSignatureColumn(baseY, colRightX, {
      role: "고객",
      name: ct.companyName,
      rep: ct.representativeName,
      signedAt: ct.customerSignedAt,
      sig: ct.customerSignaturePath,
    });

    this.y = baseY - sigH - 88;
    drawRule(this.page, this.ML, this.W - this.MR, this.y, PDF_THEME.rule);
    this.y -= PDF_TYPE.sectionGap;

    if (this.meta.type === "SIGNED") {
      this.drawElectronicRecord();
    }
  }

  private drawElectronicRecord(): void {
    const ct = this.meta.contract;
    const completedAt = ct.customerSignedAt || ct.providerSignedAt;
    if (!completedAt && !ct.signedContentHash) return;

    this.drawSectionHeading("전자계약 기록");
    const rows: { label: string; value: string; mono?: boolean }[] = [];
    if (completedAt) rows.push({ label: "계약 체결일시", value: formatDateTime(completedAt) });
    rows.push({ label: "문서 식별번호", value: ct.contractNumber });
    if (ct.signedContentHash) rows.push({ label: "문서 SHA-256", value: ct.signedContentHash, mono: true });
    rows.push({ label: "계약 상태", value: this.statusLabel() });

    for (const row of rows) {
      this.ensureSpace(lineHeight(PDF_TYPE.recordValue, PDF_TYPE.lineHeight) + 2);
      this.drawText(row.label, this.ML, this.y, PDF_TYPE.recordLabel, "regular", PDF_THEME.muted);
      const valFont = row.mono ? this.mono : this.font("regular");
      const valLines = wrapText(row.value, this.contentW - 80, valFont, PDF_TYPE.recordValue);
      let vy = this.y;
      for (const vl of valLines) {
        if (row.mono) {
          this.markContent();
          this.page.drawText(vl, {
            x: this.ML + 80,
            y: vy,
            size: PDF_TYPE.recordValue,
            font: this.mono,
            color: toRgb(PDF_THEME.charcoal),
          });
        } else {
          this.drawText(vl, this.ML + 80, vy, PDF_TYPE.recordValue, "regular", PDF_THEME.charcoal);
        }
        vy -= lineHeight(PDF_TYPE.recordValue, PDF_TYPE.lineHeight);
      }
      this.y = vy - 2;
    }
  }

  private drawFooter(pageNum: number): void {
    const { contractNumber } = this.meta.contract;
    const fy = PDF_PAGE.footerY;
    drawRule(this.page, this.ML, this.W - this.MR, fy + 10, PDF_THEME.rule);
    this.drawText(FOOTER_LEFT, this.ML, fy, PDF_TYPE.caption, "regular", PDF_THEME.muted);
    const cnW = textWidth(contractNumber, this.font("regular"), PDF_TYPE.caption);
    this.drawText(contractNumber, (this.W - cnW) / 2, fy, PDF_TYPE.caption, "regular", PDF_THEME.muted);
    const pages = `${pageNum} / ${this.totalPages || this.pages.length}`;
    const pW = textWidth(pages, this.font("regular"), PDF_TYPE.caption);
    this.drawText(pages, this.W - this.MR - pW, fy, PDF_TYPE.caption, "regular", PDF_THEME.muted);
  }

  async finalize(): Promise<Buffer> {
    while (this.pages.length > 1 && !this.pageHasContent[this.pages.length - 1]) {
      this.doc.removePage(this.pages.length - 1);
      this.pages.pop();
      this.pageHasContent.pop();
    }
    this.totalPages = this.pages.length;
    for (let i = 0; i < this.pages.length; i++) {
      this.page = this.pages[i];
      this.drawFooter(i + 1);
    }
    return Buffer.from(await this.doc.save({ useObjectStreams: false }));
  }
}

export async function generateContractPdf(
  type: "DRAFT" | "SIGNED",
  company: PdfCompanyInfo,
  contract: PdfContractInput
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const builder = new PremiumPdfBuilder(doc);
  await builder.init(type, company, contract);
  builder.drawSummaryPanel();
  builder.drawServiceConditions();
  builder.drawArticles();
  builder.drawSpecialTerms();
  await builder.drawSignatureSection();
  return builder.finalize();
}

export function snapshotToPdfInput(
  snapshot: {
    contractNumber: string;
    companyName: string;
    representativeName: string;
    contactName: string | null;
    contactTitle: string | null;
    phone: string;
    email: string | null;
    businessNumber: string | null;
    address: string | null;
    startDate: string;
    endDate: string;
    totalAmount: number;
    vatIncluded: boolean;
    contractType: string;
    contractPurpose?: string | null;
    paymentTerms: string | null;
    specialTerms: string | null;
    items: PdfContractInput["items"];
    clauses?: PdfClause[];
    providerSignerName: string | null;
    providerSignerTitle: string | null;
    providerSignedAt: string | null;
  },
  extras?: Partial<PdfContractInput>
): PdfContractInput {
  return {
    contractNumber: snapshot.contractNumber,
    companyName: snapshot.companyName,
    representativeName: snapshot.representativeName,
    contactName: snapshot.contactName,
    contactTitle: snapshot.contactTitle,
    phone: snapshot.phone,
    email: snapshot.email,
    businessNumber: snapshot.businessNumber,
    address: snapshot.address,
    startDate: snapshot.startDate,
    endDate: snapshot.endDate,
    totalAmount: snapshot.totalAmount,
    vatIncluded: snapshot.vatIncluded,
    contractType: snapshot.contractType,
    contractPurpose: snapshot.contractPurpose,
    paymentTerms: snapshot.paymentTerms,
    specialTerms: snapshot.specialTerms,
    items: snapshot.items,
    clauses: snapshot.clauses || [],
    providerSignerName: snapshot.providerSignerName,
    providerSignerTitle: snapshot.providerSignerTitle,
    providerSignedAt: snapshot.providerSignedAt,
    ...extras,
  };
}
