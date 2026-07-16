import React from 'react';
import AppCard from '../components/AppCard.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import ApiNotice from '../components/ApiNotice.jsx';
import RouteHero from '../components/RouteHero.jsx';
import { UILaunchGrid, UILaunchHero, UILaunchPage, UILaunchStage } from '../ui-core/components/UILaunch.jsx';

export default function SpecialTools({ tools, language, hasApiKey, currentUser }) {
  return (
    <UILaunchPage app="tools" className="page narrow">
      <UILaunchHero as="div" className="bui-launch-route-hero">
      <RouteHero
        eyebrow="Special Tools"
        title={language === 'vi' ? 'Công cụ hỗ trợ giáo viên' : 'Teacher support tools'}
        description={language === 'vi' ? 'Soạn bài, tạo nội dung, thiết kế giờ dạy và xử lý tác vụ nhanh trong một không gian Metro phẳng, thống nhất.' : 'Plan lessons, generate content and handle fast teaching tasks in one flat, unified Metro workspace.'}
        primary={{ label: language === 'vi' ? 'Mở công cụ' : 'Open tools', onClick: () => window.scrollTo({ top: 420, behavior: 'smooth' }) }}
        secondary={{ label: language === 'vi' ? 'Mở ứng dụng' : 'Open apps', onClick: () => (window.location.hash = '#/apps') }}
        stats={[
          { label: language === 'vi' ? 'công cụ hiện có' : 'active tools', value: tools.length, tone: 'orange' },
          { label: language === 'vi' ? 'AI khả dụng' : 'AI status', value: hasApiKey ? 'ON' : 'OFF', tone: 'blue' },
        ]}
        tiles={[
          { icon: '🧰', title: language === 'vi' ? 'Soạn nhanh' : 'Fast drafting', text: language === 'vi' ? 'Tạo kế hoạch dạy, prompt mẫu và hoạt động hỗ trợ.' : 'Generate lesson plans, prompts and supporting tasks.', tone: 'orange' },
          { icon: '🪄', title: language === 'vi' ? 'Tác vụ thông minh' : 'Smart tasks', text: language === 'vi' ? 'Xử lý nhanh công việc lớp học và tổ chuyên môn.' : 'Handle classroom and department workflows quickly.', tone: 'purple' },
        ]}
        accent="orange"
        icon="🧰"
      />
      </UILaunchHero>
      <ApiNotice language={language} hasApiKey={hasApiKey} />
      {tools.length ? (
        <UILaunchGrid as="div" className="card-grid two">
          {tools.map((item) => <AppCard key={item.slug} item={item} language={language} currentUser={currentUser} />)}
        </UILaunchGrid>
      ) : (
        <UILaunchStage className="metro-panel empty-state">
          <h2>{language === 'vi' ? 'Các ứng dụng công cụ đã được chuyển sang thẻ Ứng dụng' : 'Tool apps have been moved to the Apps tab'}</h2>
          <p>{language === 'vi' ? 'Lesson Architect hiện nằm trong lưới Ứng dụng để giáo viên mở nhanh hơn.' : 'Lesson Architect now appears in the Apps grid for faster access.'}</p>
          <button className="primary" onClick={() => (window.location.hash = '#/apps')}>{language === 'vi' ? 'Mở thẻ Ứng dụng' : 'Open Apps'}</button>
        </UILaunchStage>
      )}
    </UILaunchPage>
  );
}
