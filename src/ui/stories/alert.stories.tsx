import type { Meta, StoryObj } from '@storybook/react'
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  FlaskConicalIcon,
  InfoIcon,
  TerminalIcon,
  ZapIcon,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '../primitives/alert'

const meta = {
  title: 'UI/Alert',
  component: Alert,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Alert>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Alert>
      <TerminalIcon className="h-4 w-4" />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>
        You can add components and dependencies to your app using the cli.
      </AlertDescription>
    </Alert>
  ),
}

export const Contrast1: Story = {
  render: () => (
    <Alert variant="contrast1">
      <ZapIcon className="h-4 w-4" />
      <AlertTitle>Quick Tip</AlertTitle>
      <AlertDescription>
        Press <code>Cmd + K</code> to open the command palette at any time.
      </AlertDescription>
    </Alert>
  ),
}

export const Contrast2: Story = {
  render: () => (
    <Alert variant="contrast2">
      <FlaskConicalIcon className="h-4 w-4" />
      <AlertTitle>Experimental Feature</AlertTitle>
      <AlertDescription>
        This feature is in beta. Please report any issues you encounter.
      </AlertDescription>
    </Alert>
  ),
}

export const Error: Story = {
  render: () => (
    <Alert variant="error">
      <AlertCircleIcon className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        Your session has expired. Please log in again.
      </AlertDescription>
    </Alert>
  ),
}

export const WithoutTitle: Story = {
  render: () => (
    <Alert>
      <InfoIcon className="h-4 w-4" />
      <AlertDescription>
        A simple alert message without a title.
      </AlertDescription>
    </Alert>
  ),
}

export const WithoutIcon: Story = {
  render: () => (
    <Alert>
      <AlertTitle>Note</AlertTitle>
      <AlertDescription>
        An alert without an icon, showing just the title and description.
      </AlertDescription>
    </Alert>
  ),
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Alert>
        <TerminalIcon className="h-4 w-4" />
        <AlertTitle>Default Alert</AlertTitle>
        <AlertDescription>Default alert variant</AlertDescription>
      </Alert>

      <Alert variant="contrast1">
        <ZapIcon className="h-4 w-4" />
        <AlertTitle>Contrast 1</AlertTitle>
        <AlertDescription>First contrast variant</AlertDescription>
      </Alert>

      <Alert variant="contrast2">
        <FlaskConicalIcon className="h-4 w-4" />
        <AlertTitle>Contrast 2</AlertTitle>
        <AlertDescription>Second contrast variant</AlertDescription>
      </Alert>

      <Alert variant="error">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertTitle>Error Alert</AlertTitle>
        <AlertDescription>Error variant for warnings</AlertDescription>
      </Alert>
    </div>
  ),
}

export const WithCustomStyles: Story = {
  render: () => (
    <Alert className="border-l-[6px] bg-purple-50">
      <AlertTriangleIcon className="h-4 w-4 text-purple-500" />
      <AlertTitle className="text-purple-900">Custom Styled Alert</AlertTitle>
      <AlertDescription className="text-purple-800">
        This alert uses custom colors and styling through className props.
      </AlertDescription>
    </Alert>
  ),
}
