/*
  transcriptParser.ts — SFU undergraduate transcript (text) → structured data
  Usage:
    import { parseSfuTranscript, ParsedTranscript } from "./transcriptParser";
    const parsed = parseSfuTranscript(pdfText);

  Notes:
  - Input must be the raw TEXT extracted from the PDF (e.g., pdfjs-dist getTextContent joined by \n).
  - Robust to wrapped course titles and repeated/withdrawal annotations.
  - Transfer credit rows are captured separately and NOT counted toward prereq logic by default.
*/

export type Grade =
  | "A+" | "A" | "A-"
  | "B+" | "B" | "B-"
  | "C+" | "C" | "C-"
  | "D" | "F" | "P" | "WD" | string;

export interface Person {
  name?: string;
  studentId?: string;
  printDate?: string; // e.g., 2025/10/18
}

export interface ProgramMilestone { date?: string; note: string }
export interface ProgramRecord {
  programName: string;               // e.g., "BSC Computing Science"
  milestones: ProgramMilestone[];    // dated notes under Program History
}

export interface TransferCreditRow {
  subject: string; number: string; title: string; grade: Grade; units: number;
}

export interface TermCourse {
  subject: string; number: string; title: string;
  attempted: number; earned: number; grade?: Grade; points?: number;
  flags?: string[]; // repeatedIncluded, repeatedExcluded, withdrawal, inProgress, passNoGpa
}

export interface TermRecord {
  term: string; // "2025 Spring"
  courses: TermCourse[];
  termGpa?: number;
}

export interface StandingRecord { effectiveDate: string; standing: string }

export interface CumulativeTotals { gpa?: number; attempted?: number; earned?: number; points?: number }

export interface ParsedTranscript {
  person: Person;
  programs: ProgramRecord[];
  transferCredits: TransferCreditRow[];
  terms: TermRecord[];
  standings: StandingRecord[];
  cumulative: CumulativeTotals;
}

/* ----------------------------- Regex helpers ----------------------------- */
const RX = {
  NAME: /Name:\s+(.+)\n/i,
  ID: /Student\s+ID:\s+(\d+)/i,
  PRINT: /Print\s+Date:\s+([0-9/\-]+)/i,
  PROGRAM_BLOCK: /Academic\s+Program\s+History([\s\S]*?)(?:Transfer\s+Credits|Beginning\s+of\s+Undergraduate\s+Record)/i,
  PROGRAM_LINE: /Program:\s+(.+)\n/g,
  PROGRAM_MILESTONE: /(\d{2}\/\d{2}\/\d{4}):\s+(.+)/g,

  TRANSFER_BLOCK: /Transfer\s+Credits([\s\S]*?)Beginning\s+of\s+Undergraduate\s+Record/i,
  // Transfer lines often look similar to regular courses; we parse with course patterns

  TERM_HEADER: /(\d{4})\s+(Fall|Spring|Summer)/,

  // Course first line: code and start of title (may wrap on following line[s])
  COURSE_CODE: /^([A-Z]{3,4})\s+(\d{3})\s+(.+)$/,
  // Units/Grade/Points line (attempted earned grade points); grade/points can be absent (in-progress)
  UGP: /^(\d+\.\d{3})\s+(\d+\.\d{3})(?:\s+([A-Z][+\-]?|WD|P))?(?:\s+(\d+\.\d{3}))?$/,

  REPEAT_INCLUDED: /Repeated:\s*-\s*Included\s+in\s+GPA/i,
  REPEAT_EXCLUDED: /Repeated:\s*Repeated\s*-\s*Excluded/i,
  WITHDRAW: /Withdrawal\s+Date:/i,

  TERM_GPA: /Term\s+GPA:\s*(\d+\.\d{3})/i,

  CUM_TOT_BLOCK: /Undergraduate\s+Career\s+Totals([\s\S]*)$/i,
  CUM_GPA: /Cumulative\s+GPA:\s*(\d+\.\d{3})/i,
  CUM_ATT: /Cumulative\s+Units\s+Attempted:\s*(\d+\.\d{3})/i,
  CUM_EARN: /Cumulative\s+Units\s+Earned:\s*(\d+\.\d{3})/i,
  CUM_PTS: /Cumulative\s+Points:\s*(\d+\.\d{3})/i,

  STANDING_LINE: /Academic\s+Standing\s+Effective\s+(\d{2}\/\d{2}\/\d{4}):\s+(.+)/g
} as const;

