function normalizeOpt(opt: string | RuleCourseOpt): RuleCourseOpt {
  return typeof opt === "string" ? { code: opt } : opt;
}

export function hasCourse(
  transcript: UserTranscript,
  opt: string | RuleCourseOpt,
  ruleDefault?: Grade
): boolean {
  const o = normalizeOpt(opt);
  const min = o.minGrade ?? ruleDefault;  // per-course override beats rule default
  const c = transcript.courses.find(x => x.code === o.code);
  if (!c) return false;
  if (!min || !c.grade) return !!c;
  const order = ["F","D","C-","C","C+","B-","B","B+","A-","A","A+"];
  return order.indexOf(c.grade) >= order.indexOf(min);
}

export function ruleSatisfied(rule: RequirementRule, t: UserTranscript, creditOf:(code:string)=>number) {
  if (rule.type === "ALL_OF")
    return rule.options.every(opt => hasCourse(t, opt, rule.minGrade));

  if (rule.type === "N_OF")
    return rule.options.filter(opt => hasCourse(t, opt, rule.minGrade)).length >= (rule.n || 0);

  if (rule.type === "CREDITS") {
    const earned = t.courses
      .filter(c => rule.options.some(opt => {
        const o = normalizeOpt(opt);
        return matchesPattern(o.code, c.code) && hasCourse(t, o, rule.minGrade);
      }))
      .reduce((sum, c) => sum + creditOf(c.code), 0);
    return earned >= (rule.credits || 0);
  }
  return false;
}