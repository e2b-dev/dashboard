'use client'

import { useTRPC } from '@/trpc/client'
import { useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { useDashboard } from '../../context'

const BuildsTable = () => {
  const trpc = useTRPC()
  const { team } = useDashboard()

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.builds.getCompletedBuilds.infiniteQueryOptions(
        {
          teamIdOrSlug: team.id,
          limit: 20,
        },
        {
          getNextPageParam: (parentPage) => parentPage.nextCursor,
        }
      )
    )

  const allBuilds = data.pages.flatMap((page) => page.data)

  return (
    <div className="space-y-4 p-4 overflow-y-auto h-full">
      <h2 className="text-lg font-semibold">
        Completed Builds ({allBuilds.length})
      </h2>

      <div className="space-2">
        {allBuilds.map((build) => (
          <div key={build.id} className="rounded border p-3 text-sm">
            <div>
              <strong>Build ID:</strong> {build.id}
            </div>
            <div>
              <strong>Status:</strong> {build.status}
            </div>
            <div>
              <strong>Env ID:</strong> {build.env_id}
            </div>
            <div>
              <strong>Created:</strong>{' '}
              {new Date(build.created_at).toLocaleString()}
            </div>
            {build.finished_at && (
              <div>
                <strong>Finished:</strong>{' '}
                {new Date(build.finished_at).toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>

      {allBuilds.length === 0 && (
        <div className="text-center text-muted-foreground">No builds found</div>
      )}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full rounded border bg-background px-4 py-2 hover:bg-accent disabled:opacity-50"
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  )
}

export default BuildsTable
