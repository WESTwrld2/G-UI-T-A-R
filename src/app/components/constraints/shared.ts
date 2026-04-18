import type { Dispatch, SetStateAction } from "react";
import type { ConstraintDraft } from "@/logic/schema/userConstraints.zod";

export type FieldErrorGetter = (path: string) => string | null;

export type ConstraintSectionProps = {
  form: ConstraintDraft;
  setForm: Dispatch<SetStateAction<ConstraintDraft>>;
  fieldError: FieldErrorGetter;
};
