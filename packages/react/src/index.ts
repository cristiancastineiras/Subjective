import { useEffect } from 'react'
import { configure } from '@sub/core'

export * from '../generated/index'
export { configure }

/**
 * Route the links SUB components draw in their shadow root (button `href`, link, pagination, menu, breadcrumbs,
 * nav menu) through your router, e.g. React Router: `const navigate = useNavigate(); useSubNavigate(navigate)`.
 */
export function useSubNavigate(navigate: (href: string) => unknown): void {
  useEffect(() => {
    configure({ navigate: (href) => void navigate(href) })
    return () => configure({ navigate: undefined })
  }, [navigate])
}
