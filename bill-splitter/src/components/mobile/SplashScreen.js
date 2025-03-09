import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ onComplete }) => {
    const [showContent, setShowContent] = useState(false);
    const [showTagline, setShowTagline] = useState(false);
    const [showSteps, setShowSteps] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [showContinue, setShowContinue] = useState(false);

    const steps = [
        { icon: '👥', text: 'Add Members' },
        { icon: '📄', text: 'Upload a Receipt' },
        { icon: '✓', text: 'Assign Items' },
        { icon: '💰', text: 'Know Shares' }
    ];

    useEffect(() => {
        // Initial welcome animation
        setTimeout(() => setShowContent(true), 500);
        setTimeout(() => setShowTagline(true), 1500);
        
        // Start steps animation
        setTimeout(() => {
            setShowSteps(true);
            // Animate through each step
            steps.forEach((_, index) => {
                setTimeout(() => setActiveStep(index), 2000 + (index * 1000));
            });
        }, 2000);

        // Show continue button after all steps are shown
        setTimeout(() => setShowContinue(true), 6000);
    }, []);

    const handleContinue = () => {
        const element = document.querySelector('.splash-screen');
        element.classList.add('fade-out');
        setTimeout(onComplete, 500);
    };

    return (
        <div className="splash-screen">
            <div className={`splash-content ${showContent ? 'show' : ''}`}>
                <div className="welcome-text">Welcome to</div>
                <h1 className="splash-logo">VAATA</h1>
                <p className={`splash-tagline ${showTagline ? 'show' : ''}`}>
                    Fair Shares, Clear Splits
                </p>
                
                <div className={`steps-container ${showSteps ? 'show' : ''}`}>
                    {steps.map((step, index) => (
                        <div 
                            key={index}
                            className={`step-item ${index <= activeStep ? 'active' : ''}`}
                        >
                            <span className="step-icon">{step.icon}</span>
                            <span className="step-text">{step.text}</span>
                            {index < steps.length - 1 && <span className="step-arrow">→</span>}
                        </div>
                    ))}
                </div>

                <button 
                    className={`continue-button ${showContinue ? 'show' : ''}`}
                    onClick={handleContinue}
                >
                    Continue
                </button>
            </div>
        </div>
    );
};

export default SplashScreen; 