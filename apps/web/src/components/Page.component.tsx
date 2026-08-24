import type { ReactNode } from "react"
import { SiteHeader } from "./SiteHeader.component.tsx"

export interface PageProps {
  children: ReactNode
  logIn?: boolean
}

export const Page = ({ children, logIn = true }: PageProps) => (
  <div className="flex min-h-svh flex-col bg-background">
    <SiteHeader logIn={logIn} />
    <main className="flex-1 pt-[26px] pb-24">{children}</main>
  </div>
)
