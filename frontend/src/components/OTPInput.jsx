import React, { useState, useRef } from "react";

const OTPInput = ({ length = 4, onComplete }) => {
	const [otp, setOtp] = useState(new Array(length).fill(""));
	const otpBoxReference = useRef([]);

	const handleTextChange = (index, value) => {
		const newOtp = [...otp];
		newOtp[index] = value;
		setOtp(newOtp);

		if (value.length === 1) {
			otpBoxReference.current[index + 1].focus();
		}

		if (index === length - 1 && value.length === 1) {
			onComplete(otp.join(""));
		}
	};

	return (
		<div className='grid grid-cols-4 gap-5'>
			{Array.from({ length }, (_, index) => (
				<input
					key={index}
					type='text'
					maxLength={1}
					value={otp[index]}
					onChange={(e) => handleTextChange(index, e.target.value)}
					ref={(ref) => (otpBoxReference.current[index] = ref)}
					className='border border-solid border-border-slate-500 focus:border-blue-600 p-5'
				/>
			))}
		</div>
	);
};

export default OTPInput;
