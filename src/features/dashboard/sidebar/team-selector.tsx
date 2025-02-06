'use client'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/ui/primitives/select'
import { useSelectedTeam, useTeams } from '@/lib/hooks/use-teams'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { Loader } from '@/ui/loader'
import Dotted from '@/ui/dotted'
import { PROTECTED_URLS } from '@/configs/urls'

export default function TeamSelector() {
  const { teams: loadedTeams } = useTeams()
  const selectedTeam = useSelectedTeam()
  const router = useRouter()

  const defaultTeam = useMemo(
    () => loadedTeams.find((team) => team.is_default),
    [loadedTeams]
  )

  const teams = useMemo(
    () => loadedTeams.filter((team) => team.id !== defaultTeam?.id) ?? [],
    [loadedTeams, defaultTeam]
  )

  return (
    <Select
      value={selectedTeam?.id}
      onValueChange={(teamId) => {
        const team = loadedTeams.find((team) => team.id === teamId)

        router.push(PROTECTED_URLS.SANDBOXES(team?.slug || teamId))
        router.refresh()
      }}
    >
      <SelectTrigger className="h-auto w-full border px-2 py-1 pr-4 hover:bg-bg-100">
        <div className="flex max-w-full flex-1 items-center gap-3 overflow-hidden text-ellipsis">
          <div className="relative size-8 min-w-8 rounded-md border">
            <Dotted />
          </div>
          <div className="flex flex-col items-start truncate pb-px">
            <span className="-mb-1 truncate text-[0.65rem] text-fg-500">
              TEAM
            </span>
            {selectedTeam ? (
              <SelectValue
                placeholder="No team selected"
                className="truncate"
              />
            ) : (
              <Loader variant="dots" />
            )}
          </div>
        </div>
      </SelectTrigger>
      <SelectContent>
        {defaultTeam && (
          <SelectGroup>
            <SelectLabel>Personal</SelectLabel>
            <SelectItem key={defaultTeam.id} value={defaultTeam.id}>
              {defaultTeam.name}
            </SelectItem>
          </SelectGroup>
        )}
        {teams.length > 0 && (
          <SelectGroup className="mt-2">
            <SelectLabel>Teams</SelectLabel>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  )
}
