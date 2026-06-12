'use client'

import {
  type KeyboardEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { IconButton } from '@/ui/primitives/icon-button'
import {
  CopyIcon,
  KeyIcon,
  RefreshIcon,
  RemoveIcon,
  TerminalIcon,
} from '@/ui/primitives/icons'
import { Input } from '@/ui/primitives/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/ui/primitives/popover'
import {
  addTerminalEnvVarHistory,
  readTerminalEnvVarHistory,
  removeTerminalEnvVarHistory,
  type TerminalEnvVarHistorySnapshot,
} from './env-var-history'
import {
  mergeTerminalEnvVarNames,
  normalizeTerminalEnvVarName,
} from './env-vars'

interface TerminalPanelProps {
  predefinedEnvVarNames: string[]
  sandboxId?: string
  envVarTemplate?: string
  template?: string
  restartDisabled: boolean
  restartLabel: string
  terminalContainerRef: RefObject<HTMLDivElement | null>
  onFocusTerminal: () => void
  onCopyTerminalText: () => void
  onRestartTerminal: () => void
  onSetEnvVar: (envVar: { name: string; value: string }) => Promise<void>
}

export default function TerminalPanel({
  predefinedEnvVarNames,
  sandboxId,
  envVarTemplate,
  template,
  restartDisabled,
  restartLabel,
  terminalContainerRef,
  onFocusTerminal,
  onCopyTerminalText,
  onRestartTerminal,
  onSetEnvVar,
}: TerminalPanelProps) {
  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border bg-bg-1">
      <header className="h-10 w-full border-b">
        <TerminalPanelHeader
          predefinedEnvVarNames={predefinedEnvVarNames}
          sandboxId={sandboxId}
          envVarTemplate={envVarTemplate}
          template={template}
          restartDisabled={restartDisabled}
          restartLabel={restartLabel}
          onCopyTerminalText={onCopyTerminalText}
          onRestartTerminal={onRestartTerminal}
          onSetEnvVar={onSetEnvVar}
        />
      </header>
      <div
        ref={terminalContainerRef}
        role="application"
        aria-label="Terminal"
        className="min-h-0 flex-1 cursor-text overflow-hidden bg-black p-3"
        onMouseDown={onFocusTerminal}
      />
    </section>
  )
}

function TerminalPanelHeader({
  predefinedEnvVarNames,
  sandboxId,
  envVarTemplate,
  template,
  restartDisabled,
  restartLabel,
  onCopyTerminalText,
  onRestartTerminal,
  onSetEnvVar,
}: Pick<
  TerminalPanelProps,
  | 'sandboxId'
  | 'envVarTemplate'
  | 'template'
  | 'predefinedEnvVarNames'
  | 'restartDisabled'
  | 'restartLabel'
  | 'onCopyTerminalText'
  | 'onRestartTerminal'
  | 'onSetEnvVar'
>) {
  return (
    <div className="flex h-full items-center justify-between px-3">
      <div className="flex min-w-0 items-center gap-2">
        <TerminalIcon className="text-icon-tertiary size-4" />
        <span className="prose-label-highlight shrink-0 uppercase">
          Terminal
        </span>
        {template ? (
          <span className="text-fg-tertiary shrink-0 font-mono text-xs">
            {template}
          </span>
        ) : null}
        {sandboxId ? (
          <span className="text-fg-tertiary truncate font-mono text-xs">
            {sandboxId}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        <TerminalEnvVarsPopover
          predefinedNames={predefinedEnvVarNames}
          sandboxId={sandboxId}
          template={envVarTemplate}
          onSetEnvVar={onSetEnvVar}
        />
        <IconButton
          type="button"
          variant="tertiary"
          className="size-7"
          aria-label="Copy terminal output"
          title="Copy terminal output"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onCopyTerminalText}
        >
          <CopyIcon />
        </IconButton>
        <IconButton
          type="button"
          variant="tertiary"
          className="size-7"
          aria-label={restartLabel}
          title={restartLabel}
          disabled={restartDisabled}
          onClick={onRestartTerminal}
        >
          <RefreshIcon />
        </IconButton>
      </div>
    </div>
  )
}

function TerminalEnvVarsPopover({
  onSetEnvVar,
  predefinedNames,
  sandboxId,
  template,
}: {
  onSetEnvVar: (envVar: { name: string; value: string }) => Promise<void>
  predefinedNames: string[]
  sandboxId?: string
  template?: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<TerminalEnvVarHistorySnapshot>({
    sandboxNames: [],
    templateNames: [],
  })
  const [isSetting, setIsSetting] = useState(false)
  const [sessionValues, setSessionValues] = useState<Record<string, string>>({})
  const [shownValues, setShownValues] = useState<Record<string, boolean>>({})

  const refreshHistory = useCallback(() => {
    setHistory(readTerminalEnvVarHistory({ sandboxId, template }))
  }, [sandboxId, template])

  useEffect(() => {
    refreshHistory()
  }, [refreshHistory])

  const allKeys = useMemo(
    () =>
      mergeTerminalEnvVarNames(
        predefinedNames,
        history.sandboxNames,
        history.templateNames,
        Object.keys(sessionValues)
      ),
    [
      history.sandboxNames,
      history.templateNames,
      predefinedNames,
      sessionValues,
    ]
  )

  const handleSetValue = async ({
    name,
    value,
  }: {
    name: string
    value: string
  }) => {
    setError(null)
    setIsSetting(true)
    try {
      await onSetEnvVar({ name, value })
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Could not set environment variable.'
      )
      setIsSetting(false)
      return
    }
    setIsSetting(false)

    const addedName = addTerminalEnvVarHistory({
      name,
      sandboxId,
      template,
    })
    if (!addedName) return

    setSessionValues((values) => ({
      ...values,
      [addedName]: value,
    }))
    setShownValues((values) => ({
      ...values,
      [addedName]: false,
    }))
    refreshHistory()
  }

  const handleRemoveSandboxName = (name: string) => {
    removeTerminalEnvVarHistory({ name, sandboxId })
    refreshHistory()
  }

  const handleRemoveTemplateName = (name: string) => {
    removeTerminalEnvVarHistory({ name, template })
    refreshHistory()
  }

  const toggleShownValue = (name: string) => {
    setShownValues((values) => ({
      ...values,
      [name]: !values[name],
    }))
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton
          type="button"
          variant="tertiary"
          className="size-7"
          aria-label="Terminal environment variables"
          title="Terminal environment variables"
          onMouseDown={(event) => event.preventDefault()}
        >
          <KeyIcon />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <KeyIcon className="size-4 text-icon-tertiary" />
              <span className="prose-label-highlight uppercase">
                Environment variables
              </span>
            </div>
            <Badge variant="code">{allKeys.length}</Badge>
          </div>

          {error ? (
            <p className="text-fg-tertiary text-xs" role="alert">
              {error}
            </p>
          ) : null}

          <EnvVarTable
            names={allKeys}
            predefinedNames={predefinedNames}
            sandboxNames={history.sandboxNames}
            sessionValues={sessionValues}
            shownValues={shownValues}
            templateNames={history.templateNames}
            isSetting={isSetting}
            sandboxId={sandboxId}
            onRemoveSandboxName={handleRemoveSandboxName}
            onRemoveTemplateName={handleRemoveTemplateName}
            onSetValue={handleSetValue}
            onToggleShownValue={toggleShownValue}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function EnvVarTable({
  names,
  predefinedNames,
  sandboxNames,
  sessionValues,
  shownValues,
  templateNames,
  isSetting,
  sandboxId,
  onRemoveSandboxName,
  onRemoveTemplateName,
  onSetValue,
  onToggleShownValue,
}: {
  names: string[]
  predefinedNames: string[]
  sandboxNames: string[]
  sessionValues: Record<string, string>
  shownValues: Record<string, boolean>
  templateNames: string[]
  isSetting: boolean
  sandboxId?: string
  onRemoveSandboxName: (name: string) => void
  onRemoveTemplateName: (name: string) => void
  onSetValue: (envVar: { name: string; value: string }) => Promise<void>
  onToggleShownValue: (name: string) => void
}) {
  const normalizedNames = useMemo(
    () => mergeTerminalEnvVarNames(names),
    [names]
  )

  return (
    <div className="overflow-hidden border">
      <table className="w-full table-fixed border-collapse text-xs">
        <thead>
          <tr className="border-b text-left">
            <th className="text-fg-tertiary px-2 py-1.5 font-medium uppercase">
              Key
            </th>
            <th className="text-fg-tertiary px-2 py-1.5 font-medium uppercase">
              Value
            </th>
            <th className="text-fg-tertiary w-24 px-2 py-1.5 text-right font-medium uppercase">
              Scope
            </th>
          </tr>
        </thead>
        <tbody>
          {normalizedNames.map((name) => (
            <EnvVarTableRow
              key={name}
              name={name}
              predefinedNames={predefinedNames}
              sandboxNames={sandboxNames}
              sessionValues={sessionValues}
              shownValues={shownValues}
              templateNames={templateNames}
              isSetting={isSetting}
              sandboxId={sandboxId}
              onRemoveSandboxName={onRemoveSandboxName}
              onRemoveTemplateName={onRemoveTemplateName}
              onSetValue={onSetValue}
              onToggleShownValue={onToggleShownValue}
            />
          ))}
          <NewEnvVarTableRow
            disabled={!sandboxId || isSetting}
            onSetValue={onSetValue}
          />
        </tbody>
      </table>
    </div>
  )
}

function EnvVarTableRow({
  name,
  predefinedNames,
  sandboxNames,
  sessionValues,
  shownValues,
  templateNames,
  isSetting,
  sandboxId,
  onRemoveSandboxName,
  onRemoveTemplateName,
  onSetValue,
  onToggleShownValue,
}: {
  name: string
  predefinedNames: string[]
  sandboxNames: string[]
  sessionValues: Record<string, string>
  shownValues: Record<string, boolean>
  templateNames: string[]
  isSetting: boolean
  sandboxId?: string
  onRemoveSandboxName: (name: string) => void
  onRemoveTemplateName: (name: string) => void
  onSetValue: (envVar: { name: string; value: string }) => Promise<void>
  onToggleShownValue: (name: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftValue, setDraftValue] = useState('')
  const hasSessionValue = Object.hasOwn(sessionValues, name)
  const source = getEnvVarSource({
    name,
    predefinedNames,
    sandboxNames,
    templateNames,
  })
  const value = hasSessionValue
    ? shownValues[name]
      ? sessionValues[name]
      : '*'.repeat(8)
    : 'Not set'
  const canEdit = Boolean(sandboxId) && !isSetting

  const startEditing = () => {
    if (!canEdit) return

    setDraftValue(hasSessionValue ? (sessionValues[name] ?? '') : '')
    setIsEditing(true)
  }

  const submitValue = async () => {
    if (!draftValue) return

    await onSetValue({ name, value: draftValue })
    setIsEditing(false)
  }

  const handleValueKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      await submitValue()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setIsEditing(false)
    }
  }

  return (
    <tr className="border-b last:border-b-0">
      <td className="truncate px-2 py-1.5 font-mono">{name}</td>
      <td className="px-2 py-1.5">
        {isEditing ? (
          <Input
            aria-label={`${name} value`}
            autoFocus
            value={draftValue}
            onBlur={() => setIsEditing(false)}
            onChange={(event) => setDraftValue(event.target.value)}
            onKeyDown={handleValueKeyDown}
            placeholder="value"
            className="h-6 font-mono"
            spellCheck={false}
          />
        ) : (
          <div className="flex min-w-0 items-center gap-1">
            <Button
              type="button"
              aria-label={
                hasSessionValue ? `Edit ${name} value` : `Set ${name} value`
              }
              variant="tertiary"
              size="none"
              className="text-fg-tertiary h-6 min-w-0 flex-1 justify-start truncate px-1.5 font-mono"
              disabled={!canEdit}
              onClick={startEditing}
            >
              {value}
            </Button>
            {hasSessionValue ? (
              <Button
                type="button"
                aria-label={shownValues[name] ? `Hide ${name}` : `Show ${name}`}
                variant="tertiary"
                size="none"
                className="h-6 shrink-0 px-1.5"
                onClick={() => onToggleShownValue(name)}
              >
                {shownValues[name] ? 'Hide' : 'Show'}
              </Button>
            ) : null}
          </div>
        )}
      </td>
      <td className="px-2 py-1.5">
        <div className="flex items-center justify-end gap-1">
          <span className="text-fg-tertiary truncate">{source.label}</span>
          {source.removableScope === 'sandbox' ? (
            <IconButton
              type="button"
              aria-label={`Remove ${name}`}
              title={`Remove ${name}`}
              onClick={() => onRemoveSandboxName(name)}
            >
              <RemoveIcon />
            </IconButton>
          ) : null}
          {source.removableScope === 'template' ? (
            <IconButton
              type="button"
              aria-label={`Remove ${name}`}
              title={`Remove ${name}`}
              onClick={() => onRemoveTemplateName(name)}
            >
              <RemoveIcon />
            </IconButton>
          ) : null}
        </div>
      </td>
    </tr>
  )
}

function NewEnvVarTableRow({
  disabled,
  onSetValue,
}: {
  disabled: boolean
  onSetValue: (envVar: { name: string; value: string }) => Promise<void>
}) {
  const [draftName, setDraftName] = useState('')
  const [draftValue, setDraftValue] = useState('')

  const submitValue = async () => {
    const name = normalizeTerminalEnvVarName(draftName)
    if (!name || !draftValue) return

    await onSetValue({ name, value: draftValue })
    setDraftName('')
    setDraftValue('')
  }

  const handleValueKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return

    event.preventDefault()
    await submitValue()
  }

  return (
    <tr className="border-b last:border-b-0">
      <td className="px-2 py-1.5">
        <Input
          aria-label="New environment variable key"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          placeholder="KEY"
          className="h-6 font-mono uppercase"
          disabled={disabled}
          spellCheck={false}
        />
      </td>
      <td className="px-2 py-1.5">
        <Input
          aria-label="New environment variable value"
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onKeyDown={handleValueKeyDown}
          placeholder="value"
          className="h-6 font-mono"
          disabled={disabled}
          spellCheck={false}
        />
      </td>
      <td className="text-fg-tertiary px-2 py-1.5 text-right">New</td>
    </tr>
  )
}

function getEnvVarSource({
  name,
  predefinedNames,
  sandboxNames,
  templateNames,
}: {
  name: string
  predefinedNames: string[]
  sandboxNames: string[]
  templateNames: string[]
}) {
  if (predefinedNames.includes(name)) {
    return {
      label: 'Default',
      removableScope: null,
    }
  }

  if (sandboxNames.includes(name)) {
    return {
      label: 'Sandbox',
      removableScope: 'sandbox' as const,
    }
  }

  if (templateNames.includes(name)) {
    return {
      label: 'Template',
      removableScope: 'template' as const,
    }
  }

  return {
    label: 'Session',
    removableScope: null,
  }
}
