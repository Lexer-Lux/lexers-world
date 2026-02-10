const configuredTwitterUrl = process.env.NEXT_PUBLIC_LEXER_TWITTER_URL?.trim();

export const LEXER_TWITTER_URL =
  configuredTwitterUrl && /^https?:\/\//.test(configuredTwitterUrl)
    ? configuredTwitterUrl
    : "https://x.com/LexerLux";
