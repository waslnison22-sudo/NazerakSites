/*
 * NaZerak public site configuration.
 *
 * Keep application URLs relative wherever possible so the same frontend works on
 * the public domain and in the local QA server without path-specific rewrites.
 */
window.NAZERAK_SITE_CONFIG = Object.freeze({
  plannedOrigin: "https://nazerak.ru",
  currentOrigin: window.location.origin,
  discordInvite: "https://discord.gg/2KvsYYDHN6"
});
