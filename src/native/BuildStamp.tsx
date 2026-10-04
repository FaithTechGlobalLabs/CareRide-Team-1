import { useEffect, useState } from 'react'
import { CopyButton } from '../components/CopyButton'
import { loadLiveBundle, rememberLiveBundle, receivedLabel, showBuildStamp, type LiveBundle } from './buildStamp'
import { isNative } from './platform'

export function BuildStamp({ className = '' }: { className?: string }) {
  const [info, setInfo] = useState<LiveBundle | null>(() => (showBuildStamp() ? rememberLiveBundle() : null))

  useEffect(() => {
    if (!showBuildStamp()) return
    void loadLiveBundle().then(setInfo)
  }, [])

  if (!showBuildStamp() || !info) return null

  return (
    <div className={`text-xs leading-relaxed text-slate-500 ${className}`}>
      <p>
        {isNative
          ? `This phone received this version ${receivedLabel(info.receivedAt)}.`
          : `This build ${receivedLabel(info.receivedAt)}.`}
      </p>
      {info.sha ? (
        <p className="mt-1 flex items-start gap-1">
          <span className="min-w-0 break-all font-mono text-[11px] text-slate-600">{info.sha}</span>
          <CopyButton text={info.sha} label="commit hash" />
        </p>
      ) : (
        <p className="mt-1">Commit hash is not in this build.</p>
      )}
    </div>
  )
}
