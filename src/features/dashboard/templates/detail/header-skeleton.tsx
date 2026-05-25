import {
  DetailsItem,
  DetailsRow,
} from '@/features/dashboard/layouts/details-row'
import { Skeleton } from '@/ui/primitives/skeleton'

export default function TemplateDetailHeaderSkeleton() {
  return (
    <DetailsRow>
      <DetailsItem label="Memory">
        <Skeleton className="w-20 h-5" />
      </DetailsItem>
      <DetailsItem label="CPU">
        <Skeleton className="w-16 h-5" />
      </DetailsItem>
      <DetailsItem label="Created">
        <Skeleton className="w-36 h-5" />
      </DetailsItem>
      <DetailsItem label="Updated">
        <Skeleton className="w-36 h-5" />
      </DetailsItem>
      <DetailsItem label="Visibility">
        <Skeleton className="w-20 h-5" />
      </DetailsItem>
    </DetailsRow>
  )
}
