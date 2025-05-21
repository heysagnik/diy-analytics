import React, { useState } from 'react';
import { XIcon, CheckCircleIcon, CopyIcon, CaretRightIcon, CaretLeftIcon } from '@phosphor-icons/react';
import { defaultTheme } from '@/utils/theme';

interface TrackingCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackingScript: string;
}

// Step content components for cleaner separation
interface InstallationStepProps {
  trackingScript: string;
  onCopy: () => void;
  copied: boolean;
}

const InstallationStep = ({ trackingScript, onCopy, copied }: InstallationStepProps) => (
  <div className="space-y-4">
    <h3 className="text-base font-medium" style={{ color: defaultTheme.accent }}>
      Add tracking code to your website
    </h3>
    <p style={{ color: defaultTheme.textLight }}>
      Include this script in the <code className="px-1 py-0.5 rounded-md" style={{ backgroundColor: defaultTheme.lightAccent, color: defaultTheme.accent }}>&lt;head&gt;</code> section:
    </p>
    
    <div className="relative">
      <pre className="p-4 rounded-2xl text-sm overflow-x-auto whitespace-pre-wrap break-all" 
           style={{ backgroundColor: defaultTheme.accent, color: '#ffffff' }}>
        {trackingScript}
      </pre>
      
      <button
        onClick={onCopy}
        className="absolute top-3 right-3 rounded-full p-2 transition-colors"
        style={{ backgroundColor: defaultTheme.primary, color: 'white' }}
        title="Copy to clipboard"
        aria-label="Copy to clipboard"
      >
        {copied ? <CheckCircleIcon size={20} weight="fill" /> : <CopyIcon size={20} />}
      </button>
    </div>
  </div>
);

const VerificationStep = () => (
  <div className="space-y-4">
    <h3 className="text-base font-medium" style={{ color: defaultTheme.accent }}>
      Verify installation
    </h3>
    <div className="p-4 rounded-xl" style={{ backgroundColor: defaultTheme.lightAccent }}>
      <p style={{ color: defaultTheme.accent }}>After adding the tracking code:</p>
      <ul className="mt-2 space-y-2">
        <li className="flex items-center gap-2" style={{ color: defaultTheme.textLight }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: defaultTheme.primary }}></span>
          Visit your website
        </li>
        <li className="flex items-center gap-2" style={{ color: defaultTheme.textLight }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: defaultTheme.primary }}></span>
          Wait a few minutes for data collection
        </li>
        <li className="flex items-center gap-2" style={{ color: defaultTheme.textLight }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: defaultTheme.primary }}></span>
          Check your analytics dashboard
        </li>
      </ul>
    </div>
  </div>
);

const CustomEventsStep = () => (
  <div className="space-y-4">
    <h3 className="text-base font-medium" style={{ color: defaultTheme.accent }}>
      Track custom events (optional)
    </h3>
    <p style={{ color: defaultTheme.textLight }}>
      Add this code where you want to trigger custom events:
    </p>
    <pre className="p-4 rounded-xl text-sm overflow-x-auto" 
         style={{ backgroundColor: defaultTheme.accent, color: '#ffffff' }}>
      {`// Track a custom event
trackEvent('event_name', {
  property1: 'value1',
  property2: 'value2'
});`}
    </pre>
  </div>
);

const TrackingCodeModal: React.FC<TrackingCodeModalProps> = ({ isOpen, onClose, trackingScript }) => {
  const [copied, setCopied] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trackingScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy text:', err);
      alert('Failed to copy tracking code. Please try again.');
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" 
         role="dialog" aria-modal="true">
      <div 
        className="shadow-xl flex flex-col w-full max-w-lg"
        style={{ 
          backgroundColor: defaultTheme.cardBg, 
          borderColor: defaultTheme.cardBorder,
          borderRadius: "1rem",
          borderWidth: "1px",
          width: '500px',
          height: '400px',
          boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4" 
             style={{ 
               backgroundColor: defaultTheme.navBg, 
               borderColor: defaultTheme.cardBorder,
               borderTopLeftRadius: "1rem",
               borderTopRightRadius: "1rem"
             }}>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold" style={{ color: defaultTheme.accent }}>
              Installation Guide
            </h2>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <div
                  key={index}
                  className="w-2 h-2 rounded-full transition-colors"
                  style={{
                    backgroundColor: currentStep === index + 1 ? defaultTheme.primary : defaultTheme.lightAccent
                  }}
                />
              ))}
            </div>
          </div>
          <button 
            className="hover:opacity-70 transition-opacity rounded-full p-1"
            style={{ color: defaultTheme.textLight }} 
            onClick={onClose}
            aria-label="Close"
          >
            <XIcon size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto" 
             style={{ backgroundColor: defaultTheme.background }}>
          {currentStep === 1 && <InstallationStep trackingScript={trackingScript} onCopy={handleCopy} copied={copied} />}
          {currentStep === 2 && <VerificationStep />}
          {currentStep === 3 && <CustomEventsStep />}
        </div>
        
        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-between" 
             style={{ 
               backgroundColor: defaultTheme.navBg, 
               borderColor: defaultTheme.cardBorder,
               borderBottomLeftRadius: "1rem",
               borderBottomRightRadius: "1rem" 
             }}>
          <button
            onClick={prevStep}
            className={`px-4 py-2 rounded-full font-medium flex items-center gap-2 ${
              currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{ 
              backgroundColor: defaultTheme.lightAccent, 
              color: defaultTheme.accent 
            }}
            disabled={currentStep === 1}
            aria-label="Previous step"
          >
            <CaretLeftIcon size={16} />
            Previous
          </button>
          
          {currentStep === totalSteps ? (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full font-medium"
              style={{ backgroundColor: defaultTheme.primary, color: 'white' }}
              aria-label="Done"
            >
              Done
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="px-4 py-2 rounded-full font-medium flex items-center gap-2"
              style={{ backgroundColor: defaultTheme.primary, color: 'white' }}
              aria-label="Next step"
            >
              Next
              <CaretRightIcon size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackingCodeModal;