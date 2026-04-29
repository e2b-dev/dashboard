import type { MouseEvent } from 'react'

const INTERACTIVE_ELEMENT_SELECTOR =
  'button, input, textarea, select, a, [role="button"], [data-no-input-focus]'

// Focuses the first editable input in a block, e.g. block click -> input focused, button click -> unchanged.
const focusBlockInputOnMouseDown = (event: MouseEvent<HTMLElement>) => {
  if (!(event.target instanceof Element)) return
  if (event.target.closest(INTERACTIVE_ELEMENT_SELECTOR)) return

  const input = event.currentTarget.querySelector('input')
  if (!(input instanceof HTMLInputElement)) return
  if (input.disabled || input.readOnly) return

  event.preventDefault()
  input.focus()

  const cursorPosition = input.value.length
  input.setSelectionRange(cursorPosition, cursorPosition)
}

export { focusBlockInputOnMouseDown }
