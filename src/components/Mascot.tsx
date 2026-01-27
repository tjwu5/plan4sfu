import mascotDefault from '../assets/mascot/mascot-default.png'
import mascotPointing from '../assets/mascot/mascot-pointing.png'
import mascotSleeping from '../assets/mascot/mascot-sleeping.png'

type MascotVariant = 'default' | 'pointing' | 'sleeping'

type MascotProps = {
  variant?: MascotVariant
  size?: number | string
  className?: string
  alt?: string
}

const variantMap: Record<MascotVariant, string> = {
  default: mascotDefault,
  pointing: mascotPointing,
  sleeping: mascotSleeping,
}

export default function Mascot({
  variant = 'default',
  size = 140,
  className = '',
  alt = 'Plan4SFU mascot',
}: MascotProps) {
  const style =
    typeof size === 'number'
      ? { width: `${size}px`, height: 'auto' }
      : { width: size, height: 'auto' }
  return (
    <img
      src={variantMap[variant]}
      alt={alt}
      className={`mascot ${className}`.trim()}
      style={style}
    />
  )
}
