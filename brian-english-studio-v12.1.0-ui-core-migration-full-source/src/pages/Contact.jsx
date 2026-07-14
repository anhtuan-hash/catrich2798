import React from 'react';
import SectionHeader from '../components/SectionHeader.jsx';
import RouteHero from '../components/RouteHero.jsx';

export default function Contact({ language }) {
  return (
    <div className="page narrow">
      <RouteHero
        eyebrow="Contact"
        title={language === 'vi' ? 'Kết nối • Hỗ trợ • Chính sách' : 'Connect • Support • Policies'}
        description={language === 'vi' ? 'Liên hệ hỗ trợ, mở nhanh tài nguyên chính sách và kết nối với hệ sinh thái Brian English Studio.' : 'Reach support, open policy resources and connect with the Brian English Studio ecosystem.'}
        primary={{ label: 'Email', onClick: () => window.location.href = 'mailto:your-email@example.com' }}
        secondary={{ label: language === 'vi' ? 'Mở ứng dụng' : 'Open apps', onClick: () => (window.location.hash = '#/apps') }}
        stats={[
          { label: language === 'vi' ? 'kênh hỗ trợ' : 'support channels', value: 5, tone: 'pink' },
          { label: language === 'vi' ? 'chính sách' : 'policies', value: 2, tone: 'blue' },
        ]}
        tiles={[
          { icon: '💌', title: language === 'vi' ? 'Gửi phản hồi' : 'Send feedback', text: language === 'vi' ? 'Trao đổi ý tưởng, báo lỗi và yêu cầu hỗ trợ.' : 'Share ideas, bug reports and support requests.', tone: 'pink' },
          { icon: '🔐', title: language === 'vi' ? 'Chính sách' : 'Policies', text: language === 'vi' ? 'Mở nhanh trang quyền riêng tư và điều khoản sử dụng.' : 'Open privacy and terms pages quickly.', tone: 'blue' },
        ]}
        accent="pink"
        icon="💬"
      />
      <section className="panel contact-panel">
        <div className="contact-avatar">BE</div>
        <div>
          <h2>Brian English</h2>
          <p>{language === 'vi' ? 'Web apps, classroom games and AI tools for English teaching.' : 'Web apps, classroom games and AI tools for English teaching.'}</p>
          <div className="contact-buttons">
            <a href="mailto:your-email@example.com">Email</a>
            <a href="#/apps">Web Apps</a>
            <a href="#/resources">Resources</a>
            <a href="/legal/privacy.html" target="_blank" rel="noreferrer">Privacy</a>
            <a href="/legal/terms.html" target="_blank" rel="noreferrer">Terms</a>
          </div>
        </div>
      </section>
    </div>
  );
}
