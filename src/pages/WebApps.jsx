import React from 'react';
import WebAppsBase from './WebAppsBase.jsx';
import CustomAppsExtension from './CustomAppsExtension.jsx';
import '../ui-core/styles/apps-custom-sharing-v12410.css';
import '../ui-core/styles/apps-dialog-actions-visible.css';

export default function WebApps(props) {
  return (
    <>
      <WebAppsBase {...props} />
      <CustomAppsExtension language={props.language || 'vi'} currentUser={props.currentUser} />
    </>
  );
}
