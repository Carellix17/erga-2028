export type SubjectType = "scientifico" | "lingue" | "umanistico" | "generale";

/** Normalizes subject labels for dictionary and user-override matching. */
export function normalizeSubjectName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const FAMILY_TYPES: Readonly<Record<string, SubjectType>> = {
  scientifiche: "scientifico",
  informatica: "scientifico",
  lingue: "lingue",
  latino: "lingue",
  letteratura: "umanistico",
  storiche: "umanistico",
  filosofia: "umanistico",
  sociali: "umanistico",
  arte: "umanistico",
};

const SUBJECT_NAME_TYPES: Readonly<Record<string, SubjectType>> = {
  matematica: "scientifico",
  fisica: "scientifico",
  chimica: "scientifico",
  biologia: "scientifico",
  scienze: "scientifico",
  informatica: "scientifico",
  statistica: "scientifico",
  geometria: "scientifico",
  inglese: "lingue",
  francese: "lingue",
  spagnolo: "lingue",
  tedesco: "lingue",
  latino: "lingue",
  greco: "lingue",
  italiano: "umanistico",
  storia: "umanistico",
  filosofia: "umanistico",
  geografia: "umanistico",
  arte: "umanistico",
  diritto: "umanistico",
  economia: "umanistico",
  religione: "umanistico",
};

/** Resolve a planner speed category, giving personal overrides highest priority. */
export function subjectType(
  family: string | null,
  subjectName: string,
  userOverrides: Readonly<Record<string, SubjectType>> = {},
): SubjectType {
  const normalizedName = normalizeSubjectName(subjectName);

  for (const [overrideName, type] of Object.entries(userOverrides)) {
    if (normalizeSubjectName(overrideName) === normalizedName) return type;
  }

  const familyType = FAMILY_TYPES[normalizeSubjectName(family ?? "")];
  if (familyType) return familyType;

  for (const token of normalizedName.split(" ")) {
    const nameType = SUBJECT_NAME_TYPES[token];
    if (nameType) return nameType;
  }

  return "generale";
}
