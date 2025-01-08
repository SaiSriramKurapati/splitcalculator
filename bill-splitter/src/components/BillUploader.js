import React, { useState, useEffect } from "react";
import axios from 'axios';

const BillUploader = () => {
    const [file, setFile] = useState(null);
    const [billData, setBillData] = useState(null);
    const [error, setError] = useState(null);
    const [members, setMembers] = useState([]);
    const [memberName, setMemberName] = useState("");
    const [assignments, setAssignments] = useState({});
    const [totals, setTotals] = useState({});
    const [summary, setSummary] = useState({ subtotal: 0, tax: 0, total: 0 });

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

        try {
            const response = await axios.post(
                'http://localhost:5001/api/bills/upload',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            setBillData(response.data);
            setAssignments({});
            setError(null);
        } catch (error) {
            console.error("Error uploading the bill:", error);
            setError("Failed to upload the bill. Please try again.");
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
            updated[itemIndex] = [...members];
            return updated;
        });
    };

    const calculateSplit = () => {
    const totals = {};
    let subTotal = 0;

    billData.items.forEach((item, index) => {
        const assignedMembers = assignments[index] || [];
        const splitPrice = item.price / (assignedMembers.length || 1);
        subTotal += item.price;

        assignedMembers.forEach(member => {
            totals[member] = (totals[member] || 0) + splitPrice;
        });

        if (assignedMembers.length === 0) {
            // If no one assigned, split among all members equally
            members.forEach(member => {
                totals[member] = (totals[member] || 0) + (item.price / members.length);
            });
        }
    });

    const taxAmount = billData.tax;
    let grandTotal = 0;

    members.forEach(member => {
        const memberShare = (totals[member] || 0) / subTotal;
        const taxSplit = memberShare * taxAmount;
        totals[member] = (totals[member] || 0) + taxSplit;
        grandTotal += totals[member];
    });

    const overallTotal = subTotal + taxAmount;

    setTotals(totals);
    setSummary({
        subtotal: subTotal,
        tax: taxAmount,
        total: overallTotal
    });
  };

    const handlePriceChange = (index, newPrice) => {
      const updatedBillData = { ...billData };
      updatedBillData.items[index].price = parseFloat(newPrice) || 0;
      
      // Recalculate subtotal and total in real-time
      const subTotal = updatedBillData.items.reduce((acc, item) => acc + item.price, 0);
      const overallTotal = subTotal + updatedBillData.tax;

      setBillData(updatedBillData);
      setSummary({
          subtotal: subTotal,
          tax: updatedBillData.tax,
          total: overallTotal
      });
    };



    return (
        <div className="flex flex-col items-center justify-center space-y-5 mt-[5vh] mb-20">

            <h1 className="text-2xl font-bold">Bill Scanner</h1>
            
            <div className="flex items-center gap-10">
              <label className="text-[20px] font-medium">Upload an Image</label>
              <input 
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              
            </div>
            
            <button 
              onClick={handleScan} 
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">
                Scan
            </button>

            {error && (
                <div className="text-red-500 mt-4">
                    {error}
                </div>
            )}

            <div className="mt-8 w-3/4">
                <h2 className="text-xl font-semibold mb-4">Add Members</h2>
                <div className="flex items-center space-x-4">
                    <input
                        type="text"
                        placeholder="Enter member name"
                        value={memberName}
                        onChange={(e) => setMemberName(e.target.value)}
                        className="border p-2 rounded w-full"
                    />
                    <button
                        onClick={handleAddMember}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                        Add Member
                    </button>
                </div>
            </div>

            {billData && (
                <div className="mt-8 w-3/4">
                    <h2 className="text-xl font-semibold">Assign Items to Members</h2>
                    <table className="w-full mt-4 border-collapse border border-gray-300">
                        <thead>
                            <tr>
                                <th className="border border-gray-300 px-4 py-2">Item Name</th>
                                <th className="border border-gray-300 px-4 py-2">Price</th>
                                <th className="border border-gray-300 px-4 py-2">Assign to</th>
                            </tr>
                        </thead>
                        <tbody>
                              {billData.items.map((item, index) => (
                                  <tr key={index}>
                                      <td className="border border-gray-300 px-4 py-2">{item.name}</td>
                                      <td className="border border-gray-300 px-4 py-2">
                                          <input
                                              type="number"
                                              value={item.price}
                                              min="0"
                                              step="0.01"
                                              onChange={(e) => handlePriceChange(index, e.target.value)}
                                              className="w-full p-1 border rounded"
                                          />
                                      </td>
                                      <td>
                                          {members.map((member) => (
                                              <button 
                                                  key={member}
                                                  onClick={() => handleItemAssign(index, member)}
                                                  className={`px-4 py-2 m-1 rounded ${
                                                      assignments[index]?.includes(member) ? 'bg-blue-500' : 'bg-gray-300'
                                                  }`}>
                                                  {member}
                                              </button>
                                          ))}
                                          <button 
                                              onClick={() => handleAssignAll(index)}
                                              className="bg-yellow-400 px-4 py-2 m-1 rounded">
                                              All
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td className="border border-gray-300 px-4 py-2 font-bold">Subtotal</td>
                                <td className="border border-gray-300 px-4 py-2">${summary.subtotal.toFixed(2)}</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 px-4 py-2 font-bold">Tax</td>
                                <td className="border border-gray-300 px-4 py-2">${summary.tax.toFixed(2)}</td>
                                <td></td>
                            </tr>
                            <tr>
                                <td className="border border-gray-300 px-4 py-2 font-bold">Total</td>
                                <td className="border border-gray-300 px-4 py-2">${summary.total.toFixed(2)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                    <button
                        onClick={calculateSplit}
                        className="mt-6 bg-green-500 text-white px-6 py-3 rounded hover:bg-green-600">
                        Calculate Split
                    </button>

                    {Object.keys(totals).length > 0 && (
                        <div className="mt-8 w-3/4">
                            <h2 className="text-xl font-semibold">Total Breakdown</h2>
                            <table className="w-full mt-4 border-collapse border border-gray-300">
                                <thead>
                                    <tr>
                                        <th className="border border-gray-300 px-4 py-2">Member</th>
                                        <th className="border border-gray-300 px-4 py-2">Total Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(totals).map(([member, total]) => (
                                        <tr key={member}>
                                            <td className="border border-gray-300 px-4 py-2">{member}</td>
                                            <td className="border border-gray-300 px-4 py-2">${total.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td className="border border-gray-300 px-4 py-2 font-bold">Sum of Members' Totals</td>
                                        <td className="border border-gray-300 px-4 py-2">
                                            ${Object.values(totals).reduce((acc, value) => acc + value, 0).toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}


                </div>
            )}
        </div>
    )
}

export default BillUploader;
