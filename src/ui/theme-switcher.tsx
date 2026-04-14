'use client'

import { useTheme } from 'next-themes'
import useIsMounted from '@/lib/hooks/use-is-mounted'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import { IconButton } from '@/ui/primitives/icon-button'
import { MoonIcon, SunIcon, SystemIcon } from '@/ui/primitives/icons'

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
            <SunIcon key="light" />
          ) : (
            <MoonIcon key="dark" />
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
            <SunIcon className="text-fg-tertiary" />
            <span>Light</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            className="flex items-center gap-2"
            value="dark"
          >
            <MoonIcon className="text-fg-tertiary" />
            <span>Dark</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            className="flex items-center gap-2"
            value="system"
          >
            <SystemIcon className="text-fg-tertiary" />
            <span>System</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { ThemeSwitcher }
