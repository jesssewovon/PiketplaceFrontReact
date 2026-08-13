import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const FAQ_ITEMS = [
  {
    q: 'What is Piketplace?',
    a: 'A marketplace platform based on Pi Network',
  },
  {
    q: 'How to mine Piket?',
    a: 'Go to My account and search Mining',
  },
]

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index
            return (
              <div key={item.q} className="border-b border-black/5 last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                >
                  <span className="text-sm font-bold text-ink">{item.q}</span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-ink-soft transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="px-4 pb-4 text-xs leading-relaxed text-ink-soft">{item.a}</p>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
