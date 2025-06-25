'use server'

import { revalidatePath } from 'next/cache'

export async function revalidateSandboxDetailsLayout(
  teamIdOrSlug: string,
  sandboxId: string
) {
  revalidatePath(`/dashboard/${teamIdOrSlug}/sandboxes/${sandboxId}`, 'layout')
}
