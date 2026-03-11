import { PowerIcon, SquareIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type AddIcon, PausedIcon, RunningIcon } from '@/ui/primitives/icons'
import { withOpacity } from '../utils/chart-colors'
import type {
  CrosshairMarker,
  LifecycleEventOverlay,
} from '../utils/chart-overlay-layout'
import {
  SANDBOX_LIFECYCLE_EVENT_CREATED,
  SANDBOX_LIFECYCLE_EVENT_KILLED,
  SANDBOX_LIFECYCLE_EVENT_PAUSED,
  SANDBOX_LIFECYCLE_EVENT_RESUMED,
  SANDBOX_MONITORING_CHART_EVENT_LINE_BASE_OPACITY,
  SANDBOX_MONITORING_CHART_LINE_WIDTH,
  SANDBOX_MONITORING_CHART_MARKER_BG_OPACITY,
  SANDBOX_MONITORING_CHART_MARKER_BORDER_OPACITY,
} from '../utils/constants'
import { formatHoverTimestamp } from '../utils/formatters'

const SANDBOX_LIFECYCLE_EVENT_ICON_MAP: Record<
  string,
  typeof AddIcon | typeof PowerIcon
> = {
  [SANDBOX_LIFECYCLE_EVENT_CREATED]: PowerIcon,
  [SANDBOX_LIFECYCLE_EVENT_PAUSED]: PausedIcon,
  [SANDBOX_LIFECYCLE_EVENT_RESUMED]: RunningIcon,
  [SANDBOX_LIFECYCLE_EVENT_KILLED]: SquareIcon,
}

function LifecycleEventOverlayGroup({
  overlays,
  showEventLabels,
}: {
  overlays: LifecycleEventOverlay[]
  showEventLabels: boolean
}) {
  'use no memo'

  return (
    <>
      {overlays.map((eventOverlay) => {
        const IconComponent =
          SANDBOX_LIFECYCLE_EVENT_ICON_MAP[eventOverlay.type]

        return (
          <div key={eventOverlay.key}>
            <span
              className="absolute -translate-x-1/2 transition-opacity"
              data-event-line={eventOverlay.key}
              style={{
                left: eventOverlay.xPx,
                top: eventOverlay.topPx,
                height: eventOverlay.heightPx,
                width: SANDBOX_MONITORING_CHART_LINE_WIDTH,
                backgroundImage: `repeating-linear-gradient(to bottom, ${eventOverlay.color} 0px, ${eventOverlay.color} 4px, transparent 4px, transparent 6px)`,
                opacity: SANDBOX_MONITORING_CHART_EVENT_LINE_BASE_OPACITY,
                zIndex: 12,
              }}
            />
            {showEventLabels ? (
              <div
                style={{
                  left: eventOverlay.labelXPx,
                  top: eventOverlay.labelTopPx,
                  color: eventOverlay.color,
                  zIndex: 18,
                }}
                className="group/event pointer-events-auto absolute"
                onMouseEnter={(e) => {
                  e.currentTarget.style.zIndex = '30'
                  const line = e.currentTarget.parentElement?.querySelector(
                    `[data-event-line="${eventOverlay.key}"]`
                  ) as HTMLElement | null
                  if (line) {
                    line.style.opacity = '1'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.zIndex = '18'
                  const line = e.currentTarget.parentElement?.querySelector(
                    `[data-event-line="${eventOverlay.key}"]`
                  ) as HTMLElement | null
                  if (line) {
                    line.style.opacity = String(
                      SANDBOX_MONITORING_CHART_EVENT_LINE_BASE_OPACITY
                    )
                  }
                }}
              >
                <div className="relative -translate-x-1/2">
                  <div className="flex items-center justify-center p-1">
                    {IconComponent ? (
                      <IconComponent className="size-3" />
                    ) : null}
                  </div>
                  <div
                    className={cn(
                      'absolute top-0 flex h-full items-center overflow-hidden transition-[max-width] duration-200 ease-out',
                      'max-w-0 group-hover/event:max-w-60',
                      eventOverlay.alignRight
                        ? 'right-full justify-end'
                        : 'left-full'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center gap-1.5 whitespace-nowrap leading-none',
                        eventOverlay.alignRight ? 'pr-1.5' : 'pl-1.5'
                      )}
                    >
                      <span className="prose-label uppercase">
                        {eventOverlay.label}
                      </span>
                      <span className="prose-label-numeric font-mono text-current/60">
                        {formatHoverTimestamp(eventOverlay.timestampMs)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )
      })}
    </>
  )
}

function CrosshairMarkerGroup({
  markers,
  isMobile,
}: {
  markers: CrosshairMarker[]
  isMobile: boolean
}) {
  'use no memo'

  return (
    <>
      {markers.map((marker) => (
        <div
          key={marker.key}
          className="absolute"
          style={{
            left: marker.xPx,
            top: marker.yPx,
            zIndex: 30,
          }}
        >
          <span
            className="absolute size-2 -translate-x-1/2 -translate-y-1/2 border border-bg-1"
            style={{ backgroundColor: marker.dotColor }}
          />
          <div
            style={{
              backgroundColor: withOpacity(
                marker.dotColor,
                SANDBOX_MONITORING_CHART_MARKER_BG_OPACITY
              ),
              borderColor: withOpacity(
                marker.dotColor,
                SANDBOX_MONITORING_CHART_MARKER_BORDER_OPACITY
              ),
              marginTop: marker.labelOffsetYPx,
            }}
            className={cn(
              'absolute top-1/2 border text-fg font-mono -translate-y-1/2 whitespace-nowrap backdrop-blur-lg',
              isMobile
                ? 'text-[10px] leading-tight px-1 py-px'
                : 'prose-label-numeric px-2 py-0.5',
              marker.placeValueOnRight ? 'left-2' : 'right-2'
            )}
          >
            {marker.valueContent}
          </div>
        </div>
      ))}
    </>
  )
}

function XAxisHoverBadge({
  badge,
  axisPointerColor,
}: {
  badge: { xPx: number; label: string }
  axisPointerColor: string
}) {
  'use no memo'

  return (
    <div
      className="bg-bg font-mono prose-label-numeric absolute bottom-2.75 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 text-fg backdrop-blur-lg"
      style={{
        left: badge.xPx,
        borderColor: axisPointerColor,
        zIndex: 20,
      }}
    >
      {badge.label}
    </div>
  )
}

export function ChartOverlayLayer({
  lifecycleEventOverlays,
  crosshairMarkers,
  xAxisHoverBadge,
  showEventLabels,
  isMobile,
  axisPointerColor,
}: {
  lifecycleEventOverlays: LifecycleEventOverlay[]
  crosshairMarkers: CrosshairMarker[]
  xAxisHoverBadge: { xPx: number; label: string } | null
  showEventLabels: boolean
  isMobile: boolean
  axisPointerColor: string
}) {
  'use no memo'

  const showOverlay =
    lifecycleEventOverlays.length > 0 ||
    crosshairMarkers.length > 0 ||
    xAxisHoverBadge !== null

  if (!showOverlay) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-0">
      <LifecycleEventOverlayGroup
        overlays={lifecycleEventOverlays}
        showEventLabels={showEventLabels}
      />
      <CrosshairMarkerGroup markers={crosshairMarkers} isMobile={isMobile} />
      {xAxisHoverBadge ? (
        <XAxisHoverBadge
          badge={xAxisHoverBadge}
          axisPointerColor={axisPointerColor}
        />
      ) : null}
    </div>
  )
}
