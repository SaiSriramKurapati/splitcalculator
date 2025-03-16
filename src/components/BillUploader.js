import React from 'react';
import './BillUploader.css';

const BillUploader = () => {
    return (
        <div className="desktop-message">
            <div className="logo-section">
                <div className="welcome-text">Welcome to</div>
                <h1 className="splash-logo">VAAATA</h1>
                <p className="splash-tagline">Divide with ease, Pay with peace</p>
            </div>
            <div className="message-container">
                <h1>Please Open on Mobile</h1>
                <p>VAAATA is optimized for mobile devices. Please open this application on your mobile device for the best experience.</p>
            </div>
        </div>
    );
};

export default BillUploader;
