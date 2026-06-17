'use client'

import type { OryNodeInputProps } from '@ory/elements-react'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/ui/primitives/input-otp'

// OTP/recovery codes via shadcn input-otp with our styling. Mirrors Ory's
// DefaultPinCodeInput (length from node.attributes.maxlength), so we don't
// depend on the unstyled default that needs @ory/elements-react/theme/styles.css.
export function OryCodeInput({ node, inputProps }: OryNodeInputProps) {
  const { value, maxLength, ...rest } = inputProps
  const slots = maxLength ?? 6

  return (
    <InputOTP
      {...rest}
      value={value as string}
      maxLength={slots}
      data-testid={`ory/form/node/input/${node.attributes.name}`}
    >
      <InputOTPGroup className="flex w-full justify-stretch">
        {Array.from({ length: slots }, (_, index) => (
          <InputOTPSlot key={index} index={index} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}
