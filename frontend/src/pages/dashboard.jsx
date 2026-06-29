import React from 'react';
import Hero from '../components/Hero';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import DashboardPreview from '../components/DashboardPreview';

export default function Dashboard() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <DashboardPreview />
    </>
  );
}