import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import EventPopupMotionAdmin from '../../src/components/admin/EventPopupMotionAdmin.jsx';
function Harness(){
 const [motion,setMotion]=useState({enter:'flip',exit:'flip',speed:'gentle'});
 return <EventPopupMotionAdmin value={motion} onChange={setMotion} language="vi"/>;
}
const root=createRoot(document.getElementById('react-root'));
root.render(<Harness/>);
window.__eventPreviewMounted=true;
