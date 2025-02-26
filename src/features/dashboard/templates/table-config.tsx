/* eslint-disable react-hooks/rules-of-hooks */

'use client'

import { MoreVertical, Lock, LockOpen, Trash, Cpu } from 'lucide-react'
import {
  ColumnDef,
  FilterFn,
  getSortedRowModel,
  getCoreRowModel,
  getFilteredRowModel,
  TableOptions,
} from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import { Template } from '@/types/api'
import { useRouter } from 'next/navigation'
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
import { useMemo, useState, startTransition } from 'react'
import { Badge } from '@/ui/primitives/badge'
import { CgSmartphoneRam } from 'react-icons/cg'
import { useSelectedTeam } from '@/lib/hooks/use-teams'
import { Loader } from '@/ui/loader'
import { AlertDialog } from '@/ui/alert-dialog'
import posthog from 'posthog-js'

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
export const fallbackData: Template[] = []

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
  return useMemo<ColumnDef<Template>[]>(
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
          const [isUpdating, setIsUpdating] = useState(false)
          const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
          const [isDeleting, setIsDeleting] = useState(false)

          const router = useRouter()

          const togglePublish = async () => {
            if (!selectedTeam) {
              return
            }

            setIsUpdating(true)
            startTransition(async () => {
              try {
                const response = await updateTemplateAction({
                  templateId: template.templateID,
                  props: {
                    Public: !template.public,
                  },
                })

                if (response.type === 'error') {
                  throw new Error(response.message)
                }

                router.refresh()
                toast({
                  title: 'Success',
                  description: `Template ${template.public ? 'Unpublished' : 'Published'} Successfully`,
                  variant: 'success',
                })
              } catch (error: unknown) {
                toast({
                  title: 'Failed to update template visibility',
                  description:
                    error instanceof Error ? error.message : 'Unknown error',
                  variant: 'error',
                })
              } finally {
                setIsUpdating(false)
              }
            })
          }

          const deleteTemplate = async () => {
            if (!selectedTeam) {
              return
            }

            setIsDeleting(true)
            startTransition(async () => {
              try {
                const response = await deleteTemplateAction({
                  templateId: template.templateID,
                })

                if (response.type === 'error') {
                  throw new Error(response.message)
                }

                router.refresh()
                toast({
                  title: 'Success',
                  description: 'Template deleted successfully',
                  variant: 'success',
                })
              } catch (error: unknown) {
                toast({
                  title: 'Failed to delete template',
                  description:
                    error instanceof Error ? error.message : 'Unknown error',
                  variant: 'error',
                })
              } finally {
                setIsDeleting(false)
                setIsDeleteDialogOpen(false)
              }
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
                    disabled={isUpdating || isDeleting}
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
                          Unpublish
                        </>
                      ) : (
                        <>
                          <LockOpen className="!size-3" />
                          Publish
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
      /*       {
        accessorKey: "aliases",
        header: "Aliases",
        cell: ({ row }) => (
          <div className="font-mono font-medium">
            {(row.getValue("aliases") as string[])[0]}
          </div>
        ),
      }, */
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
        accessorKey: 'cpuCount',
        header: 'CPU',
        size: 125,
        minSize: 125,
        cell: ({ row }) => {
          const cpuCount = row.getValue('cpuCount') as number
          return (
            <Badge variant="contrast-2" className="font-mono whitespace-nowrap">
              <Cpu className="size-2" /> {cpuCount} core
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
            <Badge variant="contrast-1" className="font-mono whitespace-nowrap">
              <CgSmartphoneRam className="size-2" /> {memoryMB.toLocaleString()}{' '}
              MB
            </Badge>
          )
        },
        filterFn: 'equals',
      },
      {
        accessorFn: (row) => new Date(row.createdAt).toUTCString(),
        enableGlobalFilter: true,
        id: 'createdAt',
        header: 'Created At',
        size: 250,
        minSize: 140,
        cell: ({ getValue }) => (
          <div className="text-fg-500 truncate font-mono text-xs">
            {getValue() as string}
          </div>
        ),
      },
      {
        accessorFn: (row) => new Date(row.updatedAt).toUTCString(),
        id: 'updatedAt',
        header: 'Updated At',
        size: 250,
        minSize: 140,
        enableGlobalFilter: true,
        cell: ({ getValue }) => (
          <div className="text-fg-500 truncate font-mono text-xs">
            {getValue() as string}
          </div>
        ),
      },
      {
        accessorKey: 'public',
        header: 'Public',
        size: 100,
        minSize: 100,
        cell: ({ getValue }) => (
          <Badge
            variant={getValue() ? 'success' : 'muted'}
            className="font-mono whitespace-nowrap"
          >
            {getValue() ? 'true' : 'false'}
          </Badge>
        ),
        enableSorting: false,
        filterFn: 'equals',
      },
    ],
    deps
  )
}

export const templatesTableConfig: Partial<TableOptions<Template>> = {
  filterFns: {
    fuzzy: fuzzyFilter,
  },
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getSortedRowModel: getSortedRowModel(),
  enableSorting: true,
  enableMultiSort: true,
  columnResizeMode: 'onChange',
  enableColumnResizing: true,
  enableGlobalFilter: true,
  // @ts-expect-error globalFilterFn is not a valid option
  globalFilterFn: 'fuzzy',
}
