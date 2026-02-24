'use client'

import useIsMounted from '@/lib/hooks/use-is-mounted'
import { IconButton } from '@/ui/primitives/icon-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { Laptop, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

interface ThemeSwitcherProps {
  className?: string
}

const ThemeSwitcher = ({ className }: ThemeSwitcherProps) => {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const isMounted = useIsMounted()

  if (!isMounted) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={className} asChild>
        <IconButton>
          {resolvedTheme === 'light' ? (
            <Sun key="light" />
          ) : (
            <Moon key="dark" />
          )}
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[130px]" align="start">
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(e) => setTheme(e)}
        >
          <DropdownMenuRadioItem
            className="flex items-center gap-2"
            value="light"
          >
            <Sun className="text-fg-secondary size-3.5" />
            <span>Light</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            className="flex items-center gap-2"
            value="dark"
          >
            <Moon className="text-fg-secondary size-3.5" />
            <span>Dark</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            className="flex items-center gap-2"
            value="system"
          >
            <Laptop className="text-fg-secondary size-3.5" />
            <span>System</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { ThemeSwitcher }
