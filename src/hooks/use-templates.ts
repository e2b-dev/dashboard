import useSWR, { SWRConfiguration } from "swr";
import { useApiUrl } from "./use-api-url";
import { useSelectedTeam } from "./use-teams";
import { QUERY_KEYS } from "@/configs/query-keys";
import { getTeamTemplatesAction } from "@/actions/templates-actions";

export const useTemplates = (config?: SWRConfiguration) => {
  const team = useSelectedTeam();
  const apiUrl = useApiUrl();

  return useSWR(
    team && apiUrl ? QUERY_KEYS.TEAM_TEMPLATES(team.id, apiUrl) : null,
    async () => {
      if (!team || !apiUrl) return;

      const res = await getTeamTemplatesAction({
        apiUrl,
        teamId: team.id,
      });

      if (res.type === "error") {
        throw new Error(res.message);
      }

      return res.data;
    },
    config,
  );
};
