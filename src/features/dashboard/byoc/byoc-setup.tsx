'use client'

import { useState } from 'react'
import type { ByocSetupConfig } from '@/core/modules/feature-flags/definitions'
import { Page } from '@/features/dashboard/layouts/page'
import { CodeBlock } from '@/ui/code-block'
import { CloudIcon, InfoIcon, TerminalIcon } from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/primitives/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs'
import { isValidGcpProjectId, renderByocSetupTemplate } from './terraform'

const PROJECT_PLACEHOLDER = 'YOUR_GCP_PROJECT_ID'

export function ByocSetup({ config }: { config: ByocSetupConfig }) {
  const [projectId, setProjectId] = useState('')
  const [region, setRegion] = useState(() => config.regions[0] ?? '')
  const trimmedProjectId = projectId.trim()
  const projectIdValid = isValidGcpProjectId(trimmedProjectId)
  const projectIdInvalid = trimmedProjectId.length > 0 && !projectIdValid
  const templateValues = {
    principal: config.principal,
    projectId: projectIdValid ? trimmedProjectId : PROJECT_PLACEHOLDER,
    region,
  }
  const templates = {
    gcloud: renderByocSetupTemplate({
      ...templateValues,
      template: config.templates.gcloud,
    }),
    terraform: renderByocSetupTemplate({
      ...templateValues,
      template: config.templates.terraform,
    }),
  }

  return (
    <Page className="max-w-[1100px]">
      <div className="flex flex-col gap-6">
        <header className="flex max-w-2xl flex-col gap-1">
          <div className="flex items-center gap-2">
            <CloudIcon className="text-accent-main-highlight size-5" />
            <h1 className="prose-title text-fg">Set up BYOC</h1>
          </div>
          <p className="prose-body text-fg-tertiary">
            Create the project-local identity E2B will use to deploy and operate
            your region. E2B receives impersonation access, never a service
            account key.
          </p>
        </header>

        <div className="border-stroke grid min-w-0 border-y lg:grid-cols-[minmax(260px,0.55fr)_minmax(0,1.45fr)]">
          <section className="border-stroke flex min-w-0 flex-col gap-5 px-3 py-5 md:px-5 lg:border-r">
            <div>
              <p className="prose-label text-fg-tertiary">Configuration</p>
              <h2 className="prose-headline-small text-fg mt-1">
                Choose the destination
              </h2>
            </div>

            <label className="flex flex-col gap-2" htmlFor="byoc-region">
              <span className="prose-body-highlight text-fg">Region</span>
              <Select onValueChange={setRegion} value={region}>
                <SelectTrigger id="byoc-region">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {config.regions.map((availableRegion) => (
                    <SelectItem key={availableRegion} value={availableRegion}>
                      {availableRegion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="flex flex-col gap-2" htmlFor="byoc-project-id">
              <span className="prose-body-highlight text-fg">
                Google Cloud project ID
              </span>
              <Input
                aria-describedby="byoc-project-id-help"
                aria-invalid={projectIdInvalid}
                autoComplete="off"
                className="font-mono"
                id="byoc-project-id"
                onChange={(event) => setProjectId(event.currentTarget.value)}
                placeholder="your-gcp-project-id"
                spellCheck={false}
                value={projectId}
              />
              <p
                className={
                  projectIdInvalid
                    ? 'prose-caption text-accent-error-highlight'
                    : 'prose-caption text-fg-tertiary'
                }
                id="byoc-project-id-help"
              >
                {projectIdInvalid
                  ? 'Enter a valid Google Cloud project ID.'
                  : 'The Terraform preview updates as you type.'}
              </p>
            </label>

            <div className="border-stroke bg-bg-1 flex min-w-0 gap-3 border p-3">
              <InfoIcon className="text-fg-tertiary mt-0.5 size-4 shrink-0" />
              <div className="min-w-0">
                <p className="prose-caption text-fg-tertiary">
                  E2B access principal
                </p>
                <p className="prose-caption text-fg mt-1 break-all font-mono">
                  {config.principal}
                </p>
              </div>
            </div>
          </section>

          <section className="bg-bg-1 flex min-w-0 flex-col gap-4 px-3 py-5 md:px-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div>
                <p className="prose-label text-fg-tertiary">Generated file</p>
                <h2 className="prose-headline-small text-fg mt-1">
                  Access setup
                </h2>
              </div>
              <p className="prose-caption text-fg-tertiary">
                Choose Terraform or gcloud
              </p>
            </div>
            <Tabs className="min-w-0 gap-3" defaultValue="terraform">
              <TabsList className="h-9 gap-5 border-b-0 bg-transparent p-0 max-md:px-0">
                <TabsTrigger layoutkey="byoc-setup-code-tabs" value="terraform">
                  Terraform
                </TabsTrigger>
                <TabsTrigger layoutkey="byoc-setup-code-tabs" value="gcloud">
                  gcloud
                </TabsTrigger>
              </TabsList>
              <TabsContent className="mt-0 min-w-0" value="terraform">
                <CodeBlock
                  className="min-w-0 max-w-full overflow-hidden"
                  icon={<TerminalIcon />}
                  lang="hcl"
                  title="main.tf"
                  viewportProps={{ className: 'max-h-[560px] max-w-full' }}
                >
                  {templates.terraform}
                </CodeBlock>
              </TabsContent>
              <TabsContent className="mt-0 min-w-0" value="gcloud">
                <CodeBlock
                  className="min-w-0 max-w-full overflow-hidden"
                  icon={<TerminalIcon />}
                  lang="bash"
                  title="Run in Cloud Shell"
                  viewportProps={{ className: 'max-h-[560px] max-w-full' }}
                >
                  {templates.gcloud}
                </CodeBlock>
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>
    </Page>
  )
}
