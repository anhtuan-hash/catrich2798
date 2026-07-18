import React from 'react';
import HomeApproved3DGraphic from './HomeApproved3DGraphic.jsx';

export default function HomeExactGraphic({ type }) {
  const mappedType = type === 'listening' ? 'pronunciation' : type === 'ai' ? 'speaking' : type;
  return <HomeApproved3DGraphic type={mappedType}/>;
}
