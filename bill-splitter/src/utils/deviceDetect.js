import React, { useState, useEffect } from 'react';

export const isMobile = () => {
    return window.innerWidth <= 768;
};

export const useIsMobile = () => {
    const [isMobileView, setIsMobileView] = useState(isMobile());

    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(isMobile());
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return isMobileView;
}; 