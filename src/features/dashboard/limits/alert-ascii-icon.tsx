import { AsciiIcon } from './ascii-icon'

const INACTIVE_LINES = [
  '                                ',
  '                                ',
  '                                ',
  '                                ',
  '           -********-           ',
  '          -*--     -*-          ',
  '         -*-        -*-         ',
  '         **-        -**         ',
  '        -*-          -*-        ',
  '        -**----------**-        ',
  '        ----**----**----        ',
  '            -******-            ',
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
  '           -********-           ',
  [
    { text: '          -*--     ' },
    { className: 'text-accent-main-highlight', text: '-' },
    { text: '*-          ' },
  ],
  '         -*-        -*-         ',
  [
    { text: '         *' },
    { className: 'text-accent-main-highlight', text: '*' },
    { text: '-        -' },
    { className: 'text-accent-main-highlight', text: '*' },
    { text: '*         ' },
  ],
  '        -*-          -*-        ',
  [
    { text: '        -*' },
    { className: 'text-accent-main-highlight', text: '*' },
    { text: '----------**-        ' },
  ],
  [
    { text: '        ----**' },
    { className: 'text-accent-main-highlight', text: '-' },
    { text: '---**----        ' },
  ],
  '            -******-            ',
  '                                ',
  '                                ',
  '                                ',
  '                                ',
]

interface AlertAsciiIconProps {
  active?: boolean
  className?: string
}

export const AlertAsciiIcon = ({
  active = false,
  className,
}: AlertAsciiIconProps) => (
  <AsciiIcon
    className={className}
    lines={active ? ACTIVE_LINES : INACTIVE_LINES}
  />
)
