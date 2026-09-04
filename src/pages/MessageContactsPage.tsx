import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Search, ShoppingBasket } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { MessageContact } from '../types'
import { fetchMessageContacts } from '../lib/api'
import { formatDate } from '../lib/format'
import { useAppSelector } from '../store/hooks'
import LoginPanel from '../components/LoginPanel'

export default function MessageContactsPage() {
  const { t } = useTranslation()
  const isLoggedIn = useAppSelector((state) => state.auth.isLoggedIn)
  const token = useAppSelector((state) => state.auth.token)

  const [contacts, setContacts] = useState<MessageContact[]>([])
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [noMoreData, setNoMoreData] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const lockRef = useRef(false)
  const searchRef = useRef(search)
  searchRef.current = search

  const getContacts = useCallback(
    async (page: number, append: boolean) => {
      if (!isLoggedIn || lockRef.current) return
      lockRef.current = true
      if (append) setIsLoadingMore(true)
      try {
        const res = await fetchMessageContacts(token ?? undefined, {
          page,
          search: searchRef.current || undefined,
        })
        const pagination = res.contacts
        if (append) {
          setContacts((prev) => {
            const seen = new Set(prev.map((contact) => contact.id))
            const fresh = (pagination.data ?? []).filter((contact) => !seen.has(contact.id))
            return [...prev, ...fresh]
          })
        } else {
          setContacts(pagination.data ?? [])
        }
        setCurrentPage(page)
        setLastPage(pagination.last_page ?? page)
        setNoMoreData(page >= (pagination.last_page ?? page))
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('an_error_occured', { defaultValue: 'An error occurred' }))
      } finally {
        lockRef.current = false
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [isLoggedIn, token, t],
  )

  useEffect(() => {
    if (!isLoggedIn) return
    setContacts([])
    setCurrentPage(1)
    setLastPage(1)
    setNoMoreData(false)
    setIsLoading(true)
    void getContacts(1, false)
  }, [isLoggedIn, getContacts])

  const launchSearch = () => {
    setContacts([])
    setCurrentPage(1)
    setLastPage(1)
    setNoMoreData(false)
    setIsLoading(true)
    void getContacts(1, false)
  }

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0]?.isIntersecting &&
          !isLoading &&
          !isLoadingMore &&
          !noMoreData &&
          currentPage < lastPage
        ) {
          void getContacts(currentPage + 1, true)
        }
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [currentPage, lastPage, isLoading, isLoadingMore, noMoreData, getContacts])

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        <div className="mt-3">
          <div className="flex items-center">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') launchSearch()
              }}
              placeholder={t('search', { defaultValue: 'Search…' })}
              className="h-[30px] w-full rounded-full border border-gray-400 bg-white/70 px-4 pr-10 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={launchSearch}
              className="-ml-9 flex h-[30px] w-8 items-center justify-center rounded-full text-ink-soft transition hover:text-primary"
              aria-label={t('search', { defaultValue: 'Search' })}
            >
              <Search size={16} />
            </button>
          </div>
        </div>

        <div className="mt-4 min-h-[200px]">
          {error && contacts.length === 0 && (
            <p className="rounded-xl bg-red-50 p-3 text-center text-xs font-medium text-red-600">{error}</p>
          )}
          {contacts.length > 0 ? (
            contacts.map((contact) => {
              const date = contact.last_message?.created_at ?? contact.created_at
              const lastMessage = contact.last_message
              return (
                <div key={contact.id}>
                  <Link
                    to={`/messages/${contact.product?.pi_users_id ?? ''}/${contact.id}`}
                    className="flex items-start gap-3 py-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/30 text-primary">
                      <ShoppingBasket size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold text-ink">
                          {contact.reference ?? contact.id}
                        </p>
                        {date && (
                          <span className="shrink-0 text-[10px] text-ink-soft">{formatDate(date)}</span>
                        )}
                      </div>
                      {lastMessage && (
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <p className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">
                            {lastMessage.isImage
                              ? `${t('picture', { defaultValue: 'Image' })} ${lastMessage.imageName ?? ''}`
                              : (lastMessage.message ?? '')}
                          </p>
                          {contact.messages_count ? (
                            <span
                              className={`flex shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ${
                                contact.messages_count > 10 ? 'h-5 px-1.5' : 'h-[18px] min-w-[18px] px-1'
                              }`}
                            >
                              {contact.messages_count > 10 ? '10+' : contact.messages_count}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="mb-2 h-px bg-black/5" />
                </div>
              )
            })
          ) : (
            !isLoading && !error && (
              <p className="py-8 text-center text-xs font-medium text-ink-soft">
                {t('no_data', { defaultValue: 'No data' })}
              </p>
            )
          )}
          <div ref={sentinelRef} className="flex justify-center py-6">
            {isLoading || isLoadingMore ? (
              <Loader2 size={20} className="animate-spin text-primary" />
            ) : noMoreData && contacts.length > 0 ? (
              <span className="text-[11px] font-medium text-ink-soft">
                {t('no_more_data', { defaultValue: 'No more data' })}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {!isLoggedIn && <LoginPanel />}
    </div>
  )
}
