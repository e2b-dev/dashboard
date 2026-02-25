import { SandboxInfo } from '@/types/api.types'
import { DetailsItem, DetailsRow } from '../../layouts/details-row'
import Metadata from './metadata'
import RanFor from './ran-for'
import RemainingTime from './remaining-time'
import { ResourceUsageClient } from './resource-usage-client'
import StartedAt from './started-at'
import Status from './status'
import TemplateId from './template-id'

interface SandboxDetailsHeaderProps {
  state: SandboxInfo['state']
}

export default async function SandboxDetailsHeader({
  state,
}: SandboxDetailsHeaderProps) {
  return (
    <header className="bg-bg relative z-30 w-full p-3 md:p-6">
      <DetailsRow>
        <DetailsItem label="status">
          <Status />
        </DetailsItem>
        <DetailsItem label="template">
          <TemplateId />
        </DetailsItem>
        <DetailsItem label="metadata">
          <Metadata />
        </DetailsItem>
        <DetailsItem label="timeout in">
          <RemainingTime />
        </DetailsItem>
        <DetailsItem label="created at">
          <StartedAt />
        </DetailsItem>
        <DetailsItem label={state === 'running' ? 'running for' : 'ran for'}>
          <RanFor />
        </DetailsItem>
        <DetailsItem label="CPU Usage">
          <ResourceUsageClient type="cpu" mode="usage" />
        </DetailsItem>
        <DetailsItem label="Memory Usage">
          <ResourceUsageClient type="mem" mode="usage" />
        </DetailsItem>
        <DetailsItem label="Disk Usage">
          <ResourceUsageClient type="disk" mode="usage" />
        </DetailsItem>
      </DetailsRow>
    </header>
  )
}
