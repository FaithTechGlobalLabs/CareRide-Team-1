import { useEffect, useRef, useState } from 'react'
import { useMapsAvailable, useRoute } from '../../hooks/useMaps'
import { loadMapsLibrary, MAP_ID, type LatLng } from '../../services/googleMaps'

const RIDE_COLOR = '#1d4fe0' // brand-600
const APPROACH_COLOR = '#64748b' // slate-500
const PICKUP_COLOR = '#f5573f' // coral-500, the pickup pin colour used on trip steps

interface Props {
  pickup: string
  dropoff: string
  driver?: LatLng // shown with a dashed line to the pickup, before the client is in the car
  className?: string // replaces the default height so a request card can keep the map compact
}

// The ride on a map: pickup (A) to drop-off (B), plus where the driver is now if they shared it.
// The drive times beside it say the same thing in words, for anyone who can't use the map.
export function RouteMap({ pickup, dropoff, driver, className }: Props) {
  const available = useMapsAvailable()
  const ride = useRoute(pickup, dropoff, true)
  const approach = useRoute(driver, driver ? pickup : undefined, true)
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<google.maps.Map>(undefined)
  const drawn = useRef<{ setMap: (m: null) => void }[]>([])
  const [broken, setBroken] = useState(false)

  const ridePath = ride.status === 'ready' ? ride.route.path : undefined
  const approachPath = approach.status === 'ready' ? approach.route.path : undefined

  useEffect(() => {
    if (!ridePath?.length || !box.current) return
    let live = true

    ;(async () => {
      try {
        const [{ Map, Polyline }, { AdvancedMarkerElement, PinElement }, { LatLngBounds }] = await Promise.all([
          loadMapsLibrary('maps'),
          loadMapsLibrary('marker'),
          loadMapsLibrary('core'),
        ])
        if (!live || !box.current) return
        // A new box (the map was hidden, then shown for another ride) needs a new map
        if (!map.current || map.current.getDiv() !== box.current) {
          drawn.current = []
          map.current = new Map(box.current, {
            mapId: MAP_ID,
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: 'cooperative',
            clickableIcons: false,
          })
        }
        const m = map.current

        drawn.current.forEach((d) => d.setMap(null))
        drawn.current = []
        const bounds = new LatLngBounds()

        const line = (path: LatLng[], color: string, dashed: boolean) => {
          path.forEach((p) => bounds.extend(p))
          const poly = new Polyline({
            map: m,
            path,
            strokeColor: color,
            strokeOpacity: dashed ? 0 : 0.9,
            strokeWeight: 5,
            icons: dashed
              ? [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeColor: color, scale: 3 }, offset: '0', repeat: '14px' }]
              : undefined,
          })
          drawn.current.push(poly)
        }
        const pin = (at: LatLng, glyph: string, background: string, title: string) => {
          const el = new PinElement({ glyphText: glyph, glyphColor: '#ffffff', background, borderColor: '#ffffff' })
          const marker = new AdvancedMarkerElement({ map: m, position: at, title, content: el })
          drawn.current.push({ setMap: () => (marker.map = null) })
        }

        if (approachPath?.length) line(approachPath, APPROACH_COLOR, true)
        line(ridePath, RIDE_COLOR, false)
        pin(ridePath[0], 'A', PICKUP_COLOR, 'Pickup')
        pin(ridePath[ridePath.length - 1], 'B', RIDE_COLOR, 'Drop-off')
        if (approachPath?.length) pin(approachPath[0], '•', APPROACH_COLOR, 'You')

        m.fitBounds(bounds, 32)
      } catch (err) {
        console.warn('Google Maps failed to draw', err)
        if (live) setBroken(true)
      }
    })()

    return () => {
      live = false
    }
  }, [ridePath, approachPath])

  if (!available || broken || ride.status === 'off' || ride.status === 'failed') return null

  return (
    <div
      ref={box}
      role="region"
      aria-label="Route map"
      className={`overflow-hidden rounded-xl bg-slate-100 ${className ?? 'h-56 w-full sm:h-64'} ${ride.status === 'loading' ? 'animate-pulse' : ''}`}
    />
  )
}
