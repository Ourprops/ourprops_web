/** JSON for a <script type="application/ld+json"> tag: "<" escaped, so text from Sanity can't close the tag early */
export function toScriptJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c")
}
