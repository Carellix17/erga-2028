/** Counts whitespace-separated words after removing simple Markdown and math syntax. */
export function countWords(text: string): number {
  const plainText = text
    // Math is not prose; support both inline and display-dollar delimiters.
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$[^$\r\n]*\$/g, " ")
    // Keep the visible label of Markdown links (and image alt text), not the URL.
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
    // Remove bare/autolink URLs as well.
    .replace(/<https?:\/\/[^>\s]+>/gi, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    // These characters are simple Markdown delimiters, not words.
    .replace(/[#*_`]/g, "");

  const trimmed = plainText.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
