import React, { useEffect } from 'react';
import { DepartmentRoot } from './ProfessionalHubRoot.jsx';
import './professional-hub-native-host.css';

export default function ProfessionalHubNative({ language = 'vi' }) {
  useEffect(() => {
    document.documentElement.classList.remove('department-microfrontend-active');
    document.body.classList.remove('department-microfrontend-active');
  }, []);

  return (
    <section
      className="professional-hub-native-app"
      data-testid="professional-hub-native-app"
      data-language={language}
      aria-label={language === 'vi' ? 'Hub Chuyên môn' : 'Professional Hub'}
    >
      <DepartmentRoot />
    </section>
  );
}
