import { useTranslation } from 'react-i18next'

const SECTIONS: { title: string; html: string }[] = [
  {
    title: 'Ad terms and conditions',
    html: `These Ad Terms and Conditions ("Ad Terms") govern the creation, submission and display of advertising content ("Ad") on the <strong>Piketplace</strong> platform ("Service"). By submitting an Ad, you agree to be bound by these Ad Terms, in addition to the general Terms of Service.<br />
    If you do not agree with these Ad Terms, you may not create or submit an Ad on the Service.`,
  },
  {
    title: 'Ad content',
    html: `You are solely responsible for the content of your Ad, including its text, images and any other material, and for ensuring that it is accurate, lawful and appropriate.<br />
    You represent and warrant that: (i) you have the right to use all material included in your Ad; (ii) your Ad does not contain misleading, false or deceptive information; (iii) your Ad does not offer products or services that are prohibited or restricted by law or by the Service; and (iv) your Ad does not infringe the rights of any person or entity.`,
  },
  {
    title: 'Review and approval',
    html: `All Ads are subject to review by <strong>Piketplace</strong> before publication. Ads are only displayed after they have been paid for and validated. We reserve the right to reject or remove any Ad that does not comply with these Ad Terms or that we consider, in our sole discretion, to be inappropriate.`,
  },
  {
    title: 'Payment and validity',
    html: `The price of an Ad depends on the period selected at submission. An Ad is only displayed once its payment has been received. The validity period of the Ad is defined by the period chosen when the Ad is created.`,
  },
  {
    title: 'Renewal and resubmission',
    html: `You may submit a new Ad only as authorised by the Service. An unpaid Ad, or a paid Ad that is awaiting review or has been rejected, prevents the creation of a new Ad until it is paid, approved or deleted.`,
  },
  {
    title: 'Prohibited content',
    html: `The following categories are <strong>prohibited</strong> and Ads promoting them will not be accepted:<br />
    <ul class="list-disc pl-5">
      <li>Adult content — including sex, pornography, nudity and sexual services;</li>
      <li>Illegal drugs — including drugs, substances and drug paraphernalia;</li>
      <li>Alcohol and tobacco products;</li>
      <li>Prescription-only medicines and pharmaceutical products;</li>
      <li>Gambling, casinos and betting services;</li>
      <li>Weapons, firearms, ammunition and explosives;</li>
      <li>Violence, hate content and discrimination;</li>
      <li>Harassment and personal attacks;</li>
      <li>Misleading, false or deceptive content;</li>
      <li>Counterfeit goods and intellectual property infringement;</li>
      <li>Malware, viruses, phishing and hacking content;</li>
      <li>Get-rich-quick schemes and fraudulent offers.</li>
    </ul>
    You agree not to submit any Ad that: (i) is illegal, threatening, fraudulent or harmful; (ii) contains indecent, offensive or prohibited material; (iii) attempts to impersonate another person or entity; or (iv) otherwise violates the general Terms of Service or these Ad Terms. We reserve the right to edit or remove any Ad for any reason at any time.`,
  },
  {
    title: 'Non-refundable ads',
    html: `Paid Ads are <strong>not refundable</strong> when they relate to sex, drugs or any other content or product that is not authorized and listed in the prohibited categories above. Please review that list of prohibited categories before paying for your Ad.<br />
    No refund or credit will be issued for any Ad that is rejected, removed or taken down because its content falls within a prohibited category.`,
  },
  {
    title: 'Limitation of liability',
    html: `To the maximum extent permitted by law, <strong>Piketplace</strong> shall not be liable for any direct, indirect, incidental or consequential damages arising from the submission, review, display or removal of an Ad.`,
  },
  {
    title: 'Changes to these Ad Terms',
    html: `We may amend these Ad Terms at any time by posting the amended terms on this page. Your continued use of the Service after the posting of revised Ad Terms means that you accept and agree to the changes.`,
  },
  {
    title: 'Contact us',
    html: `For any question regarding these Ad Terms, please contact us by email at <strong>support@piketplace.com</strong>.`,
  },
]

export default function AdTermsPage() {
  const { t } = useTranslation()
  return (
    <div className="relative animate-fade-in">
      <section className="px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">
            {t('ad_terms_page_title', { defaultValue: 'Ad terms and conditions' })}
          </h2>
        </div>
        <div className="my-3 h-px bg-black/10" />
        <div>
          {SECTIONS.map((section) => (
            <div key={section.title} className="mb-5">
              <h3 className="mb-2 text-base font-bold text-primary-dark">{section.title}</h3>
              <div
                className="text-xs leading-relaxed text-ink-soft"
                dangerouslySetInnerHTML={{ __html: section.html }}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}