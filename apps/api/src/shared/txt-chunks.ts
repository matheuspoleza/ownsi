export function joinTextChunks(data: string): string {
  const chunks = data.match(/"(?:[^"\\]|\\.)*"/g)
  if (!chunks) return data.replace(/^"|"$/g, "")

  return chunks.map((chunk) => chunk.slice(1, -1).replace(/\\(.)/g, "$1")).join("")
}
