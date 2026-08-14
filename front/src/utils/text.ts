const EMOJI_PATTERN =
  /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{203C}\u{2049}\u{3030}\u{303D}\u{3297}\u{3299}]/gu;

export function stripEmojis(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(EMOJI_PATTERN, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}