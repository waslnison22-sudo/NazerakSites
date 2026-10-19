# NaZerak Launcher resources

This directory contains the manifest read by NaZerak Launcher:

`https://nazerak.ru/launcher/manifest.json`

The committed manifest is intentionally empty until the project approves and publishes an actual client resource pack. Don't upload Minecraft's proprietary game JARs, runtime libraries, a complete game client, server-side plugins, passwords, tokens, or private files here.

## Add an approved resource pack

1. Upload a resource-pack `.zip` to `launcher/resources/`.
2. Calculate the exact file size in bytes and a SHA-256 digest of the final file.
3. Add an entry to `manifest.json` using:
   - `path`: `resourcepacks/Name.zip`
   - `url`: `https://nazerak.ru/launcher/resources/Name.zip`
   - `size`: exact byte count
   - `sha256`: 64-character lowercase hexadecimal SHA-256 digest
4. Commit and deploy the archive and manifest together.
5. Verify the deployed HTTPS URL, size, and hash before announcing the update.

The launcher validates the trusted HTTPS host, rejects redirects and path traversal, caps files at 100 MiB each and 512 MiB total, verifies SHA-256, and atomically replaces only managed resource-pack files. It doesn't execute arbitrary JARs. Server-side plugins remain on the Minecraft server; client mods require a separately approved loader and modpack.
