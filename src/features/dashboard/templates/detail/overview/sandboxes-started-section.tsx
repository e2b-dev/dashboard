import { formatNumber } from '@/lib/utils/formatting'
import { OverviewSection } from './section'

interface SandboxesStartedSectionProps {
  spawnCount: number
}

export function SandboxesStartedSection({
  spawnCount,
}: SandboxesStartedSectionProps) {
  return (
    <OverviewSection label="Sandboxes started">
      <span className="prose-value-big font-mono uppercase text-fg whitespace-nowrap">
        {formatNumber(spawnCount)}
      </span>
    </OverviewSection>
  )
}
