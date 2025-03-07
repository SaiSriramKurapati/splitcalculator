import React from 'react';
import './ScannerView.css';

const ScannerView = ({ progress }) => {
    return (
        <div className="scanner-view">
            <div className="scanner-content">
                <h2>Scanning...</h2>
                <div className="scanner-frame">
                    <div className="document-icon"></div>
                    <div className="scan-line"></div>
                </div>
                <div className="progress-circle">
                    <svg viewBox="0 0 36 36" className="circular-progress">
                        <path
                            d="M18 2.0845
                                a 15.9155 15.9155 0 0 1 0 31.831
                                a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#E6E6E6"
                            strokeWidth="2"
                        />
                        <path
                            d="M18 2.0845
                                a 15.9155 15.9155 0 0 1 0 31.831
                                a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#1B4E7C"
                            strokeWidth="2"
                            strokeDasharray={`${progress}, 100`}
                        />
                    </svg>
                    <span className="progress-text">{progress}%</span>
                </div>
            </div>
        </div>
    );
};

export default ScannerView; 