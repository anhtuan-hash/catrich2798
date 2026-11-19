import React from 'react';
const STATE={issued:['Đã phát mã','Issued'],editing:['Đang làm','Editing'],submitted:['Đã nộp','Submitted'],ttcm_review:['Chờ duyệt','In review'],changes_requested:['Cần sửa','Changes requested'],approved_locked:['Đã duyệt','Approved'],published:['Đã công bố','Published'],rejected:['Trả lại','Returned']};

export default function MuseumWorkshopBoard({rows,language,editorial=false,asean=false,action,mobileAction}){
 const tr=(vi,en)=>language==='en'?en:vi;
 const hasTransfer=rows.some(row=>row.transfer!==null)||asean;
 const hasExit=rows.some(row=>row.transfer===null);
 const writingHeading=hasTransfer
  ?hasExit?tr('Bài cuối giờ','Final activity'):tr('Bài viết nhóm · Hoạt động 6','Group transfer card · Activity 6')
  :'Exit Ticket';
 const writingStatus=row=>row.transfer===null
  ?row.exit?tr('Đã nộp','Submitted'):tr('Chưa có','None')
  :row.transfer?tr('Đã có bản lưu','On file'):tr('Chưa có bài viết đã lưu','No saved writing');
 return (
  <div className="bml-frozen-board">
   <div className="bml-section-head"><div>{editorial
    ? <h2 id="asean-dossier-workshops">{tr('Bài thực hành theo nhóm','Group workshops')}</h2>
    : <><h3>{tr('Bảng bài thực hành','Student workshop board')}</h3>
       <p>{rows.length} {tr('nhóm · mỗi nhóm một bài đã đóng băng','groups · one frozen workshop each')}</p></>}</div></div>
   <div className="bml-frozen-table-wrap" role={editorial?'region':undefined}
    aria-labelledby={editorial?'asean-dossier-workshops':undefined} tabIndex={editorial?0:undefined}>
    <table className={'bml-frozen-table'+(mobileAction?' asean-dossier-mobile-table':'')} aria-labelledby={editorial?'asean-dossier-workshops':undefined}>
     <thead><tr><th scope="col">#</th><th scope="col">{tr('Nhóm','Group')}</th><th scope="col">{tr('Lớp','Class')}</th><th scope="col">{tr('Bảo tàng','Museum')}</th><th scope="col">{writingHeading}</th>{action&&<th scope="col">{action.label}</th>}
      {mobileAction&&<th scope="col" className="asean-dossier-mobile-cell">{mobileAction.label}</th>}</tr></thead>
     <tbody>{rows.map((row,index)=><tr key={row.id}><td>{String(index+1).padStart(2,'0')}</td><td>{row.label}</td><td>{row.classScope}</td><td>{STATE[row.state]?.[language==='en'?1:0]||row.state||'—'}</td><td>{writingStatus(row)}</td>
       {action&&<td>{action.render(row)}</td>}
       {mobileAction&&<td className="asean-dossier-mobile-cell">{mobileAction.render(row)}</td>}</tr>)}{!rows.length?<tr><td colSpan={5+Number(Boolean(action))+Number(Boolean(mobileAction))}>{tr('Chưa có bài thực hành theo nhóm.','No group workshops are available yet.')}</td></tr>:null}</tbody>
    </table>
   </div>
  </div>
 );
}
