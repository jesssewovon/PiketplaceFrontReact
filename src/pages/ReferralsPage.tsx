import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ReferredUser } from '../types'
import { fetchReferredUsers } from '../lib/api'
import { flagEmoji } from '../lib/geo'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'

export default function ReferralsPage() {
  const { t } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)

  const [keyword, setKeyword] = useState('')
  const [users, setUsers] = useState<ReferredUser[]>([])
  const [totalFound, setTotalFound] = useState(0)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(2)
  const [noMoreData, setNoMoreData] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const pageRef = useRef(1)
  const lastPageRef = useRef(2)
  const loadingRef = useRef(false)

  const loadUsers = useCallback(
    async (targetPage: number, search: string) => {
      if (loadingRef.current) return
      loadingRef.current = true
      if (targetPage === 1) setIsLoading(true)
      setIsLoadingMore(true)
      try {
        const res = await fetchReferredUsers(token ?? undefined, search, targetPage)
        const pagination = res.referred_users
        const list = pagination?.data ?? []
        setUsers((prev) => (targetPage === 1 ? list : [...prev, ...list]))
        setTotalFound(pagination?.total ?? list.length)
        setLastPage(pagination?.last_page ?? 2)
        lastPageRef.current = pagination?.last_page ?? 2
        setPage(targetPage)
        pageRef.current = targetPage
      } catch {
        if (targetPage === 1) setUsers([])
      } finally {
        loadingRef.current = false
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [token],
  )

  useEffect(() => {
    if (!isLoggedIn) return
    const timer = window.setTimeout(() => {
      setNoMoreData(false)
      void loadUsers(1, keyword)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [keyword, isLoggedIn, loadUsers])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        if (pageRef.current >= lastPageRef.current) {
          setNoMoreData(true)
          return
        }
        void loadUsers(pageRef.current + 1, keyword)
      },
      { rootMargin: '200px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [keyword, loadUsers])

  if (!isLoggedIn) {
    return <LoginPanel />
  }

  return (
    <div className="animate-fade-in">
      <section className="px-4 py-6">
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-soft">
          <h4 className="flex items-center gap-2 text-sm font-bold text-ink">
            <svg width="20px" height="20px" viewBox="0 -0.5 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M14.875 7.375C14.875 8.68668 13.8117 9.75 12.5 9.75C11.1883 9.75 10.125 8.68668 10.125 7.375C10.125 6.06332 11.1883 5 12.5 5C13.8117 5 14.875 6.06332 14.875 7.375Z" stroke="#a63289" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path fillRule="evenodd" clipRule="evenodd" d="M17.25 15.775C17.25 17.575 15.123 19.042 12.5 19.042C9.877 19.042 7.75 17.579 7.75 15.775C7.75 13.971 9.877 12.509 12.5 12.509C15.123 12.509 17.25 13.971 17.25 15.775Z" stroke="#a63289" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path fillRule="evenodd" clipRule="evenodd" d="M19.9 9.55301C19.9101 10.1315 19.5695 10.6588 19.0379 10.8872C18.5063 11.1157 17.8893 11 17.4765 10.5945C17.0638 10.189 16.9372 9.57418 17.1562 9.03861C17.3753 8.50305 17.8964 8.1531 18.475 8.15301C19.255 8.14635 19.8928 8.77301 19.9 9.55301V9.55301Z" stroke="#a63289" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path fillRule="evenodd" clipRule="evenodd" d="M5.10001 9.55301C5.08986 10.1315 5.43054 10.6588 5.96214 10.8872C6.49375 11.1157 7.11072 11 7.52347 10.5945C7.93621 10.189 8.06278 9.57418 7.84376 9.03861C7.62475 8.50305 7.10363 8.1531 6.52501 8.15301C5.74501 8.14635 5.10716 8.77301 5.10001 9.55301Z" stroke="#a63289" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('members', { defaultValue: 'Members' })}
          </h4>

          <div className="relative mt-2">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="h-9 w-full rounded-full border border-slate-300 bg-white/70 pl-3 pr-9 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          </div>

          {!isLoading && !isLoadingMore && (
            <span className="text-xs text-ink-soft">
              {t('nb_found', {
                defaultValue: '{nb} found(s)',
                nb: totalFound,
              })}
            </span>
          )}

          <div className="mt-3 space-y-1">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between rounded-xl px-1 py-2 transition hover:bg-mist/60">
                <div className="flex min-w-0 items-center gap-2.5">
                  <img
                    src={user.avatar}
                    alt={user.username ?? ''}
                    className="h-[30px] w-[30px] shrink-0 rounded-[40%] object-cover"
                  />
                  <span className="truncate text-[11px] font-medium text-ink">@{user.username}</span>
                </div>
                <span className="shrink-0 text-xs text-ink-soft">
                  {user.locale}
                  {flagEmoji(user.user_country?.iso2 ?? '')}
                </span>
              </div>
            ))}
          </div>

          <div ref={sentinelRef} />

          {isLoading && (
            <div className="flex flex-col items-center gap-1 pt-4 text-xs text-ink-soft">
              <img src="/site_images/index_loader.gif" alt="" className="w-[70px] rounded-sm" />
              {t('loading', { defaultValue: 'loading' })}
            </div>
          )}

          {noMoreData && (
            <div className="mt-4 rounded-xl py-2.5 text-center text-[13px] font-semibold text-ink">
              {t('no_more_data', { defaultValue: 'No more data' })}
            </div>
          )}

          {isLoadingMore && !isLoading && (
            <Loader2 size={18} className="mx-auto animate-spin text-primary" />
          )}
        </div>
      </section>
    </div>
  )
}
