import { Check, Loader2, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CopyButton } from '../components/CopyButton'
import { loadLiveBundle, rememberLiveBundle, receivedLabel, showBuildStamp, type LiveBundle } from './buildStamp'
import { applyLiveUpdate, isNative } from './platform'

type UpdateStatus = 'idle' | 'working' | 'current' | 'unavailable'

function UpdateButton() {
  const [status, setStatus] = useState<UpdateStatus>('idle')

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-60"
      aria-label="Get the current website from Cloudflare"
      disabled={status === 'working'}
      onClick={() => {
        setStatus('working')
        void applyLiveUpdate().then((result) => {
          if (result === 'applied') return
          setStatus(result)
          setTimeout(() => setStatus('idle'), 1500)
        })
      }}
    >
      {status === 'working' ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : status === 'current' ? (
        <Check className="h-4 w-4" aria-hidden />
      ) : (
        <RefreshCw className="h-4 w-4" aria-hidden />
      )}
      {status === 'working' ? 'Checking' : status === 'current' ? 'Up to date' : status === 'unavailable' ? 'Failed' : 'Update'}
    </button>
  )
}

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
      <p className="mt-1 flex flex-wrap items-center gap-1">
        {info.sha ? (
          <span className="min-w-0 break-all font-mono text-[11px] text-slate-600">{info.sha}</span>
        ) : (
          <span>Commit hash is not in this build.</span>
        )}
        {info.sha ? <CopyButton text={info.sha} label="commit hash" /> : null}
        {isNative || import.meta.env.DEV ? <UpdateButton /> : null}
      </p>
    </div>
  )
}
