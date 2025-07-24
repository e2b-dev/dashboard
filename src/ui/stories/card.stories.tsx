import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../primitives/card'

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>System Status</CardTitle>
        <CardDescription>
          Current system metrics and performance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 font-mono text-sm">
          <div className="flex justify-between">
            <span>CPU Usage:</span>
            <span className="text-accent">48%</span>
          </div>
          <div className="flex justify-between">
            <span>Memory:</span>
            <span className="text-accent">3.2GB/8GB</span>
          </div>
          <div className="flex justify-between">
            <span>Uptime:</span>
            <span className="text-accent">24h 13m</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" size="sm">
          View Logs
        </Button>
        <Button size="sm">Refresh</Button>
      </CardFooter>
    </Card>
  ),
}

export const Terminal: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>[Terminal Output]</CardTitle>
        <CardDescription>Last execution results</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 font-mono text-sm">
          <div className="flex gap-2">
            <span className="text-fg-300">$</span>
            <span>npm install e2b</span>
          </div>
          <div className="text-accent">+ e2b@1.2.0</div>
          <div className="text-fg-300">added 42 packages in 3.2s</div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">
          Clear Output
        </Button>
      </CardFooter>
    </Card>
  ),
}

export const Error: Story = {
  render: () => (
    <Card className="border-error/50 shadow-error/50 w-[350px]">
      <CardHeader>
        <CardTitle className="text-error">[Error]</CardTitle>
        <CardDescription>Process terminated unexpectedly</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-error/90 space-y-2 font-mono text-sm">
          <div>Error: Connection refused</div>
          <div>at Server.listen (server.js:42:8)</div>
          <div>
            at process._tickCallback (internal/process/next_tick.js:68:7)
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" size="sm">
          View Stack
        </Button>
        <Button variant="error" size="sm">
          Restart
        </Button>
      </CardFooter>
    </Card>
  ),
}

export const Interactive: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>[Configuration]</CardTitle>
        <CardDescription>Update system parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="font-mono text-sm">Memory Limit</label>
          <input
            type="text"
            className="w-full border-2 border-dashed bg-transparent px-3 py-1 font-mono text-sm"
            defaultValue="8192MB"
          />
        </div>
        <div className="space-y-2">
          <label className="font-mono text-sm">Process Count</label>
          <input
            type="text"
            className="w-full border-2 border-dashed bg-transparent px-3 py-1 font-mono text-sm"
            defaultValue="4"
          />
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline">Reset</Button>
        <Button>Apply</Button>
      </CardFooter>
    </Card>
  ),
}
