import React, { useState, useEffect } from "react";
import axios from 'axios';
import './BillUploaderMobile.css';

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
            setActiveStep(2); // Move to next step after successful scan
        } catch (error) {
            console.error("Error uploading the bill:", error);
            setError("Failed to upload the bill. Please try again.");
        } finally {
            setLoading(false);
        }
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

    const handleAssignAll = (itemIndex) => {
        setAssignments((prevAssignments) => {
            const updated = { ...prevAssignments };
    
            // Check if all members are already assigned
            const allAssigned = members.every((member) => updated[itemIndex]?.includes(member));
    
            if (allAssigned) {
                // If all members are assigned, unassign all
                updated[itemIndex] = [];
            } else {
                // Otherwise, assign all members
                updated[itemIndex] = [...members];
            }
    
            return updated;
        });
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
            setBillData({ ...billData, items: updatedItems });
        }
    };

    const handleSummaryChange = (field, value) => {
        setSummary({ ...summary, [field]: parseFloat(value) || 0 });
    };

    // Mobile-specific navigation functions
    const goToNextStep = () => {
        setActiveStep(prev => Math.min(prev + 1, 4));
    };

    const goToPrevStep = () => {
        setActiveStep(prev => Math.max(prev - 1, 1));
    };

    // Render different steps based on activeStep
    const renderStep = () => {
        switch (activeStep) {
            case 1: // Upload bill
                return (
                    <div className="mobile-step upload-step">
                        <h2>Upload Your Bill</h2>
                        <div className="file-upload-container">
                            <input 
                                type="file" 
                                onChange={handleFileChange} 
                                accept="image/*" 
                                className="file-input"
                            />
                            <button 
                                onClick={handleScan} 
                                disabled={!file || loading} 
                                className="scan-button"
                            >
                                {loading ? "Scanning..." : "Scan Bill"}
                            </button>
                        </div>
                        {error && <div className="error-message">{error}</div>}
                    </div>
                );
            case 2: // Add members
                return (
                    <div className="mobile-step members-step">
                        <h2>Add Group Members</h2>
                        <div className="add-member-container">
                            <input
                                type="text"
                                value={memberName}
                                onChange={(e) => setMemberName(e.target.value)}
                                placeholder="Enter member name"
                                className="member-input"
                            />
                            <button onClick={handleAddMember} className="add-button">
                                Add
                            </button>
                        </div>
                        <div className="members-list">
                            {members.map((member, index) => (
                                <div key={index} className="member-item">
                                    {member}
                                </div>
                            ))}
                        </div>
                        <div className="step-navigation">
                            <button onClick={goToPrevStep} className="prev-button">
                                Back
                            </button>
                            <button 
                                onClick={goToNextStep} 
                                disabled={members.length === 0}
                                className="next-button"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                );
            case 3: // Assign items
                return (
                    <div className="mobile-step assign-step">
                        <h2>Assign Items</h2>
                        {billData && billData.items && (
                            <div className="items-list">
                                {billData.items.map((item, index) => (
                                    <div key={index} className="item-card">
                                        <div className="item-details">
                                            <div className="item-name">{item.name}</div>
                                            <div className="item-price">
                                                <input
                                                    type="number"
                                                    value={item.price}
                                                    onChange={(e) => handlePriceChange(index, e.target.value)}
                                                    className="price-input"
                                                />
                                            </div>
                                        </div>
                                        <div className="item-assignments">
                                            <div className="assign-all">
                                                <button 
                                                    onClick={() => handleAssignAll(index)}
                                                    className="assign-all-button"
                                                >
                                                    {members.every(m => assignments[index]?.includes(m)) 
                                                        ? "Unassign All" 
                                                        : "Assign All"}
                                                </button>
                                            </div>
                                            <div className="member-toggles">
                                                {members.map((member, mIndex) => (
                                                    <button
                                                        key={mIndex}
                                                        onClick={() => handleItemAssign(index, member)}
                                                        className={`member-toggle ${
                                                            assignments[index]?.includes(member) ? "active" : ""
                                                        }`}
                                                    >
                                                        {member}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="summary-inputs">
                            <div className="summary-field">
                                <label>Subtotal:</label>
                                <input
                                    type="number"
                                    value={summary.subtotal}
                                    onChange={(e) => handleSummaryChange("subtotal", e.target.value)}
                                    className="summary-input"
                                />
                            </div>
                            <div className="summary-field">
                                <label>Tax:</label>
                                <input
                                    type="number"
                                    value={summary.tax}
                                    onChange={(e) => handleSummaryChange("tax", e.target.value)}
                                    className="summary-input"
                                />
                            </div>
                            <div className="summary-field">
                                <label>Total:</label>
                                <input
                                    type="number"
                                    value={summary.total}
                                    onChange={(e) => handleSummaryChange("total", e.target.value)}
                                    className="summary-input"
                                />
                            </div>
                        </div>
                        <div className="step-navigation">
                            <button onClick={goToPrevStep} className="prev-button">
                                Back
                            </button>
                            <button 
                                onClick={() => {
                                    calculateSplit();
                                    goToNextStep();
                                }} 
                                className="next-button"
                            >
                                Calculate Split
                            </button>
                        </div>
                    </div>
                );
            case 4: // Results
                return (
                    <div className="mobile-step results-step">
                        <h2>Split Results</h2>
                        <div className="results-container">
                            {Object.entries(totals).map(([member, amount], index) => (
                                <div key={index} className="result-item">
                                    <div className="member-name">{member}</div>
                                    <div className="member-amount">${amount.toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                        <div className="step-navigation">
                            <button onClick={goToPrevStep} className="prev-button">
                                Back
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
            <div className="mobile-header">
                <h1>Bill Splitter</h1>
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