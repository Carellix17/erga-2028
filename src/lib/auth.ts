import { z } from "zod";

// Schema di validazione della password (minimo 8 caratteri)
export const passwordSchema = z
  .string()
  .min(8, "La password deve avere almeno 8 caratteri")
  .max(64, "La password deve avere massimo 64 caratteri");
