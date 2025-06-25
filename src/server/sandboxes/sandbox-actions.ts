'use server'

import { revalidatePath } from 'next/cache'

export async function revalidateSandboxDetailsLayout() {
  revalidatePath(`/dashboard/[teamIdOrSlug]/sandboxes/[sandboxId]`, 'layout')
}
