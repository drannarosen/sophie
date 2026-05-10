import { z } from "zod";

export const Slug = z
  .string()
  .min(1)
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Slug must be lowercase kebab-case (letters, digits, hyphens; no leading/trailing/double hyphens)."
  );

export const NonEmptyString = z.string().min(1);

export const LangTag = z
  .string()
  .min(2)
  .regex(
    /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/,
    "Lang must be a BCP 47 tag, e.g. 'en', 'en-US', 'pt-BR'."
  );