/* ----------------------------- Main function ----------------------------- */
export function parseSfuTranscript(text: string): ParsedTranscript {
  const clean = normalizeText(text);
  const lines = clean.split(/\n/);

  // Person
  const person: Person = {
    name: (clean.match(RX.NAME)?.[1] || undefined)?.trim(),
    studentId: (clean.match(RX.ID)?.[1] || undefined)?.trim(),
    printDate: (clean.match(RX.PRINT)?.[1] || undefined)?.trim(),
  };

  // Programs
  const programs: ProgramRecord[] = parsePrograms(clean);

  // Transfer credits
  const transferCredits: TransferCreditRow[] = parseTransferCredits(clean);

  // Terms & courses
  const terms: TermRecord[] = parseTerms(lines);

  // Standings
  const standings: StandingRecord[] = [];
  for (const m of clean.matchAll(RX.STANDING_LINE)) {
    standings.push({ effectiveDate: m[1], standing: m[2].trim() });
  }

  // Cumulative totals
  const cumulative: CumulativeTotals = {};
  const cumBlock = clean.match(RX.CUM_TOT_BLOCK)?.[1] || "";
  if (cumBlock) {
    cumulative.gpa = numOrUndef(cumBlock.match(RX.CUM_GPA)?.[1]);
    cumulative.attempted = numOrUndef(cumBlock.match(RX.CUM_ATT)?.[1]);
    cumulative.earned = numOrUndef(cumBlock.match(RX.CUM_EARN)?.[1]);
    cumulative.points = numOrUndef(cumBlock.match(RX.CUM_PTS)?.[1]);
  }

  return { person, programs, transferCredits, terms, standings, cumulative };
}

/* ----------------------------- Parsers ----------------------------- */
function parsePrograms(clean: string): ProgramRecord[] {
  const out: ProgramRecord[] = [];
  const block = clean.match(RX.PROGRAM_BLOCK)?.[1];
  if (!block) return out;

  // Multiple Program: lines possible
  const programs: string[] = [];
  for (const m of block.matchAll(RX.PROGRAM_LINE)) programs.push(m[1].trim());
  if (programs.length === 0) return out;

  // Milestones (dated lines)
  const milestones: ProgramMilestone[] = [];
  for (const m of block.matchAll(RX.PROGRAM_MILESTONE)) {
    milestones.push({ date: m[1], note: m[2].trim() });
  }

  // Associate the same milestones to each program (transcript lists them under the block)
  return programs.map(p => ({ programName: p, milestones }));
}

function parseTransferCredits(clean: string): TransferCreditRow[] {
  const out: TransferCreditRow[] = [];
  const block = clean.match(RX.TRANSFER_BLOCK)?.[1];
  if (!block) return out;
  const lines = block.split(/\n/).map(s => s.trim()).filter(Boolean);

  // Parse like courses: look for COURSE_CODE followed later by UGP
  for (let i = 0; i < lines.length; i++) {
    const codeMatch = lines[i].match(RX.COURSE_CODE);
    if (!codeMatch) continue;
    let title = codeMatch[3].trim();
    // Gather continuation lines until we see a numeric UGP
    let j = i + 1;
    for (; j < lines.length; j++) {
      if (RX.UGP.test(lines[j])) break;
      title += (" " + lines[j]);
    }
    const ugp = lines[j]?.match(RX.UGP);
    if (ugp) {
      const attempted = parseFloat(ugp[1]);
      const earned = parseFloat(ugp[2]);
      const grade = ugp[3] as Grade | undefined;
      out.push({ subject: codeMatch[1], number: codeMatch[2], title: squeeze(title), grade: grade || "", units: earned || attempted });
      i = j; // advance
    }
  }
  return out;
}

