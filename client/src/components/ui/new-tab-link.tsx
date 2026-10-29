import type { ComponentProps } from "react"

/**
 * Link that always opens in a new tab, so leaving the editor never
 * throws away the current project
 */
function NewTabLink({ children, ...props }: Omit<ComponentProps<"a">, "target" | "rel">) {
  return (
    <a target="_blank" rel="noopener noreferrer" {...props}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

export { NewTabLink }
