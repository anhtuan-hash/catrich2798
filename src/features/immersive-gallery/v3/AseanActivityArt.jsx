import React from 'react';
import {ArrowRight, Binoculars, ClipboardCheck, Compass, Footprints, Globe2, Landmark, MapPin, MessageSquareQuote, PencilLine, ScanSearch, Send} from 'lucide-react';
import {ASEAN_FRAMES} from './aseanLesson.js';
import './aseanActivityArt.css';

const frameIcons = [MapPin, Binoculars, Compass];
const sceneIcons = [Landmark, Footprints, Compass];
const questionsVi = ['Ở đâu?', 'Có thể làm gì?', 'Cần lưu ý gì?'];

export default function AseanActivityArt({activity, language = 'en', revisionCaptured = false, revisionHasFeedback = true, visitorResult = null}) {
 const vi = language === 'vi';
 const t = (vn, en) => vi ? vn : en;
 const question = i => vi ? questionsVi[i] : ASEAN_FRAMES[i].question;
 let graphic;
 switch (activity) {
 case 'discover':
  graphic = <>
   <div className="asean-art-globe" aria-hidden="true"><Globe2/><MapPin/></div>
   <ul className="asean-art-questions">{frameIcons.map((Icon, i) => <li key={ASEAN_FRAMES[i].key}><Icon aria-hidden="true"/><span>{question(i)}</span></li>)}</ul>
  </>;
  break;
 case 'select':
  graphic = <ul className="asean-art-contact">{sceneIcons.map((Icon, i) => <li key={ASEAN_FRAMES[i].key}>
   <div className="asean-art-photo" aria-hidden="true"><Icon/></div>
   <strong lang="en">{ASEAN_FRAMES[i].label}</strong><small>{question(i)}</small>
  </li>)}</ul>;
  break;
 case 'build':
  graphic = <div className="asean-art-room">
   <div className="asean-art-room-wall">{sceneIcons.map((Icon, i) => <div key={ASEAN_FRAMES[i].key}><Icon aria-hidden="true"/><strong lang="en">{ASEAN_FRAMES[i].label}</strong></div>)}</div>
   <div className="asean-art-room-floor" aria-hidden="true"/>
  </div>;
  break;
 case 'visit':
  graphic = <>
   <ul className="asean-art-route">{frameIcons.map((Icon, i) => <li key={ASEAN_FRAMES[i].key}><span className="asean-art-pin"><Icon aria-hidden="true"/></span><strong lang="en">{ASEAN_FRAMES[i].label}</strong></li>)}</ul>
   <div className="asean-art-ticket"><ScanSearch aria-hidden="true"/><span>{t('Câu trả lời · Số khung · Góp ý', 'Answer · Frame number · Suggestion')}</span>
    <strong>{visitorResult===null?t('Tối đa 3 điểm','Max 3 points'):t('Kết quả tham quan','Visit result')+' · '+visitorResult}</strong>
   </div>
  </>;
  break;
 case 'revise':
  graphic = <div className="asean-art-proof">
   <div><strong>V1</strong><MessageSquareQuote aria-hidden="true"/><span>{revisionCaptured
    ?t('Xem lại chú thích V1', 'Review the V1 caption')
    :revisionHasFeedback?t('Đọc góp ý', 'Read the feedback'):t('Xem lại điểm chưa rõ', 'Find an unclear detail')}</span></div>
   <ArrowRight aria-hidden="true"/>
   <div><strong>V2</strong><PencilLine aria-hidden="true"/><span>{revisionCaptured
    ?t('Đối chiếu và thử lại', 'Compare and retest'):t('Sửa và thử lại', 'Revise and retest')}</span></div>
  </div>;
  break;
 case 'share':
  graphic = <div className="asean-art-deliver">
   <div><Send aria-hidden="true"/><strong>{t('Nộp phòng 3D', 'Submit your 3D room')}</strong></div>
   <div><ClipboardCheck aria-hidden="true"/><strong lang="en">Visitors can …<br/>Visitors should …</strong></div>
  </div>;
  break;
 default:
  return null;
 }
 return <div className={'asean-activity-art asean-activity-art--'+activity}>{graphic}</div>;
}

export function AseanFrameIcon({index}) {
 const Icon = frameIcons[index];
 return <Icon aria-hidden="true"/>;
}