function parseTerms(lines: string[]): TermRecord[] {
  const out: TermRecord[] = [];
  for (let i = 0; i < lines.length; i++) {
    const header = lines[i].match(RX.TERM_HEADER);
    if (!header) continue;
    const term = `${header[1]} ${header[2]}`;
    const courses: TermCourse[] = [];
    let termGpa: number | undefined;

    // Collect until next term header or end
    let j = i + 1;
    while (j < lines.length && !RX.TERM_HEADER.test(lines[j])) {
      // Course block start
      const code = lines[j].match(RX.COURSE_CODE);
      if (!code) { j++; continue; }

      let title = code[3].trim();
      let k = j + 1;
      // Accumulate title continuation until UGP line
      for (; k < lines.length; k++) {
        const ugpTry = lines[k].match(RX.UGP);
        if (ugpTry) {
          // Found units/grade/points
          const attempted = parseFloat(ugpTry[1]);
          const earned = parseFloat(ugpTry[2]);
          const grade = (ugpTry[3] as Grade | undefined) || undefined;
          const points = ugpTry[4] ? parseFloat(ugpTry[4]) : undefined;
          const flags: string[] = [];
          if (!grade && earned === 0) flags.push("inProgress");
          if (grade === "P" && (!points || points === 0)) flags.push("passNoGpa");

          // Look ahead for repeat/withdraw annotations on the next 1–3 lines
          let peek = k + 1;
          for (let c = 0; c < 3 && peek < lines.length; c++, peek++) {
            const t = lines[peek];
            if (RX.REPEAT_INCLUDED.test(t)) flags.push("repeatedIncluded");
            if (RX.REPEAT_EXCLUDED.test(t)) flags.push("repeatedExcluded");
            if (RX.WITHDRAW.test(t)) flags.push("withdrawal");
            if (RX.COURSE_CODE.test(t) || RX.TERM_HEADER.test(t)) break; // next item
          }

          courses.push({
            subject: code[1], number: code[2], title: squeeze(title),
            attempted, earned, grade, points, flags: flags.length ? flags : undefined
          });

          j = k; // jump to UGP line index
          break;
        } else {
          // part of wrapped title
          if (!RX.COURSE_CODE.test(lines[k]) && !RX.TERM_HEADER.test(lines[k])) {
            title += (" " + lines[k].trim());
          }
        }
      }
      j++;

      // Scan within this term for Term GPA line occasionally appearing
      const maybeGpa = lines[j]?.match(RX.TERM_GPA);
      if (maybeGpa) termGpa = parseFloat(maybeGpa[1]);
    }

    out.push({ term, courses, termGpa });
    i = j - 1; // continue outer loop from end of term block
  }
  return out;
}

/* ----------------------------- Utilities ----------------------------- */
function normalizeText(t: string): string {
  // unify whitespace, remove trailing spaces, keep newlines
  return t
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/[ ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function squeeze(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function numOrUndef(x?: string): number | undefined {
  if (!x) return undefined; const v = parseFloat(x); return isNaN(v) ? undefined : v;
}

/* ----------------------------- Example: pdf.js text extraction (client) ----------------------------- */
// NOTE: Not executed here—just a reference for your React app if you want to parse on client.
// import * as pdfjsLib from "pdfjs-dist";
// async function extractPdfText(file: File): Promise<string> {
//   const array = await file.arrayBuffer();
//   const pdf = await pdfjsLib.getDocument({ data: array }).promise;
//   const texts: string[] = [];
//   for (let p = 1; p <= pdf.numPages; p++) {
//     const page = await pdf.getPage(p);
//     const content = await page.getTextContent();
//     const pageText = content.items.map((i: any) => i.str).join("\n");
//     texts.push(pageText);
//   }
//   return texts.join("\n\n");
// }
