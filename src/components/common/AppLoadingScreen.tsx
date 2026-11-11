import React from 'react';

export const AppLoadingScreen: React.FC = () => {
  return (
    <div
      className="fixed inset-0 z-50 bg-[#FAF9F6] flex flex-col items-center justify-center p-6 selection:bg-brand-100"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Centered Expenso Logo */}
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[#12543F] shadow-elevated flex items-center justify-center p-5 ring-4 ring-[#12543F]/15 animate-pop-in">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" className="w-full h-full">
          <path
            d="M9 10h14M9 16h10M9 22h14M13 6v20"
            stroke="white"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};

export default AppLoadingScreen;

