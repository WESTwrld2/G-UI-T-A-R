import type { Dispatch, SetStateAction } from "react";
import type { UserConstraints } from "@/logic/schema/userConstraints.zod";

export type FieldErrorGetter = (path: string) => string | null;

export type ConstraintSectionProps = {
  form: UserConstraints;
  setForm: Dispatch<SetStateAction<UserConstraints>>;
  fieldError: FieldErrorGetter;
};
