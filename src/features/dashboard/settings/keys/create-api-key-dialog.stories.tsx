import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, within } from 'storybook/test'
import { Button } from '@/ui/primitives/button'
import { AddIcon } from '@/ui/primitives/icons'
import CreateApiKeyDialog from './create-api-key-dialog'

const meta = {
  title: 'Dashboard/Settings/Keys/CreateApiKeyDialog',
  component: CreateApiKeyDialog,
  parameters: {
    docs: {
      description: {
        component:
          'Modal for creating a new API key. Each story drives the dialog into a different state via the mocked `useAction` hook.',
      },
    },
  },
  args: {
    children: (
      <Button>
        <AddIcon className="size-4" /> CREATE KEY
      </Button>
    ),
  },
} satisfies Meta<typeof CreateApiKeyDialog>

export default meta

type Story = StoryObj<typeof meta>

const openDialog = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement)
  await userEvent.click(await canvas.findByRole('button', { name: /create key/i }))
  return within(document.body)
}

export const EmptyForm: Story = {
  parameters: { actionMode: 'success' },
  play: async ({ canvasElement }) => {
    const screen = await openDialog(canvasElement)
    await expect(await screen.findByText('New API Key')).toBeInTheDocument()
  },
}

export const ValidationError: Story = {
  parameters: { actionMode: 'success' },
  play: async ({ canvasElement }) => {
    const screen = await openDialog(canvasElement)
    const submit = await screen.findByRole('button', { name: /^create key$/i })
    await userEvent.click(submit)
    await expect(await screen.findByText(/name cannot be empty/i)).toBeInTheDocument()
  },
}

export const Submitting: Story = {
  parameters: { actionMode: 'pending' },
  play: async ({ canvasElement }) => {
    const screen = await openDialog(canvasElement)
    const input = await screen.findByLabelText('Name')
    await userEvent.type(input, 'staging-key')
    await userEvent.click(await screen.findByRole('button', { name: /^create key$/i }))
    await expect(await screen.findByText(/creating key/i)).toBeInTheDocument()
  },
}

export const ServerError: Story = {
  parameters: { actionMode: 'server-error' },
  play: async ({ canvasElement }) => {
    const screen = await openDialog(canvasElement)
    const input = await screen.findByLabelText('Name')
    await userEvent.type(input, 'staging-key')
    await userEvent.click(await screen.findByRole('button', { name: /^create key$/i }))
  },
}

export const SuccessWithRevealedKey: Story = {
  parameters: { actionMode: 'success' },
  play: async ({ canvasElement }) => {
    const screen = await openDialog(canvasElement)
    const input = await screen.findByLabelText('Name')
    await userEvent.type(input, 'production-key')
    await userEvent.click(await screen.findByRole('button', { name: /^create key$/i }))
    await expect(await screen.findByText('Your API Key')).toBeInTheDocument()
  },
}
