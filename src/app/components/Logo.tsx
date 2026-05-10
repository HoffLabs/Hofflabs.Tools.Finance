import { DEFAULT_LOGO_URL } from './BrandingProvider'

export default function Logo({ size = 32, className = "", src }: { size?: number; className?: string; src?: string }) {
  return (
    <img
      src={src || DEFAULT_LOGO_URL}
      alt="Logo"
      width={size}
      height={size}
      className={`rounded ${className}`}
      style={{ objectFit: 'contain' }}
    />
  )
}
