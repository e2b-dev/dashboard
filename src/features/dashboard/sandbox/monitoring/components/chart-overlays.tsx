import { Pause, Play, Plus, Square } from 'lucide-react'
import { withOpacity } from '../utils/chart-colors'
import { formatEventTimestamp } from '../utils/chart-data-utils'
import type {
  CrosshairMarker,
  LifecycleEventOverlay,
} from '../utils/chart-overlay-layout'
import {
  SANDBOX_MONITORING_CHART_EVENT_ICON_SIZE,
  SANDBOX_MONITORING_CHART_EVENT_LINE_BASE_OPACITY,
  SANDBOX_MONITORING_CHART_LINE_WIDTH,
  SANDBOX_MONITORING_CHART_MARKER_BG_OPACITY,
  SANDBOX_MONITORING_CHART_MARKER_BORDER_OPACITY,
} from '../utils/constants'
import { cn } from '@/lib/utils'

const SANDBOX_LIFECYCLE_EVENT_ICON_MAP: Record<string, typeof Plus> = {
  'sandbox.lifecycle.created': Plus,
  'sandbox.lifecycle.paused': Pause,
  'sandbox.lifecycle.resumed': Play,
  'sandbox.lifecycle.killed': Square,
}

function LifecycleEventOverlayGroup({
  overlays,
  showEventLabels,
}: {
  overlays: LifecycleEventOverlay[]
  showEventLabels: boolean
}) {
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
                      <IconComponent
                        size={SANDBOX_MONITORING_CHART_EVENT_ICON_SIZE}
                        strokeWidth={2}
                      />
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
                        {formatEventTimestamp(eventOverlay.timestampMs)}
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

function CrosshairMarkerGroup({ markers }: { markers: CrosshairMarker[] }) {
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
              'pointer-events-auto prose-label-numeric absolute top-1/2 border text-fg font-mono -translate-y-1/2 whitespace-nowrap px-2 py-0.5 backdrop-blur-lg',
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
  return (
    <div
      className="prose-label-numeric bg-bg/60 font-mono absolute bottom-4 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 text-fg backdrop-blur-lg"
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
  axisPointerColor,
}: {
  lifecycleEventOverlays: LifecycleEventOverlay[]
  crosshairMarkers: CrosshairMarker[]
  xAxisHoverBadge: { xPx: number; label: string } | null
  showEventLabels: boolean
  axisPointerColor: string
}) {
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
      <CrosshairMarkerGroup markers={crosshairMarkers} />
      {xAxisHoverBadge ? (
        <XAxisHoverBadge
          badge={xAxisHoverBadge}
          axisPointerColor={axisPointerColor}
        />
      ) : null}
    </div>
  )
}
