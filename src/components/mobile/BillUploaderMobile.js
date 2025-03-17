import React, { useState, useEffect } from "react";
import axios from 'axios';
import './BillUploaderMobile.css';
import html2canvas from 'html2canvas';
import ScannerView from './ScannerView';
import SplashScreen from './SplashScreen';
import backArrowIcon from '../../assets/images/ui-elements/back arrow.svg';
import emailjs from '@emailjs/browser';

// Initialize EmailJS with your public key
emailjs.init("YOUR_PUBLIC_KEY");

const BillUploaderMobile = () => {
    const [showSplash, setShowSplash] = useState(true);
    // Add new state for retry attempts
    const [retryAttempts, setRetryAttempts] = useState(0);
    const [showErrorUI, setShowErrorUI] = useState(false);
    const [showMemberAlert, setShowMemberAlert] = useState(false);
    const [showImageOverlay, setShowImageOverlay] = useState(false); // Add new state for image overlay
    const [showDiscrepancyAlert, setShowDiscrepancyAlert] = useState(false); // Add new state for discrepancy alert
    const [apiResponseSummary, setApiResponseSummary] = useState(null); // Store original API response values
    const [discrepancyAlertShown, setDiscrepancyAlertShown] = useState(false); // Add new state to track if alert has been shown
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
    const [storeTitle, setStoreTitle] = useState(""); // Add new state for store title
    
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
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSendingFeedback, setIsSendingFeedback] = useState(false);
    const [feedbackError, setFeedbackError] = useState('');
    const [showThankYou, setShowThankYou] = useState(false);

    // Add new functions to handle input focus and blur for numeric fields
    const handleInputFocus = (e) => {
        // If the current value is 0 or 0.00, clear the input
        if (parseFloat(e.target.value) === 0) {
            e.target.value = '';
        }
    };

    const handleInputBlur = (e) => {
        // If the input is empty, set it back to 0
        if (e.target.value === '') {
            e.target.value = '0';
        }
    };

    // Add useEffect to set default selected member
    useEffect(() => {
        if (members.length > 0 && !selectedMember) {
            setSelectedMember(members[0]);
        }
    }, [members, selectedMember]);

    // Add cleanup for file preview URL
    useEffect(() => {
        return () => {
            if (file) {
                URL.revokeObjectURL(URL.createObjectURL(file));
            }
        };
    }, [file]);

    // Add useEffect to recalculate summary when bill data changes
    useEffect(() => {
        if (billData && billData.items) {
            // Calculate subtotal as sum of all items
            const calculatedSubtotal = billData.items.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);
            
            // Calculate total
            setSummary(prev => ({
                ...prev,
                subtotal: parseFloat(calculatedSubtotal.toFixed(2)),
                total: parseFloat((calculatedSubtotal + prev.tax + (prev.tip || 0)).toFixed(2))
            }));
        }
    }, [billData?.items]);

    // Fix useEffect to only check for discrepancy once after scanning
    useEffect(() => {
        // Only check when entering step 2 (Review Details) directly after scanning 
        // and only if alert hasn't been shown yet
        if (activeStep === 2 && !discrepancyAlertShown && apiResponseSummary) {
            const calculatedTotal = parseFloat(summary.total.toFixed(2));
            const apiTotal = parseFloat((apiResponseSummary.total || 0).toFixed(2));
            
            if (Math.abs(calculatedTotal - apiTotal) > 0.01) {
                setShowDiscrepancyAlert(true);
                setDiscrepancyAlertShown(true); // Mark as shown
            }
        }
    }, [activeStep]); // Only trigger when step changes, not on every data change

    // Reuse the same handlers from the desktop version
    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleScan = async () => {
        if (!file) {
            setError("Please upload a file first.");
            return;
        }

        if (members.length === 0) {
            setShowMemberAlert(true);
            return;
        }

        const formData = new FormData();
        formData.append('bill', file);

        setLoading(true);
        setIsScanning(true);
        setShowErrorUI(false);

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
            setStoreTitle(response.data.title || "");
            
            // Store original API response values for comparison
            setApiResponseSummary({
                subtotal: parseFloat((response.data.subtotal || 0).toFixed(2)),
                tax: parseFloat((response.data.tax || 0).toFixed(2)),
                total: parseFloat((response.data.total || 0).toFixed(2)),
            });
            
            // Calculate subtotal as sum of items
            const calculatedSubtotal = response.data.items ? 
                parseFloat(response.data.items.reduce((sum, item) => sum + parseFloat(item.price || 0), 0).toFixed(2)) : 0;
            
            // Use tax from API response, but calculate our own total
            const taxAmount = parseFloat((response.data.tax || 0).toFixed(2));
            const calculatedTotal = parseFloat((calculatedSubtotal + taxAmount).toFixed(2));
            
            // Set the summary with our calculated values
            setSummary({
                subtotal: calculatedSubtotal,
                tax: taxAmount,
                total: calculatedTotal,
            });
            
            // Check for discrepancies between our calculation and API values
            const apiTotal = parseFloat((response.data.total || 0).toFixed(2));
            if (Math.abs(calculatedTotal - apiTotal) > 0.01) {
                // Only show alert if it hasn't been shown yet
                if (!discrepancyAlertShown) {
                    setShowDiscrepancyAlert(true);
                    setDiscrepancyAlertShown(true); // Mark as shown
                }
            }
            
            setAssignments({});
            setError(null);
            setRetryAttempts(0); // Reset retry attempts on success
            
            // Complete the progress
            setScanProgress(100);
            setTimeout(() => {
                setIsScanning(false);
                setScanProgress(0);
                setActiveStep(2);
            }, 500);
        } catch (error) {
            console.error("Error uploading the bill:", error);
            setRetryAttempts(prev => prev + 1);
            setShowErrorUI(true);
            setIsScanning(false);
            setScanProgress(0);
        } finally {
            clearInterval(progressInterval);
            setLoading(false);
        }
    };

    const handleRetry = () => {
        setShowErrorUI(false);
        handleScan();
    };

    // Initialize empty bill if user skips uploading
    const handleSkipUpload = () => {
        setBillData({
            items: []
        });
        // Set API response summary as null since there's no API response
        setApiResponseSummary(null);
        // Set summary with our calculated values
        setSummary({
            subtotal: 0, // calculated as sum of items (currently 0)
            tax: 0,
            tip: 0,
            total: 0 // calculated as subtotal + tax + tip (all 0)
        });
        // Reset discrepancy alert
        setShowDiscrepancyAlert(false);
        setDiscrepancyAlertShown(false); // Reset the shown flag when skipping upload
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
            price: parseFloat(parseFloat(newItem.price).toFixed(2))
        });
        
        // Calculate subtotal as sum of all items
        const newSubtotal = parseFloat(updatedBillData.items.reduce((sum, item) => sum + parseFloat(item.price), 0).toFixed(2));
        
        // Calculate total = subtotal + tax + tip
        const newSummary = {
            ...summary,
            subtotal: newSubtotal,
            total: parseFloat((newSubtotal + parseFloat(summary.tax) + (summary.tip || 0)).toFixed(2))
        };
        
        setBillData(updatedBillData);
        setSummary(newSummary);
        setNewItem({ name: "", price: "" });
        setShowAddItemForm(false); // Hide the form after adding
        
        // Remove discrepancy checking - we don't want to show the alert when user manually edits
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
        
        // Calculate subtotal as sum of all items
        const newSubtotal = parseFloat(updatedBillData.items.reduce((sum, item) => sum + parseFloat(item.price), 0).toFixed(2));
        
        // Calculate total = subtotal + tax
        const newSummary = {
            ...summary,
            subtotal: newSubtotal,
            total: parseFloat((newSubtotal + parseFloat(summary.tax) + (summary.tip || 0)).toFixed(2))
        };
        
        // Update state
        setBillData(updatedBillData);
        setAssignments(updatedAssignments);
        setSummary(newSummary);
        
        // Remove discrepancy checking - we don't want to show the alert when user manually edits
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
            const splitPrice = parseFloat((item.price / assignedMembers.length).toFixed(2));
            subTotal = parseFloat((subTotal + item.price).toFixed(2));
    
            assignedMembers.forEach((member) => {
                totals[member] = parseFloat(((totals[member] || 0) + splitPrice).toFixed(2));
            });
        });
    
        const taxAmount = parseFloat(summary.tax.toFixed(2));
        let grandTotal = 0;
    
        // Add tax share for each member
        members.forEach((member) => {
            const memberShare = parseFloat(((totals[member] || 0) / subTotal).toFixed(4)); // Use 4 decimal places for ratio calculation
            const taxSplit = parseFloat((memberShare * taxAmount).toFixed(2));
            totals[member] = parseFloat(((totals[member] || 0) + taxSplit).toFixed(2));
            grandTotal = parseFloat((grandTotal + totals[member]).toFixed(2));
        });
    
        setTotals(totals);
        return totals;
    };

    const handlePriceChange = (index, newPrice) => {
        if (billData && billData.items) {
            const updatedItems = [...billData.items];
            updatedItems[index] = { 
                ...updatedItems[index], 
                price: parseFloat(parseFloat(newPrice || 0).toFixed(2)) 
            };
            
            // Calculate subtotal as sum of all items
            const newSubtotal = parseFloat(updatedItems.reduce((sum, item) => sum + parseFloat(item.price), 0).toFixed(2));
            
            // Calculate total = subtotal + tax
            const newSummary = {
                ...summary,
                subtotal: newSubtotal,
                total: parseFloat((newSubtotal + parseFloat(summary.tax) + (summary.tip || 0)).toFixed(2))
            };
            
            setBillData({ ...billData, items: updatedItems });
            setSummary(newSummary);
            
            // Remove discrepancy checking - we don't want to show the alert when user manually edits
        }
    };

    const handleSummaryChange = (field, value) => {
        const newValue = parseFloat(parseFloat(value || 0).toFixed(2));
        const updatedSummary = { ...summary, [field]: newValue };
        
        // For any change, recalculate total based on subtotal + tax + tip
        const calculatedSubtotal = billData?.items ? 
            parseFloat(billData.items.reduce((sum, item) => sum + parseFloat(item.price || 0), 0).toFixed(2)) : 0;
            
        // Use the new value if it's subtotal, otherwise use existing
        const subtotalToUse = field === 'subtotal' ? newValue : calculatedSubtotal;
        
        // Use the new value if it's tax, otherwise use existing
        const taxToUse = field === 'tax' ? newValue : parseFloat(summary.tax.toFixed(2));
        
        // Use the new value if it's tip, otherwise use existing
        const tipToUse = field === 'tip' ? newValue : parseFloat((summary.tip || 0).toFixed(2));
        
        updatedSummary.subtotal = subtotalToUse;
        updatedSummary.total = parseFloat((subtotalToUse + taxToUse + tipToUse).toFixed(2));
        
        setSummary(updatedSummary);
        
        // Remove discrepancy checking - we don't want to show the alert when user manually edits
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
        try {
            // Create a temporary container for the complete results
            const tempContainer = document.createElement('div');
            tempContainer.style.background = 'white';
            tempContainer.style.padding = '24px';
            tempContainer.style.borderRadius = '20px';
            tempContainer.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            tempContainer.style.width = '100%';
            tempContainer.style.maxWidth = '600px';
            tempContainer.style.margin = '0 auto';
            
            // Add store total section
            const storeTotalSection = document.createElement('div');
            storeTotalSection.style.textAlign = 'center';
            storeTotalSection.style.padding = '16px 0';
            
            const storeName = document.createElement('div');
            storeName.textContent = storeTitle || "Unknown Store";
            storeName.style.color = '#0B3358';
            storeName.style.fontSize = '24px';
            storeName.style.fontWeight = '600';
            storeName.style.marginBottom = '8px';
            
            const totalAmount = document.createElement('div');
            totalAmount.textContent = `$ ${summary.total.toFixed(2)}`;
            totalAmount.style.color = '#0B3358';
            totalAmount.style.fontSize = '48px';
            totalAmount.style.fontWeight = '600';
            
            storeTotalSection.appendChild(storeName);
            storeTotalSection.appendChild(totalAmount);
            tempContainer.appendChild(storeTotalSection);
            
            // Add members breakdown section
            const membersSection = document.createElement('div');
            membersSection.style.marginTop = '24px';
            
            members.forEach((member, index) => {
                const memberSection = document.createElement('div');
                memberSection.style.marginBottom = '32px';
                memberSection.style.padding = '16px';
                memberSection.style.background = 'rgba(27, 78, 124, 0.05)';
                memberSection.style.borderRadius = '12px';

                // Member name header
                const memberName = document.createElement('div');
                memberName.textContent = member;
                memberName.style.color = '#1B4E7C';
                memberName.style.fontSize = '20px';
                memberName.style.fontWeight = '600';
                memberName.style.marginBottom = '16px';
                memberName.style.textAlign = 'center';
                memberSection.appendChild(memberName);

                // Items list
                const assignedItems = getAssignedItems(member);
                if (assignedItems.length > 0) {
                    assignedItems.forEach(item => {
                        const originalIndex = billData.items.findIndex(i => i.name === item.name && i.price === item.price);
                        const numSharing = assignments[originalIndex]?.length || 1;
                        const itemDiv = document.createElement('div');
                        itemDiv.style.display = 'flex';
                        itemDiv.style.justifyContent = 'space-between';
                        itemDiv.style.padding = '8px 12px';
                        itemDiv.style.marginBottom = '8px';
                        itemDiv.style.background = 'rgba(255, 255, 255, 0.5)';
                        itemDiv.style.borderRadius = '6px';

                        const itemName = document.createElement('span');
                        itemName.textContent = item.name;
                        itemName.style.color = '#1B4E7C';
                        itemName.style.flex = '1';

                        const itemPrice = document.createElement('span');
                        itemPrice.textContent = `$ ${(item.price / numSharing).toFixed(2)}`;
                        itemPrice.style.color = '#1B4E7C';
                        itemPrice.style.fontWeight = '500';

                        itemDiv.appendChild(itemName);
                        itemDiv.appendChild(itemPrice);
                        memberSection.appendChild(itemDiv);
                    });
                }

                // Add tax share if applicable
                if (summary.tax > 0) {
                    const taxShare = document.createElement('div');
                    taxShare.style.display = 'flex';
                    taxShare.style.justifyContent = 'space-between';
                    taxShare.style.padding = '8px 12px';
                    taxShare.style.marginBottom = '8px';
                    taxShare.style.background = 'rgba(27, 78, 124, 0.03)';
                    taxShare.style.borderRadius = '6px';
                    taxShare.style.marginTop = '12px';

                    const taxLabel = document.createElement('span');
                    taxLabel.textContent = 'Tax Share';
                    taxLabel.style.color = '#1B4E7C';

                    const taxAmount = document.createElement('span');
                    const taxValue = calculateTaxShare(member);
                    taxAmount.textContent = `$ ${taxValue}`;
                    taxAmount.style.color = '#1B4E7C';
                    taxAmount.style.fontWeight = '500';

                    taxShare.appendChild(taxLabel);
                    taxShare.appendChild(taxAmount);
                    memberSection.appendChild(taxShare);
                }

                // Add tip share if applicable
                if (summary.tip > 0) {
                    const tipShare = document.createElement('div');
                    tipShare.style.display = 'flex';
                    tipShare.style.justifyContent = 'space-between';
                    tipShare.style.padding = '8px 12px';
                    tipShare.style.marginBottom = '8px';
                    tipShare.style.background = 'rgba(27, 78, 124, 0.03)';
                    tipShare.style.borderRadius = '6px';

                    const tipLabel = document.createElement('span');
                    tipLabel.textContent = 'Tip/Others Share';
                    tipLabel.style.color = '#1B4E7C';

                    const tipAmount = document.createElement('span');
                    tipAmount.textContent = `$ ${(summary.tip / members.length).toFixed(2)}`;
                    tipAmount.style.color = '#1B4E7C';
                    tipAmount.style.fontWeight = '500';

                    tipShare.appendChild(tipLabel);
                    tipShare.appendChild(tipAmount);
                    memberSection.appendChild(tipShare);
                }

                // Add total
                const totalDiv = document.createElement('div');
                totalDiv.style.display = 'flex';
                totalDiv.style.justifyContent = 'space-between';
                totalDiv.style.padding = '12px';
                totalDiv.style.marginTop = '12px';
                totalDiv.style.background = 'rgba(27, 78, 124, 0.08)';
                totalDiv.style.borderRadius = '6px';
                totalDiv.style.borderTop = '1px solid rgba(27, 78, 124, 0.2)';

                const totalLabel = document.createElement('span');
                totalLabel.textContent = 'Total Share';
                totalLabel.style.color = '#1B4E7C';
                totalLabel.style.fontWeight = '600';

                const totalValue = document.createElement('span');
                totalValue.textContent = `$ ${totals[member]?.toFixed(2)}`;
                totalValue.style.color = '#1B4E7C';
                totalValue.style.fontWeight = '700';
                totalValue.style.fontSize = '1.1rem';

                totalDiv.appendChild(totalLabel);
                totalDiv.appendChild(totalValue);
                memberSection.appendChild(totalDiv);

                membersSection.appendChild(memberSection);
            });
            
            tempContainer.appendChild(membersSection);
            
            // Add the container to the document temporarily
            document.body.appendChild(tempContainer);
            
            // Capture the image
            const canvas = await html2canvas(tempContainer, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: true,
                width: tempContainer.offsetWidth,
                height: tempContainer.offsetHeight
            });
            
            // Remove the temporary container
            document.body.removeChild(tempContainer);
            
            // Create and trigger download
            const link = document.createElement('a');
            link.download = 'split-results.png';
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error('Error generating image:', error);
            alert('Failed to generate image. Please try again.');
        }
    };

    // Add handler for removing file
    const handleRemoveFile = () => {
        if (file) {
            URL.revokeObjectURL(URL.createObjectURL(file));
        }
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

    const handleFeedbackSubmit = async () => {
        setIsSendingFeedback(true);
        setFeedbackError('');

        try {
            const templateParams = {
                feedback: feedbackText,
                store: storeTitle || 'Unknown Store',
                total_amount: summary.total.toFixed(2),
            };

            await emailjs.send(
                'service_tyt4mqt',
                'template_abtvz2t',
                templateParams,
                '3xkfQ5Fq93eFYn4rd'
            );

            setShowFeedbackForm(false);
            setFeedbackText('');
            setShowThankYou(true);
            setTimeout(() => {
                setShowThankYou(false);
            }, 3000); // Hide thank you message after 3 seconds
        } catch (error) {
            console.error('Error sending feedback:', error);
            setFeedbackError('Failed to send feedback. Please try again.');
        } finally {
            setIsSendingFeedback(false);
        }
    };

    // Update the shareResults function to properly direct users to the website
    const shareResults = async () => {
        try {
            // Show loading indicator or feedback
            const shareButton = document.querySelector('.share-social-button');
            const originalText = shareButton.textContent;
            shareButton.textContent = "Generating...";
            shareButton.disabled = true;
            
            // First generate the image - using the same detailed format as downloadResultsAsImage
            const tempContainer = document.createElement('div');
            tempContainer.style.background = 'white';
            tempContainer.style.padding = '24px';
            tempContainer.style.borderRadius = '20px';
            tempContainer.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            tempContainer.style.width = '100%';
            tempContainer.style.maxWidth = '600px';
            tempContainer.style.margin = '0 auto';
            
            // Add store total section
            const storeTotalSection = document.createElement('div');
            storeTotalSection.style.textAlign = 'center';
            storeTotalSection.style.padding = '16px 0';
            
            const storeName = document.createElement('div');
            storeName.textContent = storeTitle || "Unknown Store";
            storeName.style.color = '#0B3358';
            storeName.style.fontSize = '24px';
            storeName.style.fontWeight = '600';
            storeName.style.marginBottom = '8px';
            
            const totalAmount = document.createElement('div');
            totalAmount.textContent = `$ ${summary.total.toFixed(2)}`;
            totalAmount.style.color = '#0B3358';
            totalAmount.style.fontSize = '48px';
            totalAmount.style.fontWeight = '600';
            
            // Add website branding
            const appBranding = document.createElement('div');
            appBranding.textContent = "Split with VAAATA";
            appBranding.style.color = '#1B4E7C';
            appBranding.style.fontSize = '16px';
            appBranding.style.fontWeight = '500';
            appBranding.style.marginTop = '8px';
            appBranding.style.opacity = '0.8';
            
            const websiteUrl = document.createElement('div');
            websiteUrl.textContent = "www.vaaata.com";
            websiteUrl.style.color = '#1B4E7C';
            websiteUrl.style.fontSize = '14px';
            websiteUrl.style.marginTop = '4px';
            websiteUrl.style.opacity = '0.8';
            
            storeTotalSection.appendChild(storeName);
            storeTotalSection.appendChild(totalAmount);
            storeTotalSection.appendChild(appBranding);
            storeTotalSection.appendChild(websiteUrl);
            tempContainer.appendChild(storeTotalSection);
            
            // Add members breakdown section with detailed information
            const membersSection = document.createElement('div');
            membersSection.style.marginTop = '24px';
            
            members.forEach((member, index) => {
                const memberSection = document.createElement('div');
                memberSection.style.marginBottom = '32px';
                memberSection.style.padding = '16px';
                memberSection.style.background = 'rgba(27, 78, 124, 0.05)';
                memberSection.style.borderRadius = '12px';

                // Member name header
                const memberName = document.createElement('div');
                memberName.textContent = member;
                memberName.style.color = '#1B4E7C';
                memberName.style.fontSize = '20px';
                memberName.style.fontWeight = '600';
                memberName.style.marginBottom = '16px';
                memberName.style.textAlign = 'center';
                memberSection.appendChild(memberName);

                // Items list
                const assignedItems = getAssignedItems(member);
                if (assignedItems.length > 0) {
                    assignedItems.forEach(item => {
                        const originalIndex = billData.items.findIndex(i => i.name === item.name && i.price === item.price);
                        const numSharing = assignments[originalIndex]?.length || 1;
                        const itemDiv = document.createElement('div');
                        itemDiv.style.display = 'flex';
                        itemDiv.style.justifyContent = 'space-between';
                        itemDiv.style.padding = '8px 12px';
                        itemDiv.style.marginBottom = '8px';
                        itemDiv.style.background = 'rgba(255, 255, 255, 0.5)';
                        itemDiv.style.borderRadius = '6px';

                        const itemName = document.createElement('span');
                        itemName.textContent = item.name;
                        itemName.style.color = '#1B4E7C';
                        itemName.style.flex = '1';

                        const itemPrice = document.createElement('span');
                        itemPrice.textContent = `$ ${(item.price / numSharing).toFixed(2)}`;
                        itemPrice.style.color = '#1B4E7C';
                        itemPrice.style.fontWeight = '500';

                        itemDiv.appendChild(itemName);
                        itemDiv.appendChild(itemPrice);
                        memberSection.appendChild(itemDiv);
                    });
                }

                // Add tax share if applicable
                if (summary.tax > 0) {
                    const taxShare = document.createElement('div');
                    taxShare.style.display = 'flex';
                    taxShare.style.justifyContent = 'space-between';
                    taxShare.style.padding = '8px 12px';
                    taxShare.style.marginBottom = '8px';
                    taxShare.style.background = 'rgba(27, 78, 124, 0.03)';
                    taxShare.style.borderRadius = '6px';
                    taxShare.style.marginTop = '12px';

                    const taxLabel = document.createElement('span');
                    taxLabel.textContent = 'Tax Share';
                    taxLabel.style.color = '#1B4E7C';

                    const taxAmount = document.createElement('span');
                    const taxValue = calculateTaxShare(member);
                    taxAmount.textContent = `$ ${taxValue}`;
                    taxAmount.style.color = '#1B4E7C';
                    taxAmount.style.fontWeight = '500';

                    taxShare.appendChild(taxLabel);
                    taxShare.appendChild(taxAmount);
                    memberSection.appendChild(taxShare);
                }

                // Add tip share if applicable
                if (summary.tip > 0) {
                    const tipShare = document.createElement('div');
                    tipShare.style.display = 'flex';
                    tipShare.style.justifyContent = 'space-between';
                    tipShare.style.padding = '8px 12px';
                    tipShare.style.marginBottom = '8px';
                    tipShare.style.background = 'rgba(27, 78, 124, 0.03)';
                    tipShare.style.borderRadius = '6px';

                    const tipLabel = document.createElement('span');
                    tipLabel.textContent = 'Tip/Others Share';
                    tipLabel.style.color = '#1B4E7C';

                    const tipAmount = document.createElement('span');
                    tipAmount.textContent = `$ ${(summary.tip / members.length).toFixed(2)}`;
                    tipAmount.style.color = '#1B4E7C';
                    tipAmount.style.fontWeight = '500';

                    tipShare.appendChild(tipLabel);
                    tipShare.appendChild(tipAmount);
                    memberSection.appendChild(tipShare);
                }

                // Add total
                const totalDiv = document.createElement('div');
                totalDiv.style.display = 'flex';
                totalDiv.style.justifyContent = 'space-between';
                totalDiv.style.padding = '12px';
                totalDiv.style.marginTop = '12px';
                totalDiv.style.background = 'rgba(27, 78, 124, 0.08)';
                totalDiv.style.borderRadius = '6px';
                totalDiv.style.borderTop = '1px solid rgba(27, 78, 124, 0.2)';

                const totalLabel = document.createElement('span');
                totalLabel.textContent = 'Total Share';
                totalLabel.style.color = '#1B4E7C';
                totalLabel.style.fontWeight = '600';

                const totalValue = document.createElement('span');
                totalValue.textContent = `$ ${totals[member]?.toFixed(2)}`;
                totalValue.style.color = '#1B4E7C';
                totalValue.style.fontWeight = '700';
                totalValue.style.fontSize = '1.1rem';

                totalDiv.appendChild(totalLabel);
                totalDiv.appendChild(totalValue);
                memberSection.appendChild(totalDiv);

                membersSection.appendChild(memberSection);
            });
            
            tempContainer.appendChild(membersSection);
            
            // Add the container to the document temporarily
            document.body.appendChild(tempContainer);
            
            // Capture the image
            const canvas = await html2canvas(tempContainer, {
                backgroundColor: '#ffffff',
                scale: 2,
                logging: false,
                useCORS: true,
                width: tempContainer.offsetWidth,
                height: tempContainer.offsetHeight
            });
            
            // Remove the temporary container
            document.body.removeChild(tempContainer);
            
            // Reset button state
            shareButton.textContent = originalText;
            shareButton.disabled = false;
            
            // Convert the canvas to a blob
            const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.9));
            
            // Create a data URL for sharing as fallback
            const imageUrl = canvas.toDataURL('image/png', 0.9);
            
            // Prepare sharing text
            const shareTitle = `${storeTitle || 'Restaurant'} Bill Split`;
            const shareText = `Check out how we split our bill at ${storeTitle || 'the restaurant'} using VAAATA! Visit www.vaaata.com to split your bills effortlessly.`;
            
            // Create a file for sharing
            const imageFile = new File([imageBlob], 'vaaata-bill-split.png', { type: 'image/png' });
            
            // Check if Web Share API is supported with files
            if (navigator.share) {
                try {
                    if (navigator.canShare && navigator.canShare({ files: [imageFile] })) {
                        // Preferred: Share with both text and image
                        await navigator.share({
                            title: shareTitle,
                            text: shareText,
                            url: 'https://www.vaaata.com',
                            files: [imageFile]
                        });
                        return; // Success
                    } else {
                        // Fallback to just text and URL if file sharing not supported
                        await navigator.share({
                            title: shareTitle,
                            text: shareText,
                            url: 'https://www.vaaata.com'
                        });
                        return; // Success
                    }
                } catch (error) {
                    console.log('Sharing failed', error);
                    // Continue to fallback
                }
            }
            
            // Fallback for browsers that don't support Web Share API
            const link = document.createElement('a');
            link.download = 'vaaata-bill-split.png';
            link.href = imageUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            alert('Your split image has been downloaded! To share on social media, upload this image and add: "' + shareText + '"');
            
        } catch (error) {
            console.error('Error sharing results:', error);
            alert('Failed to share results. Please try again or use the Download button instead.');
            
            // Reset button if there was an error
            const shareButton = document.querySelector('.share-social-button');
            if (shareButton && shareButton.disabled) {
                shareButton.textContent = "Share";
                shareButton.disabled = false;
            }
        }
    };

    const calculateTaxShare = (member) => {
        // Calculate the sum of item prices assigned to this member
        const itemsTotal = getAssignedItems(member).reduce((sum, item) => {
            const originalIndex = billData.items.findIndex(i => i.name === item.name && i.price === item.price);
            const numSharing = assignments[originalIndex]?.length || 1;
            return sum + (item.price / numSharing);
        }, 0);
        
        // Calculate tax share (ensure it's never negative)
        const taxShare = Math.max(0, totals[member] - itemsTotal);
        return taxShare.toFixed(2);
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
                                    onChange={(e) => {
                                        setMemberName(e.target.value);
                                        setShowMemberAlert(false);
                                    }}
                                    placeholder="Add members"
                                    className="member-input"
                                />
                                <div className="member-icon"></div>
                            </div>
                            {showMemberAlert && (
                                <div className="member-alert">Add a member to proceed</div>
                            )}
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
                                <>
                                    <button 
                                        onClick={handleScan} 
                                        disabled={loading} 
                                        className="scan-button mt-3"
                                    >
                                        <span className="scan-icon"></span>
                                        {loading ? "Scanning..." : "Scan"}
                                    </button>
                                    <div className="image-preview">
                                        <img 
                                            src={URL.createObjectURL(file)} 
                                            alt="Bill preview" 
                                            onClick={() => setShowImageOverlay(true)}
                                            style={{
                                                width: '100%',
                                                maxHeight: '300px',
                                                objectFit: 'contain',
                                                borderRadius: '8px',
                                                marginTop: '12px',
                                                cursor: 'pointer'
                                            }}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        
                        {error && <div className="error-message">{error}</div>}
                        
                        {/* Add Image Overlay */}
                        {showImageOverlay && (
                            <div 
                                className="image-overlay"
                                onClick={() => setShowImageOverlay(false)}
                                style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    zIndex: 1000,
                                    padding: '20px'
                                }}
                            >
                                <div 
                                    className="overlay-content"
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                        position: 'relative',
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center'
                                    }}
                                >
                                    <button
                                        onClick={() => setShowImageOverlay(false)}
                                        style={{
                                            position: 'absolute',
                                            top: '-40px',
                                            right: 0,
                                            background: 'none',
                                            border: 'none',
                                            color: 'white',
                                            fontSize: '24px',
                                            cursor: 'pointer',
                                            padding: '8px',
                                            zIndex: 1001
                                        }}
                                    >
                                        ×
                                    </button>
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt="Bill full view"
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '90vh',
                                            objectFit: 'contain'
                                        }}
                                    />
                                </div>
                            </div>
                        )}
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
                                                onFocus={handleInputFocus}
                                                onBlur={handleInputBlur}
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
                                            onFocus={handleInputFocus}
                                            onBlur={handleInputBlur}
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
                                    className="summary-input"
                                    readOnly
                                />
                            </div>
                            <div className="summary-field">
                                <label>Tax:</label>
                                <input
                                    type="number"
                                    value={summary.tax}
                                    onChange={(e) => handleSummaryChange("tax", e.target.value)}
                                    onFocus={handleInputFocus}
                                    onBlur={handleInputBlur}
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
                                    onFocus={handleInputFocus}
                                    onBlur={handleInputBlur}
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
                                    onClick={() => {
                                        setCurrentMemberIndex(prev => prev + 1);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }} 
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
                        <div className="summary-view" id="split-results">
                            <div className="store-total">
                                <div className="store-name">{storeTitle || "Unknown Store"}</div>
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
                                {/* Items section */}
                                <div className="items-section">
                                    {getAssignedItems(selectedMember).map((item, itemIndex) => {
                                        const originalIndex = billData.items.findIndex(i => i.name === item.name && i.price === item.price);
                                        const numSharing = assignments[originalIndex]?.length || 1;
                                        return (
                                            <div key={itemIndex} className="assigned-item">
                                                <span className="item-name">{item.name}</span>
                                                <span className="item-price">${(item.price / numSharing).toFixed(2)}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Additional charges section - completely rewritten */}
                                <div className="additional-charges">
                                    <div className="assigned-item tax-item">
                                        <span className="item-name">Tax Share</span>
                                        <span className="item-price">${calculateTaxShare(selectedMember)}</span>
                                    </div>
                                    
                                    {summary.tip > 0 && (
                                        <div className="assigned-item tip-item">
                                            <span className="item-name">Tip/Others Share</span>
                                            <span className="item-price">${(summary.tip / members.length).toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Total section */}
                                <div className="member-total-section">
                                    <div className="assigned-item total-item">
                                        <span className="item-name">Total Share</span>
                                        <span className="item-price total-price">${totals[selectedMember]?.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Share Options */}
                        <div className="share-options">
                            <button onClick={downloadResultsAsImage} className="share-button download-button">
                                Download Image
                            </button>
                            <button onClick={shareResults} className="share-button share-social-button">
                                Share Results
                            </button>
                        </div>

                        {/* Feedback Section */}
                        <div className="feedback-section">
                            {showThankYou ? (
                                <div className="thank-you-message">
                                    <div className="thank-you-icon">✓</div>
                                    <p className="thank-you-text">Thank you for your feedback!</p>
                                    <p className="thank-you-subtext">We appreciate your help in making VAAATA better.</p>
                                </div>
                            ) : (
                                <>
                                    <p className="feedback-text">Help us improve VAAATA</p>
                                    {!showFeedbackForm ? (
                                        <button 
                                            onClick={() => setShowFeedbackForm(true)}
                                            className="feedback-button"
                                        >
                                            Share Your Experience
                                        </button>
                                    ) : (
                                        <div className="feedback-form">
                                            <textarea
                                                value={feedbackText}
                                                onChange={(e) => setFeedbackText(e.target.value)}
                                                placeholder="Tell us what you think about VAAATA..."
                                                className="feedback-textarea"
                                                rows="4"
                                            />
                                            {feedbackError && <p className="feedback-error">{feedbackError}</p>}
                                            <div className="feedback-actions">
                                                <button 
                                                    onClick={handleFeedbackSubmit}
                                                    className="feedback-submit"
                                                    disabled={!feedbackText.trim() || isSendingFeedback}
                                                >
                                                    {isSendingFeedback ? 'Sending...' : 'Send Feedback'}
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setShowFeedbackForm(false);
                                                        setFeedbackText('');
                                                        setFeedbackError('');
                                                    }}
                                                    className="feedback-cancel"
                                                    disabled={isSendingFeedback}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
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
                <h1 className="mobile-title">VAAATA</h1>
            </div>
            {renderStep()}
            {showErrorUI && (
                <div className="error-overlay" onClick={() => setShowErrorUI(false)}>
                    <div className="error-container" onClick={(e) => e.stopPropagation()}>
                        <div className="error-icon">⚠️</div>
                        <h3 className="error-title">Oops! Something went wrong</h3>
                        <p className="error-message">
                            {retryAttempts < 3 
                                ? "We couldn't process your bill. Let's try again!"
                                : "We're experiencing some technical difficulties. Our team has been notified and we'll fix this soon. Please try again later."}
                        </p>
                        {retryAttempts < 3 && (
                            <button onClick={handleRetry} className="retry-button">
                                Try Again
                            </button>
                        )}
                    </div>
                </div>
            )}
            {showDiscrepancyAlert && (
                <div className="error-overlay" onClick={() => setShowDiscrepancyAlert(false)}>
                    <div className="error-container" onClick={(e) => e.stopPropagation()}>
                        <div className="error-icon">⚠️</div>
                        <h3 className="error-title">Bill Total Discrepancy</h3>
                        <p className="error-message">
                            There appears to be a difference between the calculated total and the total in the scanned bill.
                        </p>
                        <p className="error-message">
                            This may be due to missed items or price errors. Please review the items and update if needed.
                        </p>
                        <div className="discrepancy-details">
                            <p>Calculated Total: ${summary.total.toFixed(2)}</p>
                            {apiResponseSummary && (
                                <p>Scanned Total: ${apiResponseSummary.total.toFixed(2)}</p>
                            )}
                        </div>
                        <button onClick={() => setShowDiscrepancyAlert(false)} className="retry-button">
                            OK, I'll Review
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillUploaderMobile; 