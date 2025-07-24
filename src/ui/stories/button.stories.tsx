import type { Meta, StoryObj } from '@storybook/react'
import { Settings2, Terminal, Trash2 } from 'lucide-react'
import { Button } from '../primitives/button'

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Execute',
  },
}

export const Accent: Story = {
  args: {
    children: 'Deploy',
    variant: 'accent',
  },
}

export const Error: Story = {
  args: {
    children: 'Delete',
    variant: 'error',
  },
}

export const Outline: Story = {
  args: {
    children: 'Cancel',
    variant: 'outline',
  },
}

export const Link: Story = {
  args: {
    children: 'View Docs',
    variant: 'link',
  },
}

export const WithIcon: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button>
        <Terminal className="mr-2 h-4 w-4" />
        Run
      </Button>
      <Button variant="error">
        <Trash2 className="mr-2 h-4 w-4" />
        Remove
      </Button>
    </div>
  ),
}

export const IconOnly: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button size="icon" variant="outline">
        <Settings2 className="h-4 w-4" />
      </Button>
      <Button size="iconSm" variant="outline">
        <Terminal className="h-4 w-4" />
      </Button>
    </div>
  ),
}

export const Loading: Story = {
  render: () => <Button loading>Starting</Button>,
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button>Default</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
}
