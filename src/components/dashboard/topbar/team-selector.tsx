"use client";

import { useMetadata } from "@/components/providers/metadata-provider";
import { useTeams } from "@/components/providers/teams-provider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROTECTED_URLS } from "@/configs/urls";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TeamSelector() {
  const { teams: teamsData } = useTeams();
  const { selectedTeamId } = useMetadata();
  const router = useRouter();

  if (!teamsData) return null;

  const defaultTeam = teamsData.find(
    (team) => team.id === teamsData.find((team) => team.is_default)?.id,
  );

  const teams = teamsData.filter((team) => team.id !== defaultTeam?.id);

  return (
    <Select
      value={selectedTeamId}
      onValueChange={(value) => router.push(PROTECTED_URLS.TEAM(value))}
    >
      <SelectTrigger className="w-auto border-none p-0 normal-case">
        <SelectValue placeholder="Select organization" />
      </SelectTrigger>
      <SelectContent className="min-w-[16rem]">
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
            <SelectLabel>Organizations</SelectLabel>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        <Button size="sm" className="mt-4 w-full">
          <Plus className="h-4 w-4" />
          New Organization
        </Button>
      </SelectContent>
    </Select>
  );
}
