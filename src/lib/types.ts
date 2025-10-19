export type Grade = "A+"|"A"|"A-"|"B+"|"B"|"B-"|"C+"|"C"|"C-"|"D"|"F";

export interface TranscriptCourse {
  code: string;       // e.g., "CMPT 225"
  term?: string;      // e.g., "1247"
  grade?: Grade;      // optional for prereq thresholds
}

export interface UserTranscript {
  major: "CMPT";
  minor?: "BUS"|"MACM"|"ENSC"|string;
  courses: TranscriptCourse[];
}

export interface RequirementRule {
  id: string;
  title: string;
  type: "ALL_OF" | "N_OF" | "CREDITS";
  n?: number;
  credits?: number;
  // allow string or object
  options: (string | RuleCourseOpt)[];
  minGrade?: Grade;             // default for the rule
}

export interface RuleCourseOpt {
  code: string;                 // e.g., "MATH 154"
  minGrade?: Grade;             // override the rule's minGrade
  requiresPermission?: boolean; // show a UI badge / advisory
  note?: string;                // optional UI note
}

export interface DegreeTemplate {
  program: string;                // "SFU CMPT Major"
  catalogYear: string;            // "2025"
  rules: RequirementRule[];
}

export interface PrereqEdge {
  from: string; // prerequisite course code
  to: string;   // target course code
  minGrade?: Grade;
}

export interface PrereqGraph {
  nodes: string[]; // course codes
  edges: PrereqEdge[];
}

export interface Section {
  course: string;    // "CMPT 225"
  sectionId: string; // "D100"
  days: ("M"|"T"|"W"|"Th"|"F")[];
  start: string;     // "09:30"
  end: string;       // "10:20"
  instructor?: string;
  seats?: { total:number; taken:number };
  term: string;      // e.g., "1251"
}