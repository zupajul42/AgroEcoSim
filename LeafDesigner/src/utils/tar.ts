const BLOCK = 512;
const encoder = new TextEncoder();

export function fitBytes(name: string, maxBytes: number): string {
  let fitted = name;
  while (encoder.encode(fitted).length > maxBytes) fitted = fitted.slice(0, -1);
  return fitted;
}

export function tarArchive(files: { name: string; content: string }[]) {
  const mtime = Math.floor(Date.now() / 1000);
  const chunks: Uint8Array[] = [];
  for (const file of files) {
    const data = encoder.encode(file.content);
    const header = new Uint8Array(BLOCK);
    const put = (offset: number, value: string) => header.set(encoder.encode(value), offset);
    // Numbers are zero-padded octal, closed by a NUL.
    const octal = (offset: number, length: number, value: number) =>
      put(offset, value.toString(8).padStart(length - 1, "0") + "\0");

    put(0, fitBytes(file.name, 100));
    octal(100, 8, 0o644); // mode
    octal(108, 8, 0); // uid
    octal(116, 8, 0); // gid
    octal(124, 12, data.length);
    octal(136, 12, mtime);
    put(156, "0"); // regular file
    put(257, "ustar\0" + "00");
    // The checksum is the byte sum of the header with its own field read as spaces.
    header.fill(0x20, 148, 156);
    const checksum = header.reduce((sum, b) => sum + b, 0);
    put(148, checksum.toString(8).padStart(6, "0") + "\0 ");

    chunks.push(header, data, new Uint8Array((BLOCK - (data.length % BLOCK)) % BLOCK));
  }
  chunks.push(new Uint8Array(2 * BLOCK)); // end of archive

  const archive = new Uint8Array(chunks.reduce((size, c) => size + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    archive.set(c, offset);
    offset += c.length;
  }
  return archive;
}
