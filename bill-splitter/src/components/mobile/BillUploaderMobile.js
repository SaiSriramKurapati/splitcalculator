import React, { useState, useEffect } from "react";
import axios from 'axios';
import './BillUploaderMobile.css';
import html2canvas from 'html2canvas';
import ScannerView from './ScannerView';
import SplashScreen from './SplashScreen';
import backArrowIcon from '../../assets/images/ui-elements/back arrow.svg';

const BillUploaderMobile = () => {
    const [showSplash, setShowSplash] = useState(true);
    // Same state variables as desktop version
    const [file, setFile] = useState(null);
    const [billData, setBillData] = useState(null);
    const [error, setError] = useState(null);
    const [members, setMembers] = useState([]);
    const [memberName, setMemberName] = useState("");
    const [assignments, setAssignments] = useState({});
    const [totals, setTotals] = useState({});
    const [summary, setSummary] = useState({ subtotal: 0, tax: 0, total: 0 });
    const [loading, setLoading] = useState(false);
    const [activeStep, setActiveStep] = useState(1); // For mobile step-by-step flow
    
    // New state for adding items
    const [newItem, setNewItem] = useState({ name: "", price: "" });

    // New state variables
    const [showResults, setShowResults] = useState(false);
    const [view, setView] = useState('summary');
    const [currentMemberIndex, setCurrentMemberIndex] = useState(0);
    const [selectedMember, setSelectedMember] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [isScanning, setIsScanning] = useState(false);
    const [showAddItemForm, setShowAddItemForm] = useState(false);

    // Add useEffect to set default selected member
    useEffect(() => {
        if (members.length > 0 && !selectedMember) {
            setSelectedMember(members[0]);
        }
    }, [members, selectedMember]);

    // Reuse the same handlers from the desktop version
    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleScan = async () => {
        if (!file) {
            setError("Please upload a file first.");
            return;
        }

        const formData = new FormData();
        formData.append('bill', file);

        setLoading(true);
        setIsScanning(true);

        // Simulate progress updates
        const progressInterval = setInterval(() => {
            setScanProgress(prev => {
                if (prev >= 94) {
                    clearInterval(progressInterval);
                    return prev;
                }
                return prev + 2;
            });
        }, 100);

        try {
            const response = await axios.post(
                'https://splitcalculator-backend.onrender.com/api/bills/upload',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            setBillData(response.data);
            setSummary({
                subtotal: response.data.subtotal || 0,
                tax: response.data.tax || 0,
                total: response.data.total || 0,
            });
            setAssignments({});
            setError(null);
            
            // Complete the progress
            setScanProgress(100);
            setTimeout(() => {
                setIsScanning(false);
                setScanProgress(0);
                setActiveStep(2);
            }, 500);
        } catch (error) {
            console.error("Error uploading the bill:", error);
            setError("Failed to upload the bill. Please try again.");
            setIsScanning(false);
            setScanProgress(0);
        } finally {
            clearInterval(progressInterval);
            setLoading(false);
        }
    };

    // Initialize empty bill if user skips uploading
    const handleSkipUpload = () => {
        setBillData({
            items: []
        });
        setSummary({
            subtotal: 0,
            tax: 0,
            total: 0
        });
        setActiveStep(2);
    };

    const handleAddMember = () => {
        if (memberName.trim() === "") {
            alert("Member name cannot be empty.");
            return;
        }

        // Capitalize first letter of each word
        const capitalizedName = memberName
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        const updatedMembers = [...members, capitalizedName];
        setMembers(updatedMembers);
        setMemberName("");
    };

    const handleItemAssign = (itemIndex, member) => {
        setAssignments((prevAssignments) => {
            const updated = { ...prevAssignments };
    
            if (!updated[itemIndex]) {
                updated[itemIndex] = [];
            }
    
            if (updated[itemIndex].includes(member)) {
                updated[itemIndex] = updated[itemIndex].filter((m) => m !== member);
            } else {
                updated[itemIndex] = [...new Set([...updated[itemIndex], member])];
            }
    
            return updated;
        });
    };

    const handleAssignAll = (member) => {
        const allAssigned = isAllAssigned(member);
        
        setAssignments(prev => {
            const updated = { ...prev };
            billData.items.forEach((_, index) => {
                if (!updated[index]) {
                    updated[index] = [];
                }
                
                if (allAssigned) {
                    updated[index] = updated[index].filter(m => m !== member);
                } else if (!updated[index].includes(member)) {
                    updated[index] = [...updated[index], member];
                }
            });
            return updated;
        });
    };
    
    // New handler for adding an item
    const handleAddItemClick = () => {
        setShowAddItemForm(true);
    };

    const handleAddItem = () => {
        if (newItem.name.trim() === "") {
            alert("Item name cannot be empty");
            return;
        }
        
        if (parseFloat(newItem.price) <= 0) {
            alert("Price must be greater than zero");
            return;
        }
        
        const updatedBillData = { ...billData };
        if (!updatedBillData.items) {
            updatedBillData.items = [];
        }
        
        updatedBillData.items.push({
            name: newItem.name,
            price: parseFloat(newItem.price)
        });
        
        const newSubtotal = updatedBillData.items.reduce((sum, item) => sum + parseFloat(item.price), 0);
        const newSummary = {
            ...summary,
            subtotal: newSubtotal,
            total: newSubtotal + parseFloat(summary.tax) + (summary.tip || 0)
        };
        
        setBillData(updatedBillData);
        setSummary(newSummary);
        setNewItem({ name: "", price: "" });
        setShowAddItemForm(false); // Hide the form after adding
    };
    
    // New handler for removing an item
    const handleRemoveItem = (index) => {
        const updatedBillData = { ...billData };
        
        // Remove the item
        updatedBillData.items.splice(index, 1);
        
        // Update assignments
        const updatedAssignments = { ...assignments };
        
        // Shift all assignments for items after the deleted one
        for (let i = index; i < updatedBillData.items.length; i++) {
            updatedAssignments[i] = updatedAssignments[i + 1];
        }
        
        // Delete the last assignment entry
        delete updatedAssignments[updatedBillData.items.length];
        
        // Update subtotal
        const newSubtotal = updatedBillData.items.reduce((sum, item) => sum + parseFloat(item.price), 0);
        const newSummary = {
            ...summary,
            subtotal: newSubtotal,
            total: newSubtotal + parseFloat(summary.tax)
        };
        
        // Update state
        setBillData(updatedBillData);
        setAssignments(updatedAssignments);
        setSummary(newSummary);
    };
    
    const calculateSplit = () => {
        const totals = {};
        let subTotal = 0;
    
        const updatedAssignments = { ...assignments };
        const hasAnyAssignments = Object.values(updatedAssignments).some(arr => arr && arr.length > 0);
    
        // If no assignments were made, default to equal split
        if (!hasAnyAssignments) {
            billData.items.forEach((item, index) => {
                updatedAssignments[index] = [...members];
            });
        }
    
        // Calculate splits based on assignments
        billData.items.forEach((item, index) => {
            if (!updatedAssignments[index] || updatedAssignments[index].length === 0) {
                // If no one is assigned to this item, split equally
                updatedAssignments[index] = [...members];
            }
    
            const assignedMembers = updatedAssignments[index];
            const splitPrice = item.price / assignedMembers.length;
            subTotal += item.price;
    
            assignedMembers.forEach((member) => {
                totals[member] = (totals[member] || 0) + splitPrice;
            });
        });
    
        const taxAmount = summary.tax;
        let grandTotal = 0;
    
        // Add tax share for each member
        members.forEach((member) => {
            const memberShare = (totals[member] || 0) / subTotal;
            const taxSplit = memberShare * taxAmount;
            totals[member] = (totals[member] || 0) + taxSplit;
            grandTotal += totals[member];
        });
    
        setTotals(totals);
        return totals;
    };

    const handlePriceChange = (index, newPrice) => {
        if (billData && billData.items) {
            const updatedItems = [...billData.items];
            updatedItems[index] = { ...updatedItems[index], price: parseFloat(newPrice) || 0 };
            
            // Update subtotal
            const newSubtotal = updatedItems.reduce((sum, item) => sum + parseFloat(item.price), 0);
            const newSummary = {
                ...summary,
                subtotal: newSubtotal,
                total: newSubtotal + parseFloat(summary.tax)
            };
            
            setBillData({ ...billData, items: updatedItems });
            setSummary(newSummary);
        }
    };

    const handleSummaryChange = (field, value) => {
        const newValue = parseFloat(value) || 0;
        const updatedSummary = { ...summary, [field]: newValue };
        
        // Update total when subtotal, tax, or tip changes
        if (field === 'tax' || field === 'subtotal' || field === 'tip') {
            updatedSummary.total = updatedSummary.subtotal + updatedSummary.tax + (updatedSummary.tip || 0);
        }
        
        setSummary(updatedSummary);
    };

    // Mobile-specific navigation functions
    const goToNextStep = () => {
        setActiveStep(prev => Math.min(prev + 1, 4));
    };

    const goToPrevStep = () => {
        if (activeStep === 3) {
            // If we're on step 3 and there are previous members, go to previous member
            if (currentMemberIndex > 0) {
                setCurrentMemberIndex(prev => prev - 1);
            } else {
                // Only go back to step 2 if we're at the first member
                setActiveStep(2);
            }
        } else {
            setActiveStep(prev => Math.max(prev - 1, 1));
        }
    };

    // Helper functions for item assignment
    const isItemAssigned = (itemIndex, member) => {
        return assignments[itemIndex]?.includes(member);
    };

    const isAllAssigned = (member) => {
        return billData?.items?.every((_, index) => isItemAssigned(index, member));
    };

    const getAssignedItems = (member) => {
        return billData?.items?.filter((_, index) => isItemAssigned(index, member)) || [];
    };

    const getItemShares = (item) => {
        const itemIndex = billData.items.findIndex(i => i === item);
        return assignments[itemIndex]?.length || 1;
    };

    const calculateAndShowResults = () => {
        const results = calculateSplit();
        setTotals(results);
        setShowResults(true);
    };

    // Add new function for downloading results as image
    const downloadResultsAsImage = async () => {
        const resultsElement = document.getElementById('split-results');
        if (!resultsElement) return;

        try {
            // Add temporary class for better image capture
            resultsElement.classList.add('capturing');
            
            const canvas = await html2canvas(resultsElement, {
                backgroundColor: '#ffffff',
                scale: 2, // Higher resolution
                logging: false,
                useCORS: true
            });
            
            // Remove temporary class
            resultsElement.classList.remove('capturing');

            // Create download link
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = 'split-results.png';
            link.href = image;
            link.click();
        } catch (error) {
            console.error('Error generating image:', error);
        }
    };

    // Add handler for removing file
    const handleRemoveFile = () => {
        setFile(null);
        setError(null);
    };

    // Add this new function after the other helper functions
    const generateSmartInitial = (memberName, allMembers) => {
        // First try just the first letter
        const firstLetter = memberName.charAt(0).toUpperCase();
        const similarFirstLetter = allMembers.filter(m => 
            m !== memberName && m.charAt(0).toUpperCase() === firstLetter
        );

        // If no conflicts with first letter, use it
        if (similarFirstLetter.length === 0) {
            return firstLetter;
        }

        // If there are conflicts, try first two letters
        const firstTwo = memberName.slice(0, 2).toUpperCase();
        const similarFirstTwo = allMembers.filter(m => 
            m !== memberName && m.slice(0, 2).toUpperCase() === firstTwo
        );

        // If no conflicts with first two letters, use them
        if (similarFirstTwo.length === 0) {
            return firstTwo;
        }

        // If still conflicts, use first letter + last letter
        const lastLetter = memberName.charAt(memberName.length - 1).toUpperCase();
        const initial = firstLetter + lastLetter;
        const similarCombo = allMembers.filter(m =>
            m !== memberName && 
            m.charAt(0).toUpperCase() + m.charAt(m.length - 1).toUpperCase() === initial
        );

        // If no conflicts with first+last, use it
        if (similarCombo.length === 0) {
            return initial;
        }

        // If all else fails, use first three letters
        return memberName.slice(0, 3).toUpperCase();
    };

    // Render different steps based on activeStep
    const renderStep = () => {
        switch (activeStep) {
            case 1: // Members and Bill Upload
                return (
                    <div className="mobile-step upload-members-step">
                        
                        <div className="section-title">Add Members</div>
                        <div className="add-member-container">
                            <div className="member-input-wrapper">
                                <input
                                    type="text"
                                    value={memberName}
                                    onChange={(e) => setMemberName(e.target.value)}
                                    placeholder="Add members"
                                    className="member-input"
                                />
                                <div className="member-icon"></div>
                            </div>
                            <div className="add-button-container">
                                <button onClick={handleAddMember} className="add-button">
                                    Add
                                </button>
                            </div>
                        </div>
                        <div className="members-list">
                            {members.map((member, index) => (
                                <div key={index} className="member-item">
                                    {member}
                                    <button 
                                        onClick={() => {
                                            const updatedMembers = members.filter((_, i) => i !== index);
                                            setMembers(updatedMembers);
                                        }}
                                        className="remove-member"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="file-upload-section">
                            {file && (
                                <div className="file-info">
                                    <div className="file-name">
                                        <span className="upload-icon"></span>
                                        {file.name} ({(file.size / (1024 * 1024)).toFixed(1)}MB)
                                        <button 
                                            onClick={handleRemoveFile}
                                            className="remove-file-button"
                                            aria-label="Remove file"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            {!file ? (
                                <>
                                    <input 
                                        type="file" 
                                        onChange={handleFileChange} 
                                        accept="image/jpeg,image/png" 
                                        className="file-input"
                                        id="bill-file-input"
                                    />
                                    <label htmlFor="bill-file-input" className="upload-button">
                                        <span className="upload-icon"></span>
                                        Upload Bill
                                    </label>
                                    <div className="file-format">
                                        Supported formats: JPEG, PNG
                                    </div>
                                </>
                            ) : (
                                <button 
                                    onClick={handleScan} 
                                    disabled={loading} 
                                    className="scan-button mt-3"
                                >
                                    <span className="scan-icon"></span>
                                    {loading ? "Scanning..." : "Scan"}
                                </button>
                            )}
                        </div>
                        
                        {error && <div className="error-message">{error}</div>}
                    </div>
                );
            case 2: // Bill Items and Summary
                return (
                    <div className="mobile-step items-step">
                        <h2>Review Details</h2>
                        
                        <div className="items-list1 review-items">
                            <div className="review-items-header">
                                <div className="header-item-name">Item Name</div>
                                <div className="header-item-price">Price</div>
                            </div>
                            {billData?.items?.map((item, index) => (
                                <div key={index} className="review-item-card">
                                    <div className="item-details">
                                        <button 
                                            onClick={() => handleRemoveItem(index)}
                                            className="remove-item-button"
                                            aria-label="Remove item"
                                            style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center',
                                                padding: '0'
                                            }}
                                        >
                                            <span style={{ 
                                                fontSize: '24px',
                                                lineHeight: '1',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>-</span>
                                        </button>
                                        <div className="item-name">{item.name}</div>
                                        <div className="item-price-section">
                                            <input
                                                type="number"
                                                value={item.price}
                                                onChange={(e) => handlePriceChange(index, e.target.value)}
                                                className="price-input"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {showAddItemForm ? (
                                <div className="add-item-form">
                                    <div className="form-group">
                                        <input
                                            type="text"
                                            value={newItem.name}
                                            onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                                            placeholder="Item name"
                                            className="item-input"
                                            autoFocus
                                        />
                                        <input
                                            type="number"
                                            value={newItem.price}
                                            onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                                            placeholder="Price"
                                            className="price-input"
                                            min="0"
                                            step="0.01"
                                        />
                                        <div className="add-item-actions">
                                            <button onClick={handleAddItem} className="confirm-add-button">
                                                Add
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setShowAddItemForm(false);
                                                    setNewItem({ name: "", price: "" });
                                                }} 
                                                className="cancel-add-button"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={handleAddItemClick} className="add-item-trigger">
                                    Add Item +
                                </button>
                            )}
                        </div>

                        <div className="bill-summary">
                            <div className="summary-field">
                                <label>Subtotal:</label>
                                <input
                                    type="number"
                                    value={summary.subtotal}
                                    onChange={(e) => handleSummaryChange("subtotal", e.target.value)}
                                    className="summary-input"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div className="summary-field">
                                <label>Tax:</label>
                                <input
                                    type="number"
                                    value={summary.tax}
                                    onChange={(e) => handleSummaryChange("tax", e.target.value)}
                                    className="summary-input"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div className="summary-field">
                                <label>Tip/Others:</label>
                                <input
                                    type="number"
                                    value={summary.tip || 0}
                                    onChange={(e) => handleSummaryChange("tip", e.target.value)}
                                    className="summary-input"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div className="summary-field total-field">
                                <label>Total:</label>
                                <input
                                    type="number"
                                    value={summary.total}
                                    readOnly
                                    className="summary-input"
                                />
                            </div>
                        </div>

                        <div className="step-navigation">
                            <button 
                                onClick={() => setActiveStep(3)} 
                                className="next-button" 
                                disabled={!billData?.items?.length}
                            >
                                Continue to Assign Items
                            </button>
                        </div>
                    </div>
                );
            case 3: // Item Assignment
                const currentMember = members[currentMemberIndex];
                return (
                    <div className="mobile-step assign-step">
                        <h2>Assign Items for {currentMember}</h2>
                        
                        <div className="items-list">
                            <button 
                                onClick={() => handleAssignAll(currentMember)} 
                                className={`assign-all-button ${isAllAssigned(currentMember) ? 'selected' : ''}`}
                            >
                                {isAllAssigned(currentMember) ? "Unselect All" : "Select All"}
                            </button>

                            {billData?.items?.map((item, index) => (
                                <div 
                                    key={index} 
                                    className={`item-card ${isItemAssigned(index, currentMember) ? 'selected' : ''}`}
                                    onClick={() => handleItemAssign(index, currentMember)}
                                >
                                    <div className="item-details">
                                        <div className="item-name">{item.name}</div>
                                    </div>
                                    <div className="assigned-members">
                                        {assignments[index]?.map(member => (
                                            <span key={member} className="member-initial">
                                                {generateSmartInitial(member, members)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="step-navigation">
                            {currentMemberIndex < members.length - 1 ? (
                                <button 
                                    onClick={() => setCurrentMemberIndex(prev => prev + 1)} 
                                    className="next-member-button"
                                >
                                    Next Member
                                </button>
                            ) : (
                                <div className="calculate-button-container">
                                    <button 
                                        className="calculate-button"
                                        onTouchStart={handleTouchStart}
                                        onTouchMove={handleTouchMove}
                                        onTouchEnd={handleTouchEnd}
                                    >
                                        <div className="slide-arrow-icon"></div>
                                        <span className="button-text">Swipe to split bill</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 4: // Results
                return (
                    <div className="mobile-step results-step">
                        <h2>Total Breakdown</h2>
                        {/* Summary Section */}
                        <div className="summary-view">
                            <div className="store-total">
                                <div className="store-name">Publix</div>
                                <div className="total-amount">$ {summary.total.toFixed(2)}</div>
                            </div>
                            <div className="members-list-container">
                                {members.map((member, index) => (
                                    <div key={index} className="member-total">
                                        <span>{member}</span>
                                        <span>$ {totals[member]?.toFixed(2) || '0.00'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Details Section */}
                        <div className="details-section">
                            <div className="details-header">
                                <h3>Assigned Items</h3>
                            </div>
                            <div className="custom-dropdown">
                                <div 
                                    className="selected-member"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                >
                                    {selectedMember}
                                    <span className="dropdown-arrow"></span>
                                </div>
                                {isDropdownOpen && (
                                    <div className="dropdown-options">
                                        {members.map((member, index) => (
                                            <div 
                                                key={index} 
                                                className={`dropdown-option ${selectedMember === member ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setSelectedMember(member);
                                                    setIsDropdownOpen(false);
                                                }}
                                            >
                                                {member}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="member-details">
                                {getAssignedItems(selectedMember).map((item, itemIndex) => (
                                    <div key={itemIndex} className="assigned-item">
                                        <span>{item.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const [touchStart, setTouchStart] = useState(null);
    const [buttonPosition, setButtonPosition] = useState(0);

    const handleTouchStart = (e) => {
        setTouchStart(e.touches[0].clientX);
    };

    const handleTouchMove = (e) => {
        if (!touchStart) return;

        const currentTouch = e.touches[0].clientX;
        const diff = currentTouch - touchStart;
        const maxSlide = (e.target.parentElement.offsetWidth - e.target.offsetWidth) - 20; // Reduced by 20px
        
        // Restrict sliding to right direction only and max container width minus button width
        const newPosition = Math.max(0, Math.min(diff, maxSlide));
        setButtonPosition(newPosition);
        
        e.target.style.transform = `translateX(${newPosition}px)`;
    };

    const handleTouchEnd = (e) => {
        const container = e.target.parentElement;
        const maxSlide = (container.offsetWidth - e.target.offsetWidth) - 20; // Reduced by 20px
        const threshold = maxSlide * 0.75; // 75% of available slide distance

        if (buttonPosition >= threshold) {
            // Successful slide
            calculateAndShowResults();
            setActiveStep(4);
        } else {
            // Reset position if not slid far enough
            e.target.style.transform = 'translateX(0)';
        }

        setTouchStart(null);
        setButtonPosition(0);
    };

    const handleSplashComplete = () => {
        setShowSplash(false);
    };

    if (showSplash) {
        return <SplashScreen onComplete={handleSplashComplete} />;
    }

    return (
        <div className="bill-uploader-mobile">
            {isScanning && <ScannerView progress={scanProgress} />}
            <div className="mobile-header">
                {activeStep > 1 && (
                    <button onClick={goToPrevStep} className="back-arrow">
                        <img src={backArrowIcon} alt="Back" className="back-arrow-icon" />
                    </button>
                )}
                <h1 className="mobile-title">VAATA</h1>
            </div>
            {renderStep()}
        </div>
    );
};

export default BillUploaderMobile; 