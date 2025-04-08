/* eslint-disable react-hooks/rules-of-hooks */

'use client'

import { MoreVertical, Lock, LockOpen, Cpu } from 'lucide-react'
import {
  ColumnDef,
  FilterFn,
  getSortedRowModel,
  getCoreRowModel,
  getFilteredRowModel,
  TableOptions,
} from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import { DefaultTemplate, Template } from '@/types/api'
import { useToast } from '@/lib/hooks/use-toast'
import { Button } from '@/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/primitives/dropdown-menu'
import {
  deleteTemplateAction,
  updateTemplateAction,
} from '@/server/templates/templates-actions'
import { useMemo, useState } from 'react'
import { Badge } from '@/ui/primitives/badge'
import { CgSmartphoneRam } from 'react-icons/cg'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { Loader } from '@/ui/loader'
import { AlertDialog } from '@/ui/alert-dialog'
import posthog from 'posthog-js'
import { cn } from '@/lib/utils'
import { useAction } from 'next-safe-action/hooks'
import { defaultSuccessToast, defaultErrorToast } from '@/lib/hooks/use-toast'
import { ByE2BBadge } from '@/features/dashboard/templates/by-e2b-badge'

// FILTERS
export const fuzzyFilter: FilterFn<unknown> = (
  row,
  columnId,
  value,
  addMeta
) => {
  // Skip undefined values
  if (!value || !value.length) return true

  const searchValue = value.toLowerCase()
  const rowValue = row.getValue(columnId)

  // Handle null/undefined row values
  if (rowValue == null) return false

  // Convert row value to string and lowercase for comparison
  const itemStr = String(rowValue).toLowerCase()
  const itemRank = rankItem(itemStr, searchValue)

  addMeta({
    itemRank,
  })

  return itemRank.passed
}

// TABLE CONFIG
export const fallbackData: (Template | DefaultTemplate)[] = []

export const trackTemplateTableInteraction = (
  action: string,
  properties: Record<string, unknown> = {}
) => {
  posthog.capture('template table interacted', {
    action,
    ...properties,
  })
}

export const useColumns = (deps: unknown[]) => {
  return useMemo<ColumnDef<Template | DefaultTemplate>[]>(
    () => [
      {
        id: 'actions',
        enableSorting: false,
        enableGlobalFilter: false,
        enableResizing: false,
        size: 35,
        cell: ({ row }) => {
          const template = row.original
          const selectedTeam = useSelectedTeam()
          const { toast } = useToast()
          const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

          const { execute: executeUpdateTemplate, isExecuting: isUpdating } =
            useAction(updateTemplateAction, {
              onSuccess: ({ input }) => {
                toast(
                  defaultSuccessToast(
                    `Template is now ${input.props.Public ? 'public' : 'private'}.`
                  )
                )
              },
              onError: (error) => {
                toast(
                  defaultErrorToast(
                    error.error.serverError || 'Failed to update template.'
                  )
                )
              },
            })

          const { execute: executeDeleteTemplate, isExecuting: isDeleting } =
            useAction(deleteTemplateAction, {
              onSuccess: () => {
                toast(defaultSuccessToast('Template has been deleted.'))
              },
              onError: (error) => {
                toast(
                  defaultErrorToast(
                    error.error.serverError || 'Failed to delete template.'
                  )
                )
              },
              onSettled: () => {
                setIsDeleteDialogOpen(false)
              },
            })

          const togglePublish = async () => {
            if (!selectedTeam) {
              return
            }

            executeUpdateTemplate({
              templateId: template.templateID,
              props: {
                Public: !template.public,
              },
            })
          }

          const deleteTemplate = async () => {
            if (!selectedTeam) {
              return
            }

            executeDeleteTemplate({
              templateId: template.templateID,
            })
          }

          return (
            <>
              <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                title="Delete Template"
                description="Are you sure you want to delete this template? This action cannot be undone."
                confirm="Delete"
                onConfirm={() => deleteTemplate()}
                confirmProps={{
                  disabled: isDeleting,
                  loading: isDeleting,
                }}
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-fg-500 size-5"
                    disabled={
                      isUpdating || isDeleting || 'isDefault' in template
                    }
                  >
                    {isUpdating ? (
                      <Loader className="size-4" />
                    ) : (
                      <MoreVertical className="size-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>General</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={togglePublish}
                      disabled={isUpdating || isDeleting}
                    >
                      {template.public ? (
                        <>
                          <Lock className="!size-3" />
                          Set Private
                        </>
                      ) : (
                        <>
                          <LockOpen className="!size-3" />
                          Set Public
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Danger Zone</DropdownMenuLabel>
                    <DropdownMenuItem
                      variant="error"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      disabled={isUpdating || isDeleting}
                    >
                      X Delete
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )
        },
      },
      {
        accessorKey: 'templateID',
        header: 'ID',
        size: 160,
        minSize: 120,
        cell: ({ row }) => (
          <div className="text-fg-500 truncate font-mono text-xs">
            {row.getValue('templateID')}
          </div>
        ),
      },
      {
        accessorKey: 'name',
        accessorFn: (row) => row.aliases?.[0],
        header: 'Name',
        size: 160,
        minSize: 120,
        cell: ({ row, getValue }) => (
          <div
            className={cn(
              'flex items-center gap-2 truncate font-mono font-medium',
              {
                'text-fg-500': !getValue(),
              }
            )}
          >
            <span>{(getValue() as string) ?? 'N/A'}</span>
            {'isDefault' in row.original && row.original.isDefault && (
              <ByE2BBadge />
            )}
          </div>
        ),
      },
      {
        accessorKey: 'cpuCount',
        header: 'CPU',
        size: 125,
        minSize: 125,
        cell: ({ row }) => {
          const cpuCount = row.getValue('cpuCount') as number
          return (
            <Badge className="text-fg-500 font-mono whitespace-nowrap">
              <Cpu className="text-contrast-2 size-2.5" />{' '}
              <span className="text-contrast-2">{cpuCount}</span> core
              {cpuCount > 1 ? 's' : ''}
            </Badge>
          )
        },
        filterFn: 'equals',
      },
      {
        accessorKey: 'memoryMB',
        header: 'Memory',
        size: 140,
        minSize: 140,
        cell: ({ row }) => {
          const memoryMB = row.getValue('memoryMB') as number
          return (
            <Badge className="text-fg-500 font-mono whitespace-nowrap">
              <CgSmartphoneRam className="text-contrast-1 size-2.5" />{' '}
              <span className="text-contrast-1">
                {memoryMB.toLocaleString()}{' '}
              </span>
              MB
            </Badge>
          )
        },
        filterFn: 'equals',
      },
      {
        accessorKey: 'createdAt',
        enableGlobalFilter: true,
        id: 'createdAt',
        header: 'Created At',
        size: 250,
        minSize: 140,
        cell: ({ row, getValue }) => {
          const dateValue = getValue() as string;

          const dateTimeString = useMemo(() => {
            return new Date(dateValue).toUTCString();
          }, [dateValue]);

          const [day, date, month, year, time, timezone] = useMemo(() => {
            return dateTimeString.split(' ');
          }, [dateTimeString]);

          return (
            <div className={cn('h-full truncate font-mono text-xs')}>
              <span className="text-fg-500">{`${day} ${date} ${month} ${year}`}</span>{' '}
              <span className="text-fg">{time}</span>{' '}
              <span className="text-fg-500">{timezone}</span>
            </div>
          )
        },
        sortingFn: (rowA, rowB) => {
          return rowA.original.createdAt.localeCompare(rowB.original.createdAt);
        },
      },
      {
        accessorKey: 'updatedAt',
        id: 'updatedAt',
        header: 'Updated At',
        size: 250,
        minSize: 140,
        enableGlobalFilter: true,
        cell: ({ row, getValue }) => {
          const dateValue = getValue() as string;

          const dateTimeString = useMemo(() => {
            return new Date(dateValue).toUTCString();
          }, [dateValue]);

          const [day, date, month, year, time, timezone] = useMemo(() => {
            return dateTimeString.split(' ');
          }, [dateTimeString]);

          return (
            <div className={cn('h-full truncate font-mono text-xs')}>
              <span className="text-fg-500">{`${day} ${date} ${month} ${year}`}</span>{' '}
              <span className="text-fg">{time}</span>{' '}
              <span className="text-fg-500">{timezone}</span>
            </div>
          )
        },
        sortingFn: (rowA, rowB) => {
          return rowA.original.updatedAt.localeCompare(rowB.original.updatedAt);
        },
      },
      {
        accessorKey: 'public',
        header: 'Visibility',
        size: 140,
        minSize: 100,
        cell: ({ getValue }) => (
          <Badge
            className={cn('text-fg-500 font-mono whitespace-nowrap', {
              'text-success': getValue(),
            })}
          >
            {getValue() ? 'Public' : 'Private'}
          </Badge>
        ),
        enableSorting: false,
        filterFn: 'equals',
      },
    ],
    deps
  )
}

export const templatesTableConfig: Partial<
  TableOptions<Template | DefaultTemplate>
> = {
  filterFns: {
    fuzzy: fuzzyFilter,
  },
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getSortedRowModel: getSortedRowModel(),
  enableSorting: true,
  enableMultiSort: false,
  columnResizeMode: 'onChange',
  enableColumnResizing: true,
  enableGlobalFilter: true,
  // @ts-expect-error globalFilterFn is not a valid option
  globalFilterFn: 'fuzzy',
}
