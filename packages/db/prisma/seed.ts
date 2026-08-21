import { createPrisma } from "../src/index.ts"

const prisma = createPrisma(process.env.DATABASE_URL ?? "")

const seeds = [
  { domainAscii: "acme.com", state: "PROVED" as const },
  { domainAscii: "staging.acme.com", state: "PENDING" as const },
  { domainAscii: "old.acme.com", state: "ARCHIVED" as const },
]

for (const seed of seeds) {
  await prisma.claim.upsert({ where: { domainAscii: seed.domainAscii }, update: {}, create: seed })
}

console.log(`seed: ${seeds.length} claims`)
await prisma.$disconnect()
