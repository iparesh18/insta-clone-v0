/**
 * utils/mentionParser.js
 *
 * Utility for parsing @mentions from text
 * Extracts username mentions and provides HTML parsing
 */

/**
 * Parse @mentions from text
 * Matches @username patterns where username follows Instagram rules:
 * - 1-30 characters
 * - Letters, numbers, periods, underscores, hyphens
 * - Cannot start with a number
 *
 * @param {string} text - The text to parse for mentions
 * @returns {string[]} Array of mentioned usernames (without @)
 */
const parseMentions = (text) => {
  if (!text || typeof text !== "string") return [];

  // Regex for valid Instagram usernames: @username pattern
  // Username: 1-30 chars, letters/numbers/periods/underscores/hyphens, cannot start with number
  const mentionRegex = /@([a-zA-Z_][a-zA-Z0-9._\-]{0,29})/g;

  const matches = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // match[1] is the username without @
    const username = match[1];
    // Avoid duplicates
    if (!matches.includes(username)) {
      matches.push(username);
    }
  }

  return matches;
};

/**
 * Parse @mentions from text and replace with clickable links
 * Used for rendering in HTML/UI
 *
 * @param {string} text - The text to parse
 * @param {Function} urlBuilder - Optional function to build mention URLs
 * @returns {string} HTML string with mention links
 */
const parseAndLinkMentions = (text, urlBuilder = (username) => `/profile/${username}`) => {
  if (!text || typeof text !== "string") return text;

  const mentionRegex = /@([a-zA-Z_][a-zA-Z0-9._\-]{0,29})/g;

  return text.replace(mentionRegex, (match, username) => {
    const url = urlBuilder(username);
    return `<a href="${url}" class="mention-link" data-username="${username}">${match}</a>`;
  });
};

/**
 * Extract plain text mentions (just the usernames)
 * Useful for database queries or notifications
 *
 * @param {string} text - The text to parse
 * @returns {string[]} Array of mentioned usernames in lowercase
 */
const extractMentionedUsernames = (text) => {
  return parseMentions(text).map((username) => username.toLowerCase());
};

/**
 * Check if a specific username is mentioned in text
 *
 * @param {string} text - The text to check
 * @param {string} username - The username to look for (case-insensitive)
 * @returns {boolean}
 */
const isMentioned = (text, username) => {
  const mentions = extractMentionedUsernames(text);
  return mentions.includes(username.toLowerCase());
};

/**
 * Replace mentions in text while preserving original text structure
 * (Different from parseAndLinkMentions - this just replaces the text)
 *
 * @param {string} text - The text to process
 * @param {Function} replacer - Function that receives username and returns replacement text
 * @returns {string}
 */
const replaceMentions = (text, replacer) => {
  if (!text || typeof text !== "string") return text;

  const mentionRegex = /@([a-zA-Z_][a-zA-Z0-9._\-]{0,29})/g;

  return text.replace(mentionRegex, (match, username) => {
    return replacer(username, match);
  });
};

module.exports = {
  parseMentions,
  parseAndLinkMentions,
  extractMentionedUsernames,
  isMentioned,
  replaceMentions,
};
