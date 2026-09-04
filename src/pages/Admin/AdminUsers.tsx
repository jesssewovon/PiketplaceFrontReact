import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AdminUser } from '../../types'
import { fetchAdminUsers } from '../../lib/api'
import { flagEmoji } from '../../lib/geo'
import { useAppSelector } from '../../store/hooks'
import LoginPanel from '../../components/LoginPanel'

export default function AdminUsersPage() {
  const { t } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)

  const [keyword, setKeyword] = useState('')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [totalFound, setTotalFound] = useState(0)
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
        const res = await fetchAdminUsers(token ?? undefined, search, targetPage)
        const pagination = res.users
        const list = pagination?.data ?? []
        setUsers((prev) => (targetPage === 1 ? list : [...prev, ...list]))
        setTotalFound(pagination?.total ?? list.length)
        lastPageRef.current = pagination?.last_page ?? 2
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
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-soft">
          <h4 className="text-base font-bold text-ink">
            {t('admin.users', { defaultValue: 'Utilisateurs' })}
          </h4>

          <div className="relative mt-2">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="h-[35px] w-full rounded-[21px] border border-primary bg-gray-200/80 pl-3 pr-9 text-sm text-ink outline-none transition focus:bg-white focus:ring-2 focus:ring-primary/20"
            />
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          </div>

          {!isLoading && !isLoadingMore && (
            <span className="mt-1 block text-xs text-ink-soft">
              {t('admin.registered_users', {
                defaultValue: '{nb} registered users',
                nb: totalFound,
              })}
            </span>
          )}

          <div className="mt-2 h-px bg-black/5" />

          {users.length > 0 && (
            <div className="mt-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex min-w-0 items-center gap-2.5 rounded-xl px-1 py-2 transition hover:bg-mist/60"
                >
                  <img
                    src={user.avatar}
                    alt={user.username ?? ''}
                    className="h-[30px] w-[30px] shrink-0 rounded-[40%] object-cover"
                  />
                  <span className="truncate text-[11px] font-medium text-ink">
                    @{user.username}
                    {user.fullname ? ` / ${user.fullname}` : ''}
                    <span className="text-ink-soft">|ads: {user.number_ads_views ?? 0}</span>
                  </span>
                  <span className="shrink-0 text-xs text-ink-soft">
                    {user.locale}
                    {flagEmoji(user.user_country?.iso2 ?? '')}
                  </span>
                </div>
              ))}
              <div ref={sentinelRef} />
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center gap-1 pt-4 text-xs text-ink-soft">
              <img src="/site_images/index_loader.gif" alt="" className="w-[70px] rounded-sm" />
              {t('loading', { defaultValue: 'loading' })}
            </div>
          )}

          {!isLoading && !isLoadingMore && users.length === 0 && (
            <p className="py-6 text-center text-xs font-medium text-ink-soft">
              {t('no_data', { defaultValue: 'No data' })}
            </p>
          )}

          {noMoreData && users.length > 0 && (
            <div className="mt-4 rounded-xl py-2.5 text-center text-[13px] font-semibold text-ink">
              {t('no_more_data', { defaultValue: 'No more data' })}
            </div>
          )}

          {isLoadingMore && !isLoading && (
            <Loader2 size={18} className="mx-auto mt-2 animate-spin text-primary" />
          )}
        </div>
      </section>
    </div>
  )
}