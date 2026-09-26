// react-hook-form rule: `required` alone accepts whitespace-only input, which the API rejects.
export function requiredText(message: string) {
  return {
    validate: (value: unknown) => (typeof value === "string" && value.trim() !== "") || message,
  };
}
