import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { isNative, openExternal } from './platform'

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }

export function ExternalLink({ href, onClick, ...props }: Props) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    if (e.defaultPrevented || !isNative) return
    e.preventDefault()
    void openExternal(href)
  }

  return <a href={href} onClick={handleClick} {...props} />
}
