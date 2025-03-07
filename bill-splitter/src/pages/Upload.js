import React, { useState, useEffect } from "react";
import axios from 'axios';
import addMemberIcon from '../assets/images/ui-elements/add-member.svg';  // Add this import
import uploadBillIcon from '../assets/images/ui-elements/document-upload.svg';  // Add this import
import closeIcon from '../assets/images/ui-elements/Cross.svg';  // Add this import
import scanIcon from '../assets/images/ui-elements/scan.svg';  // Add this import
import attachmentIcon from '../assets/images/ui-elements/attachment.svg';  // Add this import
const Upload = () => {
    
    const [members, setMembers] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    const handleAddMember = () => {
        if (inputValue.trim()) {
            setMembers([...members, inputValue]);
            setInputValue('');
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Check file type
            if (!file.type.match('image.*')) {
                alert('Please upload an image file');
                return;
            }
            // Check file size (e.g., 5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                alert('File size should be less than 5MB');
                return;
            }
            setSelectedFile(file);
            // Here you would typically upload the file to your server
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
    };

    return (
        <div 
            className="min-h-screen w-full max-w-md mx-auto px-4 py-8 flex flex-col justify-between"
            style={{ background: 'linear-gradient(180deg, #CEE2D4 0%, #F4FFF7 100%)' }}
        >

            <h1 className="text-2xl font-bold text-[#1B4E7C]">Split your bill exactly!!</h1>

            <div className="flex flex-col gap-2 px-4">
                <label htmlFor="add-member" className="cursor-pointer self-start text-[16px] text-[#1B4E7C] font-semibold">
                    Add Members
                </label>
                <div className="relative flex gap-5">
                    <input 
                        type="text" 
                        id="add-member" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Enter Member Name"
                        className="rounded-[30px] p-2 pl-12 focus:outline-none w-full placeholder:text-[#718BAE] placeholder:text-sm" 
                        style={{
                            border: '1px solid rgba(27, 78, 124, 0.10)',
                            background: 'rgba(255, 255, 255, 0.59)'
                        }}
                    />
                    <img src={addMemberIcon} alt="add-member" className="absolute left-5 top-1/2 -translate-y-1/2" />

                    <button className="bg-[#1B4E7C] text-white rounded-[30px] py-2 px-4 text-[#CEE2D4] text-[16px]" onClick={handleAddMember}>Add</button>
                </div>

                <div className="flex flex-wrap gap-2 mt-[1.5vh]">
                    {members.map((member, index) => (
                        <div 
                            key={index}
                            className="bg-[#D6F0F5] rounded-[20px] flex items-center gap-2 justify-center"
                            style={{border: '1px solid rgba(27, 78, 124, 0.20)', padding: '4px 8px'}}
                        >
                            <p className="text-[#1B4E7C] text-sm">{member}</p>
                            <img 
                                src={closeIcon} 
                                alt="close" 
                                className="w-4 h-4 cursor-pointer" 
                                onClick={() => setMembers(members.filter((_, i) => i !== index))}
                            />
                        </div>
                    ))}
                </div>
            </div>

            

            <div className="flex flex-col items-center justify-center gap-2">
                <input
                    type="file"
                    id="bill-upload"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileUpload}
                />
                
                {selectedFile && (
                    <div 
                        className="flex items-center gap-2 bg-[#F5F5F5] rounded-[16px] mb-2 h-[32px] pl-3"
                    >
                        <img src={attachmentIcon} alt="attachment" className="w-4 h-4" />
                        <p className="text-[#363636] text-xs">{selectedFile.name}</p>
                        <div className="bg-[#FEE6E6] h-[32px] px-2 rounded-r-full ml-auto flex items-center justify-center">
                            <img 
                                src={closeIcon} 
                                alt="remove" 
                                className="w-4 h-4 cursor-pointer" 
                                onClick={handleRemoveFile}
                                style={{
                                    filter: 'invert(45%) sepia(83%) saturate(1583%) hue-rotate(322deg) brightness(97%) contrast(95%)'
                                }}
                            />
                        </div>
                    </div>
                )}

                <label 
                    htmlFor="bill-upload" 
                    className="bg-[#1B4E7C] text-white rounded-[30px] p-2 w-[210px] text-[#CEE2D4] text-[16px] flex items-center justify-center gap-2 cursor-pointer"
                >
                    <img 
                        src={selectedFile ? scanIcon : uploadBillIcon} 
                        alt={selectedFile ? "scan-bill" : "upload-bill"} 
                        className="w-6 h-6" 
                    />
                    {selectedFile ? 'Scan' : 'Upload Bill'}
                </label>
                <p className="text-[#718BAE] text-sm">Supported format: .png, .jpg, .jpeg</p>
                
            </div>
        </div>
    )
}

export default Upload;
