import { AsciiIcon } from './ascii-icon'

const INACTIVE_LINES = [
  '                                ',
  '                                ',
  '                                ',
  '                                ',
  '            ---**---            ',
  '          -**------**-          ',
  '        -**- -      -**-        ',
  '        **  -**-      **        ',
  '        *-    ---     -*        ',
  '        **            **        ',
  '        -**-        -**-        ',
  '          --        --          ',
  '                                ',
  '                                ',
  '                                ',
  '                                ',
]

const ACTIVE_LINES = [
  '                                ',
  '                                ',
  '                                ',
  '                                ',
  '            ---**---            ',
  [
    { text: '          -**-----' },
    { className: 'text-accent-secondary-error-highlight', text: '-' },
    { text: '**-          ' },
  ],
  '        -**- -      -**-        ',
  [
    { text: '        ' },
    { className: 'text-accent-main-highlight', text: '**' },
    { text: '  -**-      **        ' },
  ],
  [
    { text: '        *-    -' },
    { className: 'text-accent-main-highlight', text: '-' },
    { text: '-     -*        ' },
  ],
  '        **            **        ',
  '        -**-        -**-        ',
  [
    { text: '          --        ' },
    { className: 'text-accent-main-highlight', text: '-' },
    { text: '-          ' },
  ],
  '                                ',
  '                                ',
  '                                ',
  '                                ',
]

interface LimitAsciiIconProps {
  active?: boolean
  className?: string
}

export const LimitAsciiIcon = ({
  active = false,
  className,
}: LimitAsciiIconProps) => (
  <AsciiIcon
    className={className}
    lines={active ? ACTIVE_LINES : INACTIVE_LINES}
  />
)
