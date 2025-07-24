import type { Meta, StoryObj } from '@storybook/react'
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '../primitives/toast'

const meta = {
  title: 'UI/Toast',
  component: Toast,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <ToastProvider>
        <div className="relative">
          <Story />
          <ToastViewport />
        </div>
      </ToastProvider>
    ),
  ],
} satisfies Meta<typeof Toast>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Toast>
      <div className="grid gap-1">
        <ToastTitle>Scheduled: Catch up</ToastTitle>
        <ToastDescription>
          Friday, February 10, 2024 at 5:57 PM
        </ToastDescription>
      </div>
      <ToastClose />
    </Toast>
  ),
}

export const Destructive: Story = {
  render: () => (
    <Toast variant="error">
      <div className="grid gap-1">
        <ToastTitle>Error</ToastTitle>
        <ToastDescription>Something went wrong.</ToastDescription>
      </div>
      <ToastClose />
    </Toast>
  ),
}

export const Success: Story = {
  render: () => (
    <Toast variant="success">
      <div className="grid gap-1">
        <ToastTitle>Success!</ToastTitle>
        <ToastDescription>Your changes have been saved.</ToastDescription>
      </div>
      <ToastClose />
    </Toast>
  ),
}

export const WithAction: Story = {
  render: () => (
    <Toast>
      <div className="grid gap-1">
        <ToastTitle>Undo Changes?</ToastTitle>
        <ToastDescription>Your changes will be reverted.</ToastDescription>
      </div>
      <ToastAction altText="Undo changes">Undo</ToastAction>
      <ToastClose />
    </Toast>
  ),
}
