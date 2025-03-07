import React, { useState, useEffect } from "react";
import axios from 'axios';
import './BillUploaderMobile.css';
import html2canvas from 'html2canvas';
import ScannerView from './ScannerView';

const BillUploaderMobile = () => {
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
    const [newItem, setNewItem] = useState({ name: "", price: 0 });

    // New state variables
    const [showResults, setShowResults] = useState(false);
    const [view, setView] = useState('summary');
    const [currentMemberIndex, setCurrentMemberIndex] = useState(0);
    const [selectedMember, setSelectedMember] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [isScanning, setIsScanning] = useState(false);

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

        const updatedMembers = [...members, memberName];
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
        
        // Add the new item to the bill data
        updatedBillData.items.push({
            name: newItem.name,
            price: parseFloat(newItem.price)
        });
        
        // Update subtotal
        const newSubtotal = updatedBillData.items.reduce((sum, item) => sum + parseFloat(item.price), 0);
        const newSummary = {
            ...summary,
            subtotal: newSubtotal,
            total: newSubtotal + parseFloat(summary.tax)
        };
        
        // Update state
        setBillData(updatedBillData);
        setSummary(newSummary);
        setNewItem({ name: "", price: 0 }); // Reset form
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
    
        // Ensure all items are assigned for calculations
        billData.items.forEach((item, index) => {
            if (!updatedAssignments[index] || updatedAssignments[index].length === 0) {
                // Assign all members if no one is assigned
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
        const newSummary = { ...summary, [field]: newValue };
        
        // Update total when tax or subtotal changes
        if (field === 'tax' || field === 'subtotal') {
            newSummary.total = newSummary.subtotal + newSummary.tax;
        }
        
        setSummary(newSummary);
    };

    // Mobile-specific navigation functions
    const goToNextStep = () => {
        setActiveStep(prev => Math.min(prev + 1, 4));
    };

    const goToPrevStep = () => {
        setActiveStep(prev => Math.max(prev - 1, 1));
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
                        <h2>Bill Items</h2>
                        
                        <div className="add-item-container">
                            <div className="form-group">
                                <input
                                    type="text"
                                    value={newItem.name}
                                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                                    placeholder="Item name"
                                    className="item-input"
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
                                <button onClick={handleAddItem} className="add-item-button">
                                    Add Item
                                </button>
                            </div>
                        </div>

                        <div className="items-list">
                            {billData?.items?.map((item, index) => (
                                <div key={index} className="item-card">
                                    <div className="item-details">
                                        <div className="item-name">{item.name}</div>
                                        <div className="item-price">
                                            <input
                                                type="number"
                                                value={item.price}
                                                onChange={(e) => handlePriceChange(index, e.target.value)}
                                                className="price-input"
                                                min="0"
                                                step="0.01"
                                            />
                                            <button 
                                                onClick={() => handleRemoveItem(index)}
                                                className="remove-item-button"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
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
                            <button onClick={() => setActiveStep(3)} className="next-button" disabled={!billData?.items?.length}>
                                Continue to Assign Items
                            </button>
                            <button onClick={() => setActiveStep(1)} className="prev-button">
                                Back
                            </button>
                        </div>
                    </div>
                );
            case 3: // Item Assignment
                const currentMember = members[currentMemberIndex];
                return (
                    <div className="mobile-step assign-step">
                        <h2>Assign Items for {currentMember}</h2>
                        
                        <div className="assignment-progress">
                            <div className="progress-text">
                                Member {currentMemberIndex + 1} of {members.length}
                            </div>
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill" 
                                    style={{width: `${((currentMemberIndex + 1) / members.length) * 100}%`}}
                                />
                            </div>
                        </div>

                        <div className="items-list">
                            <button 
                                onClick={() => handleAssignAll(currentMember)} 
                                className="assign-all-button"
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
                                        <div className="item-price">${item.price.toFixed(2)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="step-navigation">
                            {currentMemberIndex < members.length - 1 ? (
                                <button 
                                    onClick={() => setCurrentMemberIndex(prev => prev + 1)} 
                                    className="next-button"
                                >
                                    Next Member
                                </button>
                            ) : (
                                <button 
                                    onClick={() => {
                                        calculateAndShowResults();
                                        setActiveStep(4);
                                    }} 
                                    className="calculate-button"
                                >
                                    Calculate Split
                                </button>
                            )}
                            <button onClick={() => setActiveStep(2)} className="prev-button">
                                Back
                            </button>
                        </div>
                    </div>
                );
            case 4: // Results
                return (
                    <div className="mobile-step results-step">
                        <div className="results-section" id="split-results">
                            <div className="results-header">
                                <h3>Split Results</h3>
                                <button 
                                    onClick={downloadResultsAsImage}
                                    className="download-button"
                                >
                                    Download Results
                                </button>
                            </div>

                            <div className="results-tabs">
                                <button 
                                    className={`tab ${view === 'summary' ? 'active' : ''}`}
                                    onClick={() => setView('summary')}
                                >
                                    Summary
                                </button>
                                <button 
                                    className={`tab ${view === 'details' ? 'active' : ''}`}
                                    onClick={() => setView('details')}
                                >
                                    Details
                                </button>
                            </div>

                            {view === 'summary' ? (
                                <div className="summary-view">
                                    {members.map((member, index) => (
                                        <div key={index} className="member-total">
                                            <span>{member}</span>
                                            <span>${totals[member]?.toFixed(2) || '0.00'}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="details-view">
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
                                        <div className="assigned-items">
                                            {getAssignedItems(selectedMember).map((item, itemIndex) => (
                                                <div key={itemIndex} className="assigned-item">
                                                    <span>{item.name}</span>
                                                    <span>${(item.price / getItemShares(item)).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="step-navigation">
                            <button 
                                onClick={() => setActiveStep(3)} 
                                className="prev-button"
                            >
                                Back to Assignments
                            </button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bill-uploader-mobile">
            {isScanning && <ScannerView progress={scanProgress} />}
            <div className="mobile-header">
                <h1 className="mobile-title">Itemized Bill Splitter</h1>
                <div className="step-indicator">
                    {[1, 2, 3, 4].map(step => (
                        <div 
                            key={step} 
                            className={`step-dot ${activeStep >= step ? "active" : ""}`}
                        />
                    ))}
                </div>
            </div>
            {renderStep()}
        </div>
    );
};

export default BillUploaderMobile; 