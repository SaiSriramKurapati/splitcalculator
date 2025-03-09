import React, { useEffect, useState, useRef } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ onComplete }) => {
    const [showContent, setShowContent] = useState(false);
    const [showTagline, setShowTagline] = useState(false);
    const [showSteps, setShowSteps] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [showContinue, setShowContinue] = useState(false);
    const [showSkip, setShowSkip] = useState(false);
    const containerRef = useRef(null);

    const steps = [
        { icon: '👥', text: 'Add Members' },
        { icon: '📄', text: 'Upload a Receipt' },
        { icon: '✓', text: 'Assign Items' },
        { icon: '💰', text: 'Know Shares' }
    ];

    useEffect(() => {
        // Show skip button immediately
        setShowSkip(true);
        
        // Initial welcome animation
        setTimeout(() => setShowContent(true), 500);
        setTimeout(() => setShowTagline(true), 1500);
        
        // Start steps animation
        setTimeout(() => {
            setShowSteps(true);
            // Animate through each step
            steps.forEach((_, index) => {
                setTimeout(() => {
                    setActiveStep(index);
                    // Auto-scroll to the active step
                    const stepElement = document.querySelector(`.step-item:nth-child(${index + 1})`);
                    if (stepElement && containerRef.current) {
                        const containerTop = containerRef.current.offsetTop;
                        const stepTop = stepElement.offsetTop;
                        const offset = stepTop - containerTop - 100; // Adjust scroll position
                        
                        window.scrollTo({
                            top: offset,
                            behavior: 'smooth'
                        });
                    }
                }, 2000 + (index * 200));
            });
        }, 2000);

        // Show continue button after all steps
        setTimeout(() => {
            setShowContinue(true);
            // Scroll to the continue button
            const buttonElement = document.querySelector('.continue-button');
            if (buttonElement) {
                buttonElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 3000);
    }, []);

    const handleContinue = () => {
        const element = document.querySelector('.splash-screen');
        if (!element) return;
        
        element.classList.add('fade-out');
        setTimeout(onComplete, 500);
    };

    return (
        <div className="splash-screen" ref={containerRef}>
            <button 
                className={`skip-button ${showSkip ? 'show' : ''}`}
                onClick={handleContinue}
            >
                Skip
            </button>
            <div className={`splash-content ${showContent ? 'show' : ''}`}>
                <div className="welcome-text">Welcome to</div>
                <h1 className="splash-logo">VAATA</h1>
                <p className={`splash-tagline ${showTagline ? 'show' : ''}`}>
                    Divide with ease, Pay with peace
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